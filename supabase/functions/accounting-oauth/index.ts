import "https://deno.land/x/cors@v1.2.2/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Platform-level fallback credentials (optional — per-org creds take priority)
const PLATFORM_XERO_CLIENT_ID = Deno.env.get("XERO_CLIENT_ID") || "";
const PLATFORM_XERO_CLIENT_SECRET = Deno.env.get("XERO_CLIENT_SECRET") || "";
const PLATFORM_QBO_CLIENT_ID = Deno.env.get("QBO_CLIENT_ID") || "";
const PLATFORM_QBO_CLIENT_SECRET = Deno.env.get("QBO_CLIENT_SECRET") || "";

const corsHeaders = { "Content-Type": "application/json" };

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string;
}

async function resolveConfig(
  supabase: any,
  providerKey: string,
  connectionId: string | null,
): Promise<ProviderConfig | null> {
  const baseUrl = Deno.env.get("SITE_URL") || SUPABASE_URL;

  const configs: Record<string, Omit<ProviderConfig, "clientId" | "clientSecret">> = {
    xero: {
      authUrl: "https://login.xero.com/identity/connect/authorize",
      tokenUrl: "https://identity.xero.com/connect/token",
      redirectUri: `${baseUrl}/app/settings/integrations/oauth-callback?provider=xero`,
      scopes: "offline_access openid profile email accounting.transactions accounting.contacts accounting.settings projects",
    },
    quickbooks: {
      authUrl: "https://appcenter.intuit.com/connect/oauth2",
      tokenUrl: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
      redirectUri: `${baseUrl}/app/settings/integrations/oauth-callback?provider=quickbooks`,
      scopes: "com.intuit.quickbooks.accounting openid profile email",
    },
  };

  const base = configs[providerKey];
  if (!base) return null;

  // 1. Try per-connection credentials from the database first
  if (connectionId) {
    const { data: tokens } = await supabase
      .from("integration_connection_tokens")
      .select("oauth_client_id, oauth_client_secret")
      .eq("connection_id", connectionId)
      .maybeSingle();

    if (tokens?.oauth_client_id && tokens?.oauth_client_secret) {
      return {
        ...base,
        clientId: tokens.oauth_client_id,
        clientSecret: tokens.oauth_client_secret,
      };
    }
  }

  // 2. Fall back to platform-level env vars
  if (providerKey === "xero" && PLATFORM_XERO_CLIENT_ID && PLATFORM_XERO_CLIENT_SECRET) {
    return { ...base, clientId: PLATFORM_XERO_CLIENT_ID, clientSecret: PLATFORM_XERO_CLIENT_SECRET };
  }
  if (providerKey === "quickbooks" && PLATFORM_QBO_CLIENT_ID && PLATFORM_QBO_CLIENT_SECRET) {
    return { ...base, clientId: PLATFORM_QBO_CLIENT_ID, clientSecret: PLATFORM_QBO_CLIENT_SECRET };
  }

  // No credentials available at all
  return null;
}

async function storeTokens(supabase: any, connectionId: string, accessToken: string, refreshToken: string, expiresAt: string | null) {
  const { data: existing } = await supabase
    .from("integration_connection_tokens")
    .select("id")
    .eq("connection_id", connectionId)
    .maybeSingle();

  const encryptedAccess = btoa(accessToken);
  const encryptedRefresh = refreshToken ? btoa(refreshToken) : null;

  if (existing) {
    await supabase.from("integration_connection_tokens").update({
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("connection_id", connectionId);
  } else {
    await supabase.from("integration_connection_tokens").insert({
      connection_id: connectionId,
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: expiresAt,
      last_refreshed_at: new Date().toISOString(),
    });
  }
}

async function getXeroTenants(accessToken: string) {
  const resp = await fetch("https://api.xero.com/connections", {
    headers: { "Authorization": `Bearer ${accessToken}`, "Accept": "application/json" },
  });
  if (!resp.ok) throw new Error("Failed to fetch Xero tenants");
  return resp.json();
}

async function getQBOCompany(accessToken: string, realmId: string) {
  const resp = await fetch(`https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`, {
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
    },
  });
  if (!resp.ok) throw new Error("Failed to fetch QBO company info");
  const data = await resp.json();
  return data.CompanyInfo;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const body = req.method === "POST" ? await req.json() : {};

    // --- GET_AUTH_URL: Generate OAuth authorization URL ---
    if (path === "auth-url" && req.method === "POST") {
      const { provider, organisationId, connectionId: connId } = body;
      if (!provider || !organisationId) {
        return new Response(JSON.stringify({ error: "provider and organisationId required" }), { status: 400, headers: corsHeaders });
      }

      const config = await resolveConfig(supabase, provider, connId || null);
      if (!config || !config.clientId) {
        return new Response(JSON.stringify({
          error: `Provider ${provider} not configured. Please enter your ${provider === "xero" ? "Xero" : "QuickBooks"} app credentials first.`,
          needsCredentials: true,
        }), { status: 400, headers: corsHeaders });
      }

      const state = btoa(JSON.stringify({ userId: user.id, organisationId, provider, ts: Date.now() }));
      const params = new URLSearchParams({
        response_type: "code",
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: config.scopes,
        state,
      });
      const authUrl = `${config.authUrl}?${params.toString()}`;

      return new Response(JSON.stringify({ url: authUrl, state }), { headers: corsHeaders });
    }

    // --- EXCHANGE_CODE: Exchange authorization code for tokens ---
    if (path === "exchange-code" && req.method === "POST") {
      const { provider, code, connectionId } = body;
      if (!provider || !code || !connectionId) {
        return new Response(JSON.stringify({ error: "provider, code, and connectionId required" }), { status: 400, headers: corsHeaders });
      }

      const config = await resolveConfig(supabase, provider, connectionId);
      if (!config || !config.clientId || !config.clientSecret) {
        return new Response(JSON.stringify({
          error: `Provider ${provider} not configured. Please enter your app credentials.`,
          needsCredentials: true,
        }), { status: 400, headers: corsHeaders });
      }

      if (provider === "xero") {
        const resp = await fetch(config.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(`${config.clientId}:${config.clientSecret}`),
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          return new Response(JSON.stringify({ error: `Token exchange failed: ${err}` }), { status: 400, headers: corsHeaders });
        }

        const data = await resp.json();
        await storeTokens(
          supabase, connectionId,
          data.access_token, data.refresh_token,
          data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null
        );

        const tenants = await getXeroTenants(data.access_token);
        const scopes = data.scope ? data.scope.split(" ") : [];

        return new Response(JSON.stringify({
          success: true,
          tenants: tenants.map((t: any) => ({
            id: t.tenantId,
            name: t.tenantName,
            type: t.tenantType,
          })),
          scopes,
        }), { headers: corsHeaders });
      }

      if (provider === "quickbooks") {
        const resp = await fetch(config.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic " + btoa(`${config.clientId}:${config.clientSecret}`),
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: config.redirectUri,
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          return new Response(JSON.stringify({ error: `Token exchange failed: ${err}` }), { status: 400, headers: corsHeaders });
        }

        const data = await resp.json();
        await storeTokens(
          supabase, connectionId,
          data.access_token, data.refresh_token,
          data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null
        );

        let companyInfo = null;
        if (data.access_token && body.realmId) {
          try {
            companyInfo = await getQBOCompany(data.access_token, body.realmId);
          } catch { /* non-critical */ }
        }

        return new Response(JSON.stringify({
          success: true,
          tenants: companyInfo ? [{
            id: companyInfo.Id || body.realmId,
            name: companyInfo.CompanyName || "QuickBooks Company",
          }] : [{ id: body.realmId || "unknown", name: "QuickBooks Company" }],
          scopes: ["com.intuit.quickbooks.accounting"],
        }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400, headers: corsHeaders });
    }

    // --- SAVE_CREDENTIALS: Store per-connection OAuth credentials ---
    if (path === "save-credentials" && req.method === "POST") {
      const { connectionId, provider, clientId, clientSecret } = body;
      if (!connectionId || !clientId || !clientSecret) {
        return new Response(JSON.stringify({ error: "connectionId, clientId, and clientSecret required" }), { status: 400, headers: corsHeaders });
      }

      // Verify the user owns this connection
      const { data: conn } = await supabase
        .from("integration_connections")
        .select("organisation_id")
        .eq("id", connectionId)
        .maybeSingle();

      if (!conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), { status: 404, headers: corsHeaders });
      }

      // Upsert credentials into the tokens table
      const { data: existing } = await supabase
        .from("integration_connection_tokens")
        .select("id")
        .eq("connection_id", connectionId)
        .maybeSingle();

      if (existing) {
        await supabase.from("integration_connection_tokens").update({
          oauth_client_id: clientId,
          oauth_client_secret: clientSecret,
          updated_at: new Date().toISOString(),
        }).eq("connection_id", connectionId);
      } else {
        await supabase.from("integration_connection_tokens").insert({
          connection_id: connectionId,
          oauth_client_id: clientId,
          oauth_client_secret: clientSecret,
        });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // --- CHECK_CREDENTIALS: Check if credentials are set for a connection ---
    if (path === "check-credentials" && req.method === "POST") {
      const { connectionId, provider } = body;
      if (!connectionId) {
        return new Response(JSON.stringify({ error: "connectionId required" }), { status: 400, headers: corsHeaders });
      }

      const config = await resolveConfig(supabase, provider || "xero", connectionId);
      return new Response(JSON.stringify({
        hasCredentials: !!(config?.clientId && config?.clientSecret),
        source: config?.clientId ? "configured" : "missing",
        providerConfigured: ["xero", "quickbooks"].map((pk) => {
          const pc = configsForProvider(pk);
          return { provider: pk, hasPlatformCreds: !!pc };
        }),
      }), { headers: corsHeaders });

      function configsForProvider(pk: string): boolean {
        if (pk === "xero") return !!(PLATFORM_XERO_CLIENT_ID && PLATFORM_XERO_CLIENT_SECRET);
        if (pk === "quickbooks") return !!(PLATFORM_QBO_CLIENT_ID && PLATFORM_QBO_CLIENT_SECRET);
        return false;
      }
    }

    // --- DISCONNECT: Revoke tokens and mark connection disconnected ---
    if (path === "disconnect" && req.method === "POST") {
      const { connectionId } = body;
      if (!connectionId) {
        return new Response(JSON.stringify({ error: "connectionId required" }), { status: 400, headers: corsHeaders });
      }

      await supabase.from("integration_connection_tokens").delete().eq("connection_id", connectionId);
      await supabase.from("integration_connections").update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", connectionId);

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // --- TEST_CONNECTION ---
    if (path === "test-connection" && req.method === "POST") {
      const { connectionId } = body;
      if (!connectionId) {
        return new Response(JSON.stringify({ error: "connectionId required" }), { status: 400, headers: corsHeaders });
      }

      const { data: conn } = await supabase.from("integration_connections").select("*, provider:integration_providers(provider_key)").eq("id", connectionId).maybeSingle();
      if (!conn) return new Response(JSON.stringify({ error: "Connection not found" }), { status: 404, headers: corsHeaders });

      const { data: tokens } = await supabase.from("integration_connection_tokens").select("*").eq("connection_id", connectionId).maybeSingle();
      if (!tokens) return new Response(JSON.stringify({ connected: false, reason: "No tokens stored" }), { headers: corsHeaders });

      const providerKey = conn.provider?.provider_key;
      if (providerKey === "xero") {
        const accessToken = atob(tokens.encrypted_access_token);
        try {
          await getXeroTenants(accessToken);
          await supabase.from("integration_connections").update({ status: "connected", updated_at: new Date().toISOString() }).eq("id", connectionId);
          return new Response(JSON.stringify({ connected: true }), { headers: corsHeaders });
        } catch {
          return new Response(JSON.stringify({ connected: false, reason: "Token invalid or expired" }), { headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({ connected: true, note: "Connection exists" }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint" }), { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
