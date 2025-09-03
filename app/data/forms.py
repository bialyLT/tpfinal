from django import forms
from django.contrib.auth.models import Group
from django.contrib.auth.models import User
from app.core.models import (
    Pais, Provincia, Localidad, TipoDocumento, Empleado, Categoria, Marca, Unidad, Producto, Stock, MetodoPago
)
 
class PaisForm(forms.ModelForm):
    class Meta:
        model = Pais
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre del país',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
        }

    def __init__(self, *args, **kwargs):
        super(PaisForm, self).__init__(*args, **kwargs)
        self.fields['nombre'].widget.attrs.update({'class': 'form-control'})

class ProvinciaForm(forms.ModelForm):
    class Meta:
        model = Provincia
        fields = ['nombre', 'pais']
        labels = {
            'nombre': 'Nombre de la provincia',
            'pais': 'País',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
            'pais': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'pais',
            }),
        }

class LocalidadForm(forms.ModelForm):
    class Meta:
        model = Localidad
        fields = ['nombre', 'provincia']
        labels = {
            'nombre': 'Nombre de la localidad',
            'provincia': 'Provincia',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
            'provincia': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'provincia',
            }),
        }

class TipoDocumentoForm(forms.ModelForm):
    class Meta:
        model = TipoDocumento
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre del tipo de documento',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
        }

class CategoriaForm(forms.ModelForm):
    class Meta:
        model = Categoria
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre de la categoría',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
        }
        
class MarcaForm(forms.ModelForm):
    class Meta:
        model = Marca
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre de la marca',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
        }
        
class UnidadForm(forms.ModelForm):
    class Meta:
        model = Unidad
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre de la unidad',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre',
            }),
        }
              
class UserForm(forms.ModelForm):
    password = forms.CharField(
        label="Contraseña",
        widget=forms.PasswordInput(attrs={
            'class': 'w-full block input input-accent',
            'autocomplete': 'off',
            'required': True,
            'id': 'password',
        })
    )
    grupo = forms.ModelChoiceField(
        queryset=Group.objects.all(),
        required=True,
        label="Rol",
        widget=forms.Select(attrs={
            'class': 'w-full block select select-accent',
            'id': 'grupo',
        })
    )
    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name']
        labels = {
            'username': 'Nombre de usuario',
            'password': 'Contraseña',
            'email': 'Correo electrónico',
            'first_name': 'Nombre',
            'last_name': 'Apellido',
        }
        widgets = {
            'username': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'username',
            }),
            'email': forms.EmailInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'email',
            }),
            'first_name': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'first_name',
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'last_name',
            }),
        }

class EmpleadoForm(forms.ModelForm):
    class Meta:
        model = Empleado
        fields = ['dni', 'tipo_documento', 'localidad', 'direccion', 'telefono']
        labels = {
            'dni': 'DNI',
            'tipo_documento': 'Tipo de documento',
            'localidad': 'Localidad',
            'direccion': 'Dirección',
            'telefono': 'Teléfono'
        }
        widgets = {
            'dni': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'dni',
            }),
            'tipo_documento': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'tipo_documento',
            }),
            'localidad': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'localidad',
            }),
            'direccion': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'direccion',
            }),
            'telefono': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'telefono',
            }),
        }

class ProductoForm(forms.ModelForm):
    class Meta:
        model = Producto
        fields = ['nombre', 'categoria', 'marca', 'unidad']
        labels = {
            'nombre': 'Nombre del producto',
            'categoria': 'Categoría',
            'marca': 'Marca/Especie',
            'unidad': 'Unidad'
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre_producto',
            }),
            'categoria': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'categoria_producto',
            }),
            'marca': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'marca_producto',
            }),
            'unidad': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'unidad_producto',
            })
        }

class ProductoModificarForm(forms.ModelForm):
    class Meta:
        model = Producto
        fields = ['nombre', 'categoria', 'marca', 'unidad']
        labels = {
            'nombre': 'Nombre del producto',
            'categoria': 'Categoría',
            'marca': 'Marca',
            'unidad': 'Unidad'
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre_modificar',  # distinto ID
            }),
            'categoria': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'categoria_modificar',
            }),
            'marca': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'marca_modificar',
            }),
            'unidad': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'unidad_modificar',
            })
        }
      
class InventarioForm(forms.ModelForm):
    class Meta:
        model = Stock
        fields = ['producto', 'cantidad', 'precio']
        labels = {
            'producto': 'Producto',
            'cantidad': 'Cantidad',
            'precio': 'Precio'
        }
        widgets = {
            'producto': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'producto',
            }),
            'cantidad': forms.NumberInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'cantidad',
            }),
            'precio': forms.NumberInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'precio',
            }),
        }
        
class ModificarPrecioForm(forms.ModelForm):
    class Meta:
        model = Stock
        fields = ['producto', 'precio']
        labels = {
            'producto': 'Producto',
            'precio': 'Precio'
        }
        widgets = {
            'producto': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'producto',
            }),
            'precio': forms.NumberInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'precio',
            }),
        }
        
class ModificarCantidadForm(forms.ModelForm):
    class Meta:
        model = Stock
        fields = ['producto', 'cantidad']
        labels = {
            'producto': 'Producto',
            'cantidad': 'Cantidad'
        }
        widgets = {
            'producto': forms.Select(attrs={
                'class': 'w-full block select select-accent',
                'required': True,
                'id': 'nombre-producto-modificar',
            }),
            'cantidad': forms.NumberInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'cantidad-modificar',
            }),
        }
        
class MetodoPagoForm(forms.ModelForm):
    class Meta:
        model = MetodoPago
        fields = ['nombre']
        labels = {
            'nombre': 'Nombre del método de pago',
        }
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'w-full block input input-accent',
                'autocomplete': 'off',
                'required': True,
                'id': 'nombre_metodo_pago',
            }),
        }