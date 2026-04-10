from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0009_bloqueo_delete_fisico_global"),
    ]

    operations = [
        migrations.AddField(
            model_name="categoria",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="categoria",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="marca",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="marca",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="especie",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="especie",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="tarea",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="tarea",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
