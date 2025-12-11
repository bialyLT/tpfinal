from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_localidad_nombre_pais"),
    ]

    operations = [
        migrations.AddField(
            model_name="localidad",
            name="latitud",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                help_text="Latitud geográfica aproximada",
                max_digits=9,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="localidad",
            name="longitud",
            field=models.DecimalField(
                blank=True,
                decimal_places=6,
                help_text="Longitud geográfica aproximada",
                max_digits=9,
                null=True,
            ),
        ),
    ]
