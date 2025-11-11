from rest_framework import serializers
from django.contrib.auth.models import User, Group
from .models import Genero, TipoDocumento, Localidad, Persona, Cliente, Empleado, Proveedor


class GeneroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genero
        fields = '__all__'


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = '__all__'


class LocalidadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Localidad
        fields = '__all__'


class PersonaSerializer(serializers.ModelSerializer):
    genero_nombre = serializers.CharField(source='genero.genero', read_only=True)
    tipo_documento_nombre = serializers.CharField(source='tipo_documento.tipo', read_only=True)
    localidad_nombre = serializers.CharField(source='localidad.nombre_localidad', read_only=True)
    
    class Meta:
        model = Persona
        fields = '__all__'


class ClienteSerializer(serializers.ModelSerializer):
    persona_detalle = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Cliente
        fields = '__all__'


class EmpleadoSerializer(serializers.ModelSerializer):
    persona_detalle = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Empleado
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'
        read_only_fields = ['id_proveedor', 'fecha_alta']


class UserSerializer(serializers.ModelSerializer):
    """Serializer para listar usuarios (empleados)"""
    groups = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'groups', 'date_joined', 'last_login']
        read_only_fields = ['id', 'date_joined', 'last_login']
    
    def get_groups(self, obj):
        return [group.name for group in obj.groups.all()]


class CreateEmpleadoSerializer(serializers.Serializer):
    """Serializer para crear empleados - solo datos básicos requeridos"""
    # Datos de autenticación (REQUERIDOS)
    username = serializers.CharField(required=True, max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=8)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    
    # Datos de Persona (REQUERIDOS para completar el registro)
    telefono = serializers.CharField(required=True, max_length=20)
    nro_documento = serializers.CharField(required=True, max_length=20)
    tipo_documento_id = serializers.IntegerField(required=True)
    genero_id = serializers.IntegerField(required=True)
    
    # Dirección (OPCIONAL)
    calle = serializers.CharField(required=False, allow_blank=True, max_length=200)
    numero = serializers.CharField(required=False, allow_blank=True, max_length=10)
    piso = serializers.CharField(required=False, allow_blank=True, max_length=10)
    dpto = serializers.CharField(required=False, allow_blank=True, max_length=10)
    localidad_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Datos de empleado (OPCIONAL)
    cargo = serializers.CharField(required=False, allow_blank=True, max_length=100)
    is_active = serializers.BooleanField(default=True)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Este nombre de usuario ya existe.")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado.")
        if Persona.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este email ya está registrado en el sistema.")
        return value
    
    def validate_nro_documento(self, value):
        # Solo validar si se proporciona un número de documento
        if value and Persona.objects.filter(nro_documento=value).exists():
            raise serializers.ValidationError("Este número de documento ya está registrado.")
        return value
    
    def create(self, validated_data):
        # Extraer datos (ahora todos son requeridos excepto dirección)
        telefono = validated_data.pop('telefono')
        nro_documento = validated_data.pop('nro_documento')
        calle = validated_data.pop('calle', 'PENDIENTE')
        numero = validated_data.pop('numero', 'S/N')
        piso = validated_data.pop('piso', '')
        dpto = validated_data.pop('dpto', '')
        localidad_id = validated_data.pop('localidad_id', None)
        tipo_documento_id = validated_data.pop('tipo_documento_id')
        genero_id = validated_data.pop('genero_id')
        cargo = validated_data.pop('cargo', '')
        
        # Crear usuario
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            is_active=validated_data.get('is_active', True)
        )
        
        # Agregar al grupo Empleados
        empleados_group, created = Group.objects.get_or_create(name='Empleados')
        user.groups.add(empleados_group)
        
        # Obtener genero y tipo_documento (ahora son requeridos)
        genero = Genero.objects.get(id_genero=genero_id)
        tipo_documento = TipoDocumento.objects.get(id_tipo_documento=tipo_documento_id)
        
        # Obtener localidad por defecto si no se proporciona
        if not localidad_id:
            localidad = Localidad.objects.first()
            if not localidad:
                raise serializers.ValidationError("No hay localidades disponibles en el sistema.")
        else:
            localidad = Localidad.objects.get(id_localidad=localidad_id)
        
        # Crear Persona con datos completos
        persona = Persona.objects.create(
            nombre=user.first_name,
            apellido=user.last_name,
            email=user.email,
            telefono=telefono,
            nro_documento=nro_documento,
            calle=calle,
            numero=numero,
            piso=piso,
            dpto=dpto,
            localidad=localidad,
            genero=genero,
            tipo_documento=tipo_documento
        )
        
        # Crear Empleado
        Empleado.objects.create(
            persona=persona,
            cargo=cargo or 'Sin especificar',
            activo=True
        )
        
        return user


class UpdateEmpleadoSerializer(serializers.ModelSerializer):
    """Serializer para actualizar empleados"""
    password = serializers.CharField(required=False, write_only=True, min_length=8, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'is_active', 'password']
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        instance.save()
        return instance
