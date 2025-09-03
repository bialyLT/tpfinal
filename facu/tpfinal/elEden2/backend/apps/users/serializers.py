from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import Group, User
from django.contrib.auth import authenticate
from .models import (
    Persona, Rol, Pago, DetallePago, 
    MetodoPago, HistorialAcceso, ConfiguracionUsuario, PerfilUsuario
)


class PersonaSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    edad = serializers.ReadOnlyField()
    
    class Meta:
        model = Persona
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class RolSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(source='grupo.name', read_only=True)
    
    class Meta:
        model = Rol
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class ConfiguracionUsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracionUsuario
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.ReadOnlyField()
    roles_nombres = serializers.ReadOnlyField()
    es_administrador = serializers.ReadOnlyField()
    puede_acceder = serializers.ReadOnlyField()
    persona = PersonaSerializer(read_only=True)
    configuracion = ConfiguracionUsuarioSerializer(read_only=True)
    perfil = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'persona', 'perfil', 'configuracion', 'is_active', 'date_joined',
            'is_staff', 'is_superuser', 'groups', 'user_permissions',
            'nombre_completo', 'roles_nombres', 'es_administrador', 'puede_acceder'
        ]
        read_only_fields = ('date_joined', 'last_login')
    
    def get_perfil(self, obj):
        try:
            perfil = PerfilUsuario.objects.get(user=obj)
            return {
                'tipo_usuario': perfil.tipo_usuario,
                'estado': perfil.estado,
                'debe_cambiar_password': perfil.debe_cambiar_password,
                'fecha_ultimo_acceso': perfil.fecha_ultimo_acceso,
                'intentos_fallidos_login': perfil.intentos_fallidos_login,
                'recibir_notificaciones_email': perfil.recibir_notificaciones_email,
                'recibir_notificaciones_sistema': perfil.recibir_notificaciones_sistema,
                'productos_favoritos': perfil.productos_favoritos
            }
        except PerfilUsuario.DoesNotExist:
            return None


class UsuarioListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de usuarios"""
    nombre_completo = serializers.ReadOnlyField()
    roles_nombres = serializers.ReadOnlyField()
    perfil_estado = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'nombre_completo', 'perfil_estado', 'roles_nombres', 
            'is_active', 'date_joined'
        ]
    
    def get_perfil_estado(self, obj):
        try:
            perfil = PerfilUsuario.objects.get(user=obj)
            return perfil.estado
        except PerfilUsuario.DoesNotExist:
            return None


class MetodoPagoSerializer(serializers.ModelSerializer):
    costo_total_porcentaje = serializers.ReadOnlyField()
    
    class Meta:
        model = MetodoPago
        fields = '__all__'
        read_only_fields = ('fecha_creacion', 'fecha_actualizacion')


class DetallePagoSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.CharField(source='producto.nombre', read_only=True)
    producto_codigo = serializers.CharField(source='producto.codigo', read_only=True)
    total_con_descuento = serializers.ReadOnlyField()
    
    class Meta:
        model = DetallePago
        fields = '__all__'
        read_only_fields = ('subtotal',)


class PagoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='user.perfilusuario.persona.nombre_completo', read_only=True)
    metodo_pago_nombre = serializers.CharField(source='metodo_pago.nombre', read_only=True)
    duracion_procesamiento = serializers.ReadOnlyField()
    detalles = DetallePagoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Pago
        fields = '__all__'
        read_only_fields = (
            'numero_transaccion', 'monto_neto', 'fecha_procesamiento',
            'fecha_completado', 'fecha_creacion', 'fecha_actualizacion'
        )


class PagoListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listas de pagos"""
    usuario_nombre = serializers.CharField(source='user.perfilusuario.persona.nombre_completo', read_only=True)
    metodo_pago_nombre = serializers.CharField(source='metodo_pago.nombre', read_only=True)
    estado_display = serializers.CharField(source='get_estado_display', read_only=True)
    
    class Meta:
        model = Pago
        fields = [
            'id', 'numero_transaccion', 'usuario_nombre', 'metodo_pago_nombre',
            'monto', 'estado', 'estado_display', 'fecha_pago'
        ]


class HistorialAccesoSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = HistorialAcceso
        fields = '__all__'
        read_only_fields = ('fecha_acceso',)


# Serializers para creación de usuarios
class CrearUsuarioSerializer(serializers.ModelSerializer):
    persona_data = PersonaSerializer(write_only=True)
    password_confirmation = serializers.CharField(write_only=True)
    tipo_usuario = serializers.ChoiceField(
        choices=[('cliente', 'Cliente'), ('empleado', 'Empleado'), ('diseñador', 'Diseñador')],
        default='cliente',
        write_only=True
    )
    
    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password_confirmation',
            'first_name', 'last_name', 'persona_data', 'tipo_usuario', 'groups'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['password_confirmation']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data

    def create(self, validated_data):
        persona_data = validated_data.pop('persona_data')
        validated_data.pop('password_confirmation')
        password = validated_data.pop('password')
        tipo_usuario = validated_data.pop('tipo_usuario', 'cliente')
        groups = validated_data.pop('groups', [])
        
        # Crear persona
        persona = Persona.objects.create(**persona_data)
        
        # Crear usuario
        user = User.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Crear perfil de usuario
        PerfilUsuario.objects.create(
            user=user,
            persona=persona,
            tipo_usuario=tipo_usuario
        )
        
        # Asignar grupos
        user.groups.set(groups)
        
        # Crear configuración por defecto
        ConfiguracionUsuario.objects.create(user=user)
        
        return user

# =============================
# Serializers de Autenticación
# =============================

class PublicUserSerializer(serializers.ModelSerializer):
    """Serializer compacto de usuario para respuestas de auth."""
    groups = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'groups', 'date_joined']
        read_only_fields = ['id', 'date_joined']

    def get_groups(self, obj):
        return list(obj.groups.values_list('name', flat=True))


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer personalizado para permitir login con email"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Cambiar el campo username por email
        self.fields['email'] = serializers.EmailField()
        del self.fields['username']
    
    def validate(self, attrs):
        # Buscar usuario por email
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            try:
                user = User.objects.get(email=email)
                # Verificar la contraseña
                if user.check_password(password):
                    # Simular que se envió el username para el serializer padre
                    attrs['username'] = user.username
                    del attrs['email']  # Remover email
                    return super().validate(attrs)
                else:
                    raise serializers.ValidationError('No se puede iniciar sesión con las credenciales proporcionadas.')
            except User.DoesNotExist:
                raise serializers.ValidationError('No se puede iniciar sesión con las credenciales proporcionadas.')
        
        raise serializers.ValidationError('Email y contraseña son requeridos.')


class PublicRegisterSerializer(serializers.ModelSerializer):
    """Registro público básico sin requerir Persona."""
    password2 = serializers.CharField(write_only=True)
    # Campos extra que llegan del frontend; se ignoran por ahora
    telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
    direccion = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'telefono', 'direccion']
        extra_kwargs = {
            'password': { 'write_only': True }
        }

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({ 'password': 'Las contraseñas no coinciden.' })
        return attrs

    def create(self, validated_data):
        # Remover campos no pertenecientes al modelo o de validación
        validated_data.pop('password2', None)
        validated_data.pop('telefono', None)
        validated_data.pop('direccion', None)

        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)

        # Agregar al grupo Clientes si existe
        try:
            clientes_group, _ = Group.objects.get_or_create(name='Clientes')
            user.groups.add(clientes_group)
        except Exception:
            pass

        # Crear configuración por defecto si aplica
        ConfiguracionUsuario.objects.get_or_create(user=user)
        return user
