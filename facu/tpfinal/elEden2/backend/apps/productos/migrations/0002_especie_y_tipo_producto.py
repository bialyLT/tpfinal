from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Especie",
            fields=[
                ("id_especie", models.AutoField(primary_key=True, serialize=False)),
                ("nombre_especie", models.CharField(max_length=100, unique=True)),
                ("descripcion", models.TextField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "Especie",
                "verbose_name_plural": "Especies",
                "db_table": "especie",
                "ordering": ["nombre_especie"],
            },
        ),
        migrations.AddField(
            model_name="producto",
            name="tipo_producto",
            field=models.BooleanField(db_column="tipoProducto", default=True),
        ),
        migrations.AlterField(
            model_name="producto",
            name="marca",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="productos",
                to="productos.marca",
            ),
        ),
        migrations.AddField(
            model_name="producto",
            name="especie",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="productos",
                to="productos.especie",
            ),
        ),
        migrations.AddIndex(
            model_name="producto",
            index=models.Index(fields=["especie"], name="producto_especie_idx"),
        ),
        migrations.AddIndex(
            model_name="producto",
            index=models.Index(fields=["tipo_producto"], name="producto_tipo_producto_idx"),
        ),
    ]
