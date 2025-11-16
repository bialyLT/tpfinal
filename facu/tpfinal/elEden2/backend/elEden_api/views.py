from django.contrib.auth import get_user_model
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.servicios.models import Servicio, Reserva


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
        monthly_revenue = Reserva.objects.filter(
            estado_pago_final='pagado',
            fecha_pago_final__gte=start_of_month
        ).aggregate(total=Sum('monto_final'))['total'] or 0

        return Response({
            'total_users': total_users,
            'active_services': active_services,
            'monthly_revenue': float(monthly_revenue)
        }, status=status.HTTP_200_OK)