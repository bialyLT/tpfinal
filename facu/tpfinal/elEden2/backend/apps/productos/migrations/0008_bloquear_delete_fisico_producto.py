from django.db import migrations


TRIGGER_FUNCTION_SQL = """
CREATE OR REPLACE FUNCTION productos_prevent_producto_delete()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'DELETE fisico bloqueado para producto. Use borrado logico (activo=false).';
END;
$$ LANGUAGE plpgsql;
"""


CREATE_TRIGGER_SQL = """
DROP TRIGGER IF EXISTS prevent_producto_delete ON producto;
CREATE TRIGGER prevent_producto_delete
BEFORE DELETE ON producto
FOR EACH ROW
EXECUTE FUNCTION productos_prevent_producto_delete();
"""


DROP_TRIGGER_SQL = """
DROP TRIGGER IF EXISTS prevent_producto_delete ON producto;
DROP FUNCTION IF EXISTS productos_prevent_producto_delete();
"""


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0007_producto_soft_delete"),
    ]

    operations = [
        migrations.RunSQL(TRIGGER_FUNCTION_SQL, reverse_sql="DROP FUNCTION IF EXISTS productos_prevent_producto_delete();"),
        migrations.RunSQL(CREATE_TRIGGER_SQL, reverse_sql=DROP_TRIGGER_SQL),
    ]
