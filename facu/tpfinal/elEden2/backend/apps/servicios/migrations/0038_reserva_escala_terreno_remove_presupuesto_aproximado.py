from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("servicios", "0037_catalogos_soft_delete"),
    ]

    operations = [
        migrations.AddField(
            model_name="reserva",
            name="escala_terreno",
            field=models.CharField(
                blank=True,
                choices=[
                    ("balcones_patios_pequenos", "Balcones o patios pequeños (menos de 20 m2)"),
                    ("jardines_residenciales", "Jardines residenciales (entre 20 y 100 m2)"),
                    ("grandes_superficies_quintas", "Grandes superficies o quintas (más de 100 m2)"),
                ],
                help_text="Escala de terreno para el diseño",
                max_length=50,
                null=True,
            ),
        ),
        migrations.RemoveField(
            model_name="reserva",
            name="presupuesto_aproximado",
        ),
    ]