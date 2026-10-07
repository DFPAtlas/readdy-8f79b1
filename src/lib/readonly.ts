// Shared helpers for the free-trial read-only experience.
// Read-only access is enforced on the server; these helpers add the matching
// client-side behaviour (blocked buttons, hovering/tap feedback) and translate a
// server refusal into the same friendly message instead of a technical error.

export const READONLY_MESSAGE = 'Upgrade to make changes';

/** Words that indicate a create / edit / delete intent on a control. */
const WRITE_INTENT = /\b(new|create|add|edit|save|update|delete|remove|upload|invite|submit|approve|reject|record|raise|import|assign|publish|generate|duplicate|archive|issue|apply|confirm|attach|capture)\b/i;

/** Actions that are always allowed in read-only mode (reading or upgrading). */
const ALLOWED_INTENT = /\b(view|open|export|download|search|filter|print|copy|upgrade|sign out|sign in|log out|log in|back|cancel|close|dismiss|subscribe)\b/i;

/** Paths that stay reachable in read-only mode (billing / upgrade). */
const ALLOWED_PATH = /\/(settings\/billing|billing|pricing|legal|help)(\/|$)/i;

function isElementVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled')) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Best-effort detection of a write control. The server is the real source of
 * truth; this only decides whether to intercept the click and show the friendly
 * message. Explicit `data-write-action` always wins.
 */
export function isWriteControl(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest<HTMLElement>(
    '[data-write-action], a, button, [role="button"], input[type="submit"], input[type="button"]',
  );
  if (!el) return null;
  if (el.getAttribute('aria-disabled') === 'true') return el;
  if (el.hasAttribute('data-readonly-allow')) return null;
  if (!isElementVisible(el)) return null;

  if (el.hasAttribute('data-write-action')) return el;

  const text = [
    el.getAttribute('aria-label') || '',
    el.getAttribute('title') || '',
    el.textContent || '',
  ].join(' ');

  if (ALLOWED_INTENT.test(text)) return null;

  const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') || '' : '';
  if (href && ALLOWED_PATH.test(href)) return null;

  if (WRITE_INTENT.test(text)) return el;
  if (href && /\/(new|create|edit|invite|onboard|upload)(\/|$|\?)/i.test(href)) return el;

  return null;
}

/** Signature of the server-side read-only refusal (see migration 040). */
function isReadOnlyRefusal(status: number, body: unknown): boolean {
  if (status < 400) return false;
  if (!body || typeof body !== 'object') return false;
  const record = body as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  const code = typeof record.code === 'string' ? record.code : '';
  return code === '42501'
    || /upgrade your plan/i.test(message)
    || /read-only mode/i.test(message)
    || /trial has ended/i.test(message);
}

let interceptorInstalled = false;

/**
 * Wraps window.fetch once so that a PostgREST write rejected by the read-only
 * guard surfaces the same friendly message as the blocked buttons, rather than
 * the raw database error. Only write requests to /rest/v1/ are inspected.
 */
export function installReadOnlyErrorInterceptor(): void {
  if (interceptorInstalled || typeof window === 'undefined' || !window.fetch) return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);

    try {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = (init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET') || 'GET').toUpperCase();

      if (!/\/rest\/v1\//.test(url) || !['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
        return response;
      }
      if (response.ok) return response;

      const clone = response.clone();
      const text = await clone.text();
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        return response;
      }

      if (!isReadOnlyRefusal(response.status, parsed)) return response;

      const record = parsed as Record<string, unknown>;
      const friendly = { ...record, message: READONLY_MESSAGE, details: READONLY_MESSAGE };
      return new Response(JSON.stringify(friendly), {
        status: response.status,
        statusText: response.statusText,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      return response;
    }
  };
}