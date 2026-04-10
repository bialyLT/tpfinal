from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("servicios", "0036_fix_weather_alert_fk_reference"),
    ]

    operations = [
        migrations.AddField(
            model_name="objetivodiseno",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="opcionnivelintervencion",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="opcionpresupuestoaproximado",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="formaterreno",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="formaterreno",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
