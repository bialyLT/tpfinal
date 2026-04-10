from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ventas", "0002_remove_venta_y_detalleventa"),
    ]

    operations = [
        migrations.AddField(
            model_name="compra",
            name="activo",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="compra",
            name="fecha_baja",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
