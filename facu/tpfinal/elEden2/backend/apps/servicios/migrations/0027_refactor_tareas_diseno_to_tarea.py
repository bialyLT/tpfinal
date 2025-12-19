from django.db import migrations, models
import django.db.models.deletion


def clear_diseno_tarea(apps, schema_editor):
    # We intentionally drop existing relations because they referenced TareaDiseno
    # and we are switching to reuse productos.Tarea (ABM Tareas).
    DisenoTarea = apps.get_model("servicios", "DisenoTarea")
    DisenoTarea.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("productos", "0004_merge_0003_rename_indices_0003_tareas"),
        ("servicios", "0026_tareadiseno_disenotarea_diseno_tareas_diseno_and_more"),
    ]

    operations = [
        migrations.RunPython(clear_diseno_tarea, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="diseno",
            name="tareas_diseno",
        ),
        migrations.AlterField(
            model_name="disenotarea",
            name="tarea",
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tarea_disenos", to="productos.tarea"),
        ),
        migrations.AddField(
            model_name="diseno",
            name="tareas_diseno",
            field=models.ManyToManyField(blank=True, related_name="disenos", through="servicios.DisenoTarea", to="productos.tarea"),
        ),
        migrations.DeleteModel(
            name="TareaDiseno",
        ),
    ]
