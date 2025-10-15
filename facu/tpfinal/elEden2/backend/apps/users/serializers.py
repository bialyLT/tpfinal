from rest_framework import serializers
from .models import Genero, TipoDocumento, Localidad, Persona, Cliente, Proveedor


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


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'
        read_only_fields = ['id_proveedor', 'fecha_alta']
