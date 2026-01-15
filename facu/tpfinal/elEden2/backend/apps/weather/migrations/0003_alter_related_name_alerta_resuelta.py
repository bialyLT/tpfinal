from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("weather", "0002_rename_weather_models_es"),
    ]

    operations = [
        migrations.AlterField(
            model_name="alertaclimatica",
            name="resolved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                related_name="alertas_climaticas_resueltas",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
