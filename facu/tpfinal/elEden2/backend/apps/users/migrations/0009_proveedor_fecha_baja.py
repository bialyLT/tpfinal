from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0008_rename_localidad_nombre__pais_idx_localidad_nombre__90332a_idx"),
    ]

    operations = [
        migrations.AddField(
            model_name="proveedor",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
