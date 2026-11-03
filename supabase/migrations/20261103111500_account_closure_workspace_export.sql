-- Read-only export primitives for the organisation-closure export endpoint.
-- These functions are service-role-only; authorization is checked by the
-- Edge Function before it asks for any organisation data.

CREATE OR REPLACE FUNCTION public.organisation_export_table_names()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(array_agg(c.table_name::text ORDER BY c.table_name), ARRAY[]::text[])
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON t.table_schema = c.table_schema AND t.table_name = c.table_name
  WHERE c.table_schema = 'public'
    AND c.column_name = 'organisation_id'
    AND t.table_type = 'BASE TABLE'
    -- Platform operations and access audit records are BuildNerve's internal
    -- records, not customer workspace data.
    AND c.table_name NOT LIKE 'platform\_%' ESCAPE '\'
    AND c.table_name <> 'organisation_deletion_requests';
$$;

CREATE OR REPLACE FUNCTION public.organisation_export_table_page(
  p_table text,
  p_organisation_id uuid,
  p_page_size integer DEFAULT 500,
  p_page_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_page_size < 1 OR p_page_size > 1000 OR p_page_offset < 0 THEN
    RAISE EXCEPTION 'Invalid export page';
  END IF;

  IF NOT (p_table = ANY (public.organisation_export_table_names())) THEN
    RAISE EXCEPTION 'Table is not available for organisation export';
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb)
       FROM (SELECT * FROM public.%I WHERE organisation_id = $1 ORDER BY ctid LIMIT $2 OFFSET $3) t',
    p_table
  )
  INTO v_result
  USING p_organisation_id, p_page_size, p_page_offset;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.organisation_export_table_names() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.organisation_export_table_page(text, uuid, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.organisation_export_table_names() TO service_role;
GRANT EXECUTE ON FUNCTION public.organisation_export_table_page(text, uuid, integer, integer) TO service_role;
