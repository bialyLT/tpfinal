from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer personalizado para JWT que acepta email en lugar de username"""
    username_field = 'username'  # Mantenemos el campo como username en la validación
    
    def validate(self, attrs):
        # Obtener username o email
        username = attrs.get('username')
        password = attrs.get('password')
        
        # Intentar autenticar con username
        user = authenticate(username=username, password=password)
        
        # Si no funciona, intentar con email
        if user is None:
            try:
                user_obj = User.objects.get(email=username)
                user = authenticate(username=user_obj.username, password=password)
            except User.DoesNotExist:
                pass
        
        if user is None:
            raise serializers.ValidationError('Credenciales inválidas')
        
        # Usar el método parent para generar los tokens
        refresh = self.get_token(user)
        
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        
        return data

class UserSerializer(serializers.ModelSerializer):
    """Serializer para el modelo de usuario"""
    groups = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'groups', 'date_joined']
        read_only_fields = ['id', 'date_joined']
    
    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer para el registro de usuarios"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        
        # Agregar al grupo de Clientes por defecto
        try:
            clientes_group, created = Group.objects.get_or_create(name='Clientes')
            user.groups.add(clientes_group)
        except Exception as e:
            pass  # Si no existe el grupo, continuar sin error
        
        return user
