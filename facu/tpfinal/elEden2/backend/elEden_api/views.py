from django.contrib.auth import get_user_model
from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.servicios.models import Pago, Servicio


class AdminStatsAPIView(APIView):
    """
    Estadísticas para el dashboard de administrador.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        # Total usuarios
        User = get_user_model()
        total_users = User.objects.count()

        # Servicios activos
        active_services = Servicio.objects.filter(activo=True).count()

        # Ingresos del mes actual
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Sumamos ingresos efectivamente cobrados en el mes:
        # - Señas pagadas en el mes (monto_sena)
        # - Pagos finales pagados en el mes (monto_total - monto_sena)
        # Esto evita doble conteo y distribuye ingresos según la fecha real de cobro.
        monthly_sena = (
            Pago.objects.filter(estado_pago_sena="sena_pagada", fecha_pago_sena__gte=start_of_month).aggregate(
                total=Sum("monto_sena")
            )["total"]
            or 0
        )
        monthly_final = (
            Pago.objects.filter(estado_pago_final="pagado", fecha_pago_final__gte=start_of_month)
            .annotate(
                monto_final_calc=ExpressionWrapper(
                    F("monto_total") - F("monto_sena"),
                    output_field=DecimalField(max_digits=10, decimal_places=2),
                )
            )
            .aggregate(total=Sum("monto_final_calc"))["total"]
            or 0
        )
        monthly_revenue = monthly_sena + monthly_final

        return Response(
            {
                "total_users": total_users,
                "active_services": active_services,
                "monthly_revenue": float(monthly_revenue),
            },
            status=status.HTTP_200_OK,
        )
