"""Generated migration for ImagenZona model"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("servicios", "0021_remove_jardin_forma"),
    ]

    operations = [
        migrations.CreateModel(
            name="ImagenZona",
            fields=[
                ("id_imagen_zona", models.AutoField(primary_key=True, serialize=False)),
                (
                    "imagen",
                    models.ImageField(help_text="Imagen de la zona", upload_to="zonas/%Y/%m/"),
                ),
                (
                    "descripcion",
                    models.CharField(
                        blank=True,
                        help_text="Descripción de la imagen",
                        max_length=200,
                        null=True,
                    ),
                ),
                (
                    "orden",
                    models.IntegerField(default=0, help_text="Orden de visualización de la imagen"),
                ),
                ("fecha_subida", models.DateTimeField(auto_now_add=True)),
                (
                    "zona",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="imagenes",
                        to="servicios.zonajardin",
                    ),
                ),
            ],
            options={
                "verbose_name": "Imagen de Zona",
                "verbose_name_plural": "Imágenes de Zona",
                "db_table": "imagen_zona",
                "indexes": [
                    models.Index(fields=["zona"], name="imagen_zona_zon_12345_idx"),
                    models.Index(fields=["orden"], name="imagen_zona_orden_12345_idx"),
                ],
            },
        ),
    ]
