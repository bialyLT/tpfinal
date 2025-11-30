from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('servicios', '0020_remove_jardin_ancho_remove_jardin_largo'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='jardin',
            name='forma',
        ),
    ]
