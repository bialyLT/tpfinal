from django.db import migrations


DROP_PRODUCTO_SPECIFIC_SQL = """
DROP TRIGGER IF EXISTS prevent_producto_delete ON producto;
DROP FUNCTION IF EXISTS productos_prevent_producto_delete();
"""


CREATE_GENERIC_GUARD_SQL = """
CREATE OR REPLACE FUNCTION prevent_physical_delete_guard()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'DELETE fisico bloqueado en tabla "%". Use borrado logico.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
"""


CREATE_ATTACH_HELPER_SQL = """
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
"""


ATTACH_TO_ALL_TABLES_SQL = """
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
"""


DROP_GLOBAL_TRIGGERS_SQL = """
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS prevent_physical_delete ON %I.%I',
            r.schemaname,
            r.tablename
        );
    END LOOP;
END;
$$;
"""


DROP_HELPERS_SQL = """
DROP FUNCTION IF EXISTS attach_prevent_delete_trigger(regclass);
DROP FUNCTION IF EXISTS prevent_physical_delete_guard();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0008_bloquear_delete_fisico_producto"),
        ("servicios", "0035_catalogos_configurables"),
        ("users", "0008_rename_localidad_nombre__pais_idx_localidad_nombre__90332a_idx"),
        ("ventas", "0002_remove_venta_y_detalleventa"),
        ("weather", "0004_renombrar_campos_clima_es"),
        ("encuestas", "0006_remove_encuestas_fechas_y_orden"),
        ("audit", "0005_add_before_after_state"),
        ("emails", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(DROP_PRODUCTO_SPECIFIC_SQL, reverse_sql=migrations.RunSQL.noop),
        migrations.RunSQL(CREATE_GENERIC_GUARD_SQL, reverse_sql="DROP FUNCTION IF EXISTS prevent_physical_delete_guard();"),
        migrations.RunSQL(
            CREATE_ATTACH_HELPER_SQL,
            reverse_sql="DROP FUNCTION IF EXISTS attach_prevent_delete_trigger(regclass);",
        ),
        migrations.RunSQL(ATTACH_TO_ALL_TABLES_SQL, reverse_sql=DROP_GLOBAL_TRIGGERS_SQL),
    ]
