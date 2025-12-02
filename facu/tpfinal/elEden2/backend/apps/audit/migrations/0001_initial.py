from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('administrador', 'Administrador'), ('empleado', 'Empleado'), ('cliente', 'Cliente'), ('anonimo', 'Anónimo'), ('desconocido', 'Desconocido')], default='desconocido', max_length=32)),
                ('method', models.CharField(max_length=10)),
                ('action', models.CharField(max_length=120)),
                ('entity', models.CharField(max_length=120)),
                ('object_id', models.CharField(blank=True, max_length=64, null=True)),
                ('endpoint', models.CharField(max_length=255)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('payload', models.JSONField(blank=True, null=True)),
                ('response_code', models.PositiveIntegerField(blank=True, null=True)),
                ('response_body', models.JSONField(blank=True, null=True)),
                ('metadata', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Registro de auditoría',
                'verbose_name_plural': 'Registros de auditoría',
                'db_table': 'audit_log',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['created_at'], name='audit_log_created_Idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['method'], name='audit_log_method_Idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['entity'], name='audit_log_entity_Idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['role'], name='audit_log_role_Idx'),
        ),
    ]
