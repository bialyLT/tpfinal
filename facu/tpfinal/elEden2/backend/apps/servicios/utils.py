from decimal import Decimal
from typing import Iterable


def ordenar_empleados_por_puntuacion(empleados_iterable: Iterable):
    """Ordena empleados priorizando puntuación promedio, cantidad y frescura."""
    empleados = list(empleados_iterable)

    def sort_key(empleado):
        promedio = empleado.puntuacion_promedio or Decimal('0')
        cantidad = empleado.puntuacion_cantidad or 0
        fecha_ts = empleado.fecha_ultima_puntuacion.timestamp() if empleado.fecha_ultima_puntuacion else float('-inf')
        return (promedio, cantidad, fecha_ts, -empleado.id_empleado)

    empleados.sort(key=sort_key, reverse=True)
    return empleados
