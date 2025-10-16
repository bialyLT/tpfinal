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
    """Serializer para el registro de usuarios (clientes)"""
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    
    # Campos de Persona
    telefono = serializers.CharField(required=True)
    calle = serializers.CharField(required=True)
    numero = serializers.CharField(required=True)
    piso = serializers.CharField(required=False, allow_blank=True)
    dpto = serializers.CharField(required=False, allow_blank=True)
    nro_documento = serializers.CharField(required=True)
    localidad_id = serializers.IntegerField(required=True)
    
    class Meta:
        model = User
        fields = [
            # Campos de Persona (primero)
            'first_name', 'last_name', 'telefono', 'nro_documento', 
            'calle', 'numero', 'piso', 'dpto', 'localidad_id',
            # Campos de User (después)
            'username', 'email', 'password', 'password2'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        
        # Validar que no exista un documento duplicado
        from apps.users.models import Persona
        nro_doc = attrs.get('nro_documento')
        if Persona.objects.filter(nro_documento=nro_doc).exists():
            raise serializers.ValidationError({"nro_documento": "Este número de documento ya está registrado."})
        
        return attrs
    
    def create(self, validated_data):
        # Extraer campos que no pertenecen al User
        validated_data.pop('password2')
        telefono = validated_data.pop('telefono')
        calle = validated_data.pop('calle')
        numero = validated_data.pop('numero')
        piso = validated_data.pop('piso', '')
        dpto = validated_data.pop('dpto', '')
        nro_documento = validated_data.pop('nro_documento')
        localidad_id = validated_data.pop('localidad_id')
        
        # Crear el usuario de Django
        user = User.objects.create_user(**validated_data)
        
        # Agregar al grupo de Clientes por defecto
        try:
            clientes_group, created = Group.objects.get_or_create(name='Clientes')
            user.groups.add(clientes_group)
        except Exception as e:
            pass
        
        # Importar modelos necesarios
        from apps.users.models import Persona, Cliente, Genero, TipoDocumento, Localidad
        
        try:
            # Obtener las relaciones (con valores por defecto)
            genero = Genero.objects.filter(genero='Prefiero no decir').first() or Genero.objects.first()
            tipo_documento = TipoDocumento.objects.filter(tipo='DNI').first() or TipoDocumento.objects.first()
            localidad = Localidad.objects.get(id_localidad=localidad_id)
            
            # Crear Persona (manteniendo email por compatibilidad con la BD actual)
            persona = Persona.objects.create(
                nombre=user.first_name,
                apellido=user.last_name,
                email=user.email,  # Mantener por compatibilidad
                telefono=telefono,
                calle=calle,
                numero=numero,
                piso=piso or '',
                dpto=dpto or '',
                nro_documento=nro_documento,
                genero=genero,
                tipo_documento=tipo_documento,
                localidad=localidad
            )
            
            # Crear Cliente vinculado a la Persona
            Cliente.objects.create(
                persona=persona,
                activo=True
            )
        except Exception as e:
            # Si falla la creación de Persona/Cliente, eliminar el usuario creado
            user.delete()
            raise serializers.ValidationError({
                'error': f'Error al crear el perfil de cliente: {str(e)}'
            })
        
        return user
