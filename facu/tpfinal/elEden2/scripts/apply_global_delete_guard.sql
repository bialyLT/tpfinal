DROP TRIGGER IF EXISTS prevent_producto_delete ON producto;
DROP FUNCTION IF EXISTS productos_prevent_producto_delete();

CREATE OR REPLACE FUNCTION prevent_physical_delete_guard()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'DELETE fisico bloqueado en tabla "%". Use borrado logico.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION attach_prevent_delete_trigger(target_table regclass)
RETURNS void AS $$
BEGIN
    EXECUTE format('DROP TRIGGER IF EXISTS prevent_physical_delete ON %s', target_table);
    EXECUTE format(
        'CREATE TRIGGER prevent_physical_delete BEFORE DELETE ON %s FOR EACH ROW EXECUTE FUNCTION prevent_physical_delete_guard()',
        target_table
    );
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('django_migrations')
    LOOP
        EXECUTE format(
            'SELECT attach_prevent_delete_trigger(%L::regclass)',
            format('%I.%I', r.schemaname, r.tablename)
        );
    END LOOP;
END;
$$;
