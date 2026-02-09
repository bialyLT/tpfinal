from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("audit", "0004_alter_auditlog_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="auditlog",
            name="before_state",
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="auditlog",
            name="after_state",
            field=models.JSONField(blank=True, null=True),
        ),
    ]
