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
  WITH RECURSIVE tenant_tables(table_oid) AS (
    SELECT c.oid
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND a.attname = 'organisation_id'
      AND a.attnum > 0
      AND NOT a.attisdropped
    UNION
    SELECT fk.conrelid
    FROM pg_catalog.pg_constraint fk
    JOIN tenant_tables parent ON parent.table_oid = fk.confrelid
    JOIN pg_catalog.pg_class child ON child.oid = fk.conrelid
    JOIN pg_catalog.pg_namespace child_schema ON child_schema.oid = child.relnamespace
    WHERE fk.contype = 'f'
      AND child_schema.nspname = 'public'
      AND child.relkind IN ('r', 'p')
  ), export_tables AS (
    SELECT c.relname::text AS table_name
    FROM tenant_tables scoped
    JOIN pg_catalog.pg_class c ON c.oid = scoped.table_oid
    WHERE c.relname <> 'organisation_deletion_requests'
      AND c.relname NOT LIKE 'platform\_%' ESCAPE '\'
      AND c.relname NOT IN ('dispute_admin_access_log', 'dispute_admin_notes', 'dispute_audit_log')
    UNION
    SELECT 'organisations'
  )
  SELECT COALESCE(array_agg(table_name ORDER BY table_name), ARRAY[]::text[])
  FROM export_tables;
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
  v_table_oid oid;
  v_org_attnum smallint;
  v_path_tables oid[];
  v_path_constraints oid[];
  v_join_sql text := '';
  v_where_sql text;
  v_i integer;
  v_fk record;
BEGIN
  IF p_page_size < 1 OR p_page_size > 1000 OR p_page_offset < 0 THEN
    RAISE EXCEPTION 'Invalid export page';
  END IF;

  IF NOT (p_table = ANY (public.organisation_export_table_names())) THEN
    RAISE EXCEPTION 'Table is not available for organisation export';
  END IF;

  SELECT c.oid INTO v_table_oid
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = p_table AND c.relkind IN ('r', 'p');
  IF v_table_oid IS NULL THEN
    RAISE EXCEPTION 'Export table was not found';
  END IF;

  IF p_table = 'organisations' THEN
    v_where_sql := 't0.id = $1';
  ELSE
    SELECT a.attnum INTO v_org_attnum
    FROM pg_catalog.pg_attribute a
    WHERE a.attrelid = v_table_oid AND a.attname = 'organisation_id'
      AND a.attnum > 0 AND NOT a.attisdropped;

    IF v_org_attnum IS NOT NULL THEN
      v_where_sql := 't0.organisation_id = $1';
    ELSE
      WITH RECURSIVE paths(table_path, constraint_path, current_oid, depth) AS (
        SELECT ARRAY[v_table_oid, fk.confrelid]::oid[], ARRAY[fk.oid]::oid[], fk.confrelid, 1
        FROM pg_catalog.pg_constraint fk
        JOIN pg_catalog.pg_class parent ON parent.oid = fk.confrelid
        JOIN pg_catalog.pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
        WHERE fk.conrelid = v_table_oid AND fk.contype = 'f'
          AND cardinality(fk.conkey) = 1 AND cardinality(fk.confkey) = 1
          AND parent_schema.nspname = 'public' AND parent.relkind IN ('r', 'p')
        UNION ALL
        SELECT path.table_path || fk.confrelid,
               path.constraint_path || fk.oid,
               fk.confrelid,
               path.depth + 1
        FROM paths path
        JOIN pg_catalog.pg_constraint fk ON fk.conrelid = path.current_oid AND fk.contype = 'f'
        JOIN pg_catalog.pg_class parent ON parent.oid = fk.confrelid
        JOIN pg_catalog.pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
        WHERE cardinality(fk.conkey) = 1 AND cardinality(fk.confkey) = 1
          AND parent_schema.nspname = 'public' AND parent.relkind IN ('r', 'p')
          AND NOT fk.confrelid = ANY(path.table_path)
      )
      SELECT path.table_path, path.constraint_path
      INTO v_path_tables, v_path_constraints
      FROM paths path
      JOIN pg_catalog.pg_attribute a ON a.attrelid = path.current_oid
        AND a.attname = 'organisation_id' AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY path.depth
      LIMIT 1;

      IF v_path_constraints IS NULL THEN
        RAISE EXCEPTION 'No safe organisation path found for export table %', p_table;
      END IF;

      FOR v_i IN 1..cardinality(v_path_constraints) LOOP
        SELECT child.relname AS child_name,
               parent.relname AS parent_name,
               child_col.attname AS child_column,
               parent_col.attname AS parent_column
        INTO v_fk
        FROM pg_catalog.pg_constraint fk
        JOIN pg_catalog.pg_class child ON child.oid = fk.conrelid
        JOIN pg_catalog.pg_class parent ON parent.oid = fk.confrelid
        JOIN pg_catalog.pg_attribute child_col ON child_col.attrelid = fk.conrelid AND child_col.attnum = fk.conkey[1]
        JOIN pg_catalog.pg_attribute parent_col ON parent_col.attrelid = fk.confrelid AND parent_col.attnum = fk.confkey[1]
        WHERE fk.oid = v_path_constraints[v_i];
        v_join_sql := v_join_sql || format(
          ' JOIN public.%I t%s ON t%s.%I = t%s.%I',
          v_fk.parent_name, v_i, v_i - 1, v_fk.child_column, v_i, v_fk.parent_column
        );
      END LOOP;
      v_where_sql := format('t%s.organisation_id = $1', cardinality(v_path_tables) - 1);
    END IF;
  END IF;

  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(page)), ''[]''::jsonb)
       FROM (SELECT t0.* FROM public.%I t0%s WHERE %s ORDER BY t0.ctid LIMIT $2 OFFSET $3) page',
    p_table, v_join_sql, v_where_sql
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
