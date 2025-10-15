from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer

class HealthCheckView(APIView):
    """Vista simple para verificar el estado de la API"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'healthy',
            'message': 'El Eden API is running',
            'version': '1.0.0'
        })

class CustomTokenObtainPairView(TokenObtainPairView):
    """Vista personalizada para obtener tokens JWT que acepta email"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]

"""Solo vistas propias del core; la autenticación vive en apps.users"""
