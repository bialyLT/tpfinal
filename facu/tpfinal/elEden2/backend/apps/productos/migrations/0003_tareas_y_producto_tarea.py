from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0002_especie_y_tipo_producto"),
    ]

    operations = [
        migrations.CreateModel(
            name="Tarea",
            fields=[
                ("id_tarea", models.AutoField(primary_key=True, serialize=False)),
                ("nombre", models.CharField(max_length=150, unique=True)),
                ("duracion_base", models.PositiveIntegerField()),
                ("cantidad_personal_minimo", models.PositiveIntegerField()),
            ],
            options={
                "verbose_name": "Tarea",
                "verbose_name_plural": "Tareas",
                "db_table": "tarea",
                "ordering": ["nombre"],
            },
        ),
        migrations.CreateModel(
            name="ProductoTarea",
            fields=[
                ("id_producto_tarea", models.AutoField(primary_key=True, serialize=False)),
                (
                    "producto",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="producto_tareas",
                        to="productos.producto",
                    ),
                ),
                (
                    "tarea",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tarea_productos",
                        to="productos.tarea",
                    ),
                ),
            ],
            options={
                "verbose_name": "Producto-Tarea",
                "verbose_name_plural": "Productos-Tareas",
                "db_table": "producto_tarea",
                "unique_together": {("producto", "tarea")},
            },
        ),
        migrations.AddField(
            model_name="producto",
            name="tareas",
            field=models.ManyToManyField(blank=True, related_name="productos", through="productos.ProductoTarea", to="productos.tarea"),
        ),
    ]
