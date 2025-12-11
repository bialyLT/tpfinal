from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("encuestas", "0002_alter_encuestarespuesta_unique_together_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="encuesta",
            constraint=models.UniqueConstraint(
                fields=("activa",),
                condition=models.Q(("activa", True)),
                name="unique_active_encuesta",
            ),
        ),
    ]
