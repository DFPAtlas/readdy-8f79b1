-- BuildNerve P0 security fix.
-- The original procurement migration exposed RFQ invitation rows and supplier
-- quote records whenever an invitation_token merely existed. That did not
-- prove the caller possessed the invitation token, while anon/authenticated
-- roles had Data API privileges on these tables.
--
-- Until a server-authoritative supplier invitation exchange is implemented,
-- external token-based RFQ access is disabled. Existing organisation-member
-- RLS policies remain in force for the authenticated internal application.

drop policy if exists "Token holders can SELECT their RFQ supplier link"
  on public.rfq_suppliers;

drop policy if exists "Token holders can INSERT supplier_quote_responses"
  on public.supplier_quote_responses;

drop policy if exists "Token holders can SELECT their quote responses"
  on public.supplier_quote_responses;

drop policy if exists "Token holders can INSERT supplier_quote_lines"
  on public.supplier_quote_lines;

drop policy if exists "Token holders can SELECT their quote lines"
  on public.supplier_quote_lines;

drop policy if exists "Token holders can SELECT their RFQ"
  on public.requests_for_quotation;

drop policy if exists "Token holders can SELECT their RFQ lines"
  on public.rfq_lines;
