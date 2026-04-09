from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0006_remove_stock_cantidad_minima_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="producto",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="producto",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="producto",
            index=models.Index(fields=["activo"], name="producto_activo_idx"),
        ),
    ]
