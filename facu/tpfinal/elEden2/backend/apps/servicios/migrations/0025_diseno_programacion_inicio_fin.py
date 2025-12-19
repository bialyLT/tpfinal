from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("servicios", "0024_rename_imagen_zona_zon_12345_idx_imagen_zona_zona_id_0c8dd5_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="diseno",
            name="fecha_inicio",
            field=models.DateField(blank=True, help_text="Fecha estimada de inicio del trabajo", null=True),
        ),
        migrations.AddField(
            model_name="diseno",
            name="hora_inicio",
            field=models.TimeField(blank=True, help_text="Hora estimada de inicio del trabajo", null=True),
        ),
        migrations.AddField(
            model_name="diseno",
            name="fecha_fin",
            field=models.DateField(blank=True, help_text="Fecha estimada de finalización del trabajo", null=True),
        ),
        migrations.AddField(
            model_name="diseno",
            name="hora_fin",
            field=models.TimeField(blank=True, help_text="Hora estimada de finalización del trabajo", null=True),
        ),
    ]
