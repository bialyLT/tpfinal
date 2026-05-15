from django.db import migrations, models


def seed_mantenimiento_integral(apps, schema_editor):
    OpcionMantenimientoIntegral = apps.get_model("servicios", "OpcionMantenimientoIntegral")

    if not OpcionMantenimientoIntegral.objects.exists():
        OpcionMantenimientoIntegral.objects.bulk_create(
            [
                OpcionMantenimientoIntegral(
                    codigo="poda_arboles",
                    nombre="Poda de árboles",
                    activo=True,
                    orden=1,
                ),
                OpcionMantenimientoIntegral(
                    codigo="corte_cesped",
                    nombre="Corte de césped",
                    activo=True,
                    orden=2,
                ),
                OpcionMantenimientoIntegral(
                    codigo="cambio_abono",
                    nombre="Cambio de abono",
                    activo=True,
                    orden=3,
                ),
            ]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("servicios", "0038_reserva_escala_terreno_remove_presupuesto_aproximado"),
    ]

    operations = [
        migrations.CreateModel(
            name="OpcionMantenimientoIntegral",
            fields=[
                ("id_opcion_mantenimiento", models.AutoField(primary_key=True, serialize=False)),
                ("codigo", models.CharField(max_length=50, unique=True)),
                ("nombre", models.CharField(max_length=120)),
                ("activo", models.BooleanField(default=True)),
                ("fecha_baja", models.DateTimeField(blank=True, null=True)),
                ("orden", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Opción de Mantenimiento Integral",
                "verbose_name_plural": "Opciones de Mantenimiento Integral",
                "db_table": "opcion_mantenimiento_integral",
                "ordering": ["orden", "nombre"],
            },
        ),
        migrations.RunPython(seed_mantenimiento_integral, migrations.RunPython.noop),
    ]