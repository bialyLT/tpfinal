from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_empleado_baja_automatica_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='localidad',
            name='nombre_pais',
            field=models.CharField(default='Argentina', max_length=100),
        ),
        migrations.AddIndex(
            model_name='localidad',
            index=models.Index(fields=['nombre_pais'], name='localidad_nombre__pais_idx'),
        ),
    ]
