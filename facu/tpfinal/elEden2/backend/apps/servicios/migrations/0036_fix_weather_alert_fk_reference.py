from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("weather", "0004_renombrar_campos_clima_es"),
        ("servicios", "0035_catalogos_configurables"),
    ]

    operations = [
        migrations.AlterField(
            model_name="reserva",
            name="weather_alert",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="reservas_afectadas",
                to="weather.alertaclimatica",
            ),
        ),
    ]
