from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("weather", "0001_initial"),
    ]

    operations = [
        migrations.RenameModel(
            old_name="WeatherForecast",
            new_name="PronosticoClima",
        ),
        migrations.RenameModel(
            old_name="WeatherAlert",
            new_name="AlertaClimatica",
        ),
    ]
