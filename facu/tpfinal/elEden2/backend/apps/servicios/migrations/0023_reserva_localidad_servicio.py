from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0007_localidad_coordinates"),
        ("servicios", "0022_imagen_zona"),
    ]

    operations = [
        migrations.AddField(
            model_name="reserva",
            name="localidad_servicio",
            field=models.ForeignKey(
                blank=True,
                help_text="Localidad donde se realizará el servicio",
                null=True,
                on_delete=models.SET_NULL,
                related_name="reservas_programadas",
                to="users.localidad",
            ),
        ),
    ]
