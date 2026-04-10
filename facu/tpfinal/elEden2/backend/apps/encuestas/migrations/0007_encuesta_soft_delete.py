from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("encuestas", "0006_remove_encuestas_fechas_y_orden"),
    ]

    operations = [
        migrations.AddField(
            model_name="encuesta",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="encuesta",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
