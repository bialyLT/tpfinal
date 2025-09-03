from django.contrib import messages
from django.forms import ValidationError
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.shortcuts import redirect
from django.contrib.auth.views import LoginView
from django.urls import reverse_lazy
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User  
from app.core.models import Categoria, Empleado, Localidad, Marca, Pais, Producto, Provincia, Stock, TipoDocumento, Unidad, MetodoPago
from app.data.forms import CategoriaForm, EmpleadoForm, InventarioForm, LocalidadForm, MarcaForm, ModificarCantidadForm, ModificarPrecioForm, PaisForm, ProductoForm, ProductoModificarForm, ProvinciaForm, TipoDocumentoForm, UnidadForm, UserForm, MetodoPagoForm
from django.contrib.auth.decorators import user_passes_test

def is_admin(user):
    return user.groups.filter(name='empleado_administrador').exists()
class CustomLoginView(LoginView):
    template_name = 'registration/login.html'

    def get_success_url(self):
        user = self.request.user
        print(user)
        if hasattr(user, 'rol') and user.rol == 'empleado_administrador':
            return reverse_lazy('dashboard')
        return super().get_success_url()

@login_required
def dashboard(request):
    if request.user.is_authenticated:
        return render(request, 'dashboard/index.html')
    else:
        return redirect('login')

@login_required
def home(request):
    return render(request, 'inicio/index.html')

# def register(request):
#     if request.method == 'POST':
#         form = UserCreationForm(request.POST)
#         if form.is_valid():
#             user = form.save()
#             grupo = Group.objects.get(name='clientes')
#             user.groups.add(grupo)
#             login(request, user)
#             return redirect('/')
#     else:
#         form = UserCreationForm()
#     return render(request, 'registration/register.html', {'form': form})

def productos(request):
    return render(request, 'productos/productos.html')

def servicios(request):
    return render(request, 'servicios/servicios.html')


# Rutas del panel de control

# Vistas para paises
@login_required
def paises(request):
    paises = Pais.objects.all()
    form = PaisForm()
    if request.method == 'POST':
        form = PaisForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'País creado exitosamente')
            return redirect('dashboard:paises:index')
    else:
        form = PaisForm()

    return render(request, 'dashboard/parametros/ubicacion/paises.html', {'paises': paises, 'form': form})

@login_required
def modificar_pais(request, id):
    pais = get_object_or_404(Pais, id=id)
    
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        pais.nombre = nombre
        try:
            pais.save()
            messages.success(request, 'País modificado exitosamente')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('dashboard:paises:index')
        except ValidationError as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'errors': list(e.messages)})
            messages.error(request, 'Error al modificar el país')
    
    return redirect('dashboard:paises:index')

@login_required
@user_passes_test(is_admin)
def eliminar_pais(request, id):
    pais = get_object_or_404(Pais, id=id)
    
    if request.method == 'POST':
        pais.delete()
        messages.success(request, 'País eliminado exitosamente')
        return redirect('dashboard:paises:index')
    
    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': pais.id,
        'nombre': pais.nombre
    })
    
# Vistas para provincias
@login_required
def provincias(request):
    paises = Pais.objects.all()
    provincias = Provincia.objects.all()
    form = ProvinciaForm()
    if request.method == 'POST':
        form = ProvinciaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:provincias:index')
    else:
        form = ProvinciaForm()
    return render(request, 'dashboard/parametros/ubicacion/provincias.html', {'provincias': provincias, 'form': form, 'paises': paises})

@login_required
def modificar_provincia(request, id):
    provincia = get_object_or_404(Provincia, id=id)

    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        pais_id = request.POST.get('pais')
        provincia.nombre = nombre
        provincia.pais = get_object_or_404(Pais, id=pais_id)
        try:
            provincia.save()
            messages.success(request, 'Provincia modificada exitosamente')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('dashboard:provincias:index')
        except ValidationError as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'errors': list(e.messages)})
            messages.error(request, 'Error al modificar la provincia')

    return redirect('dashboard:provincias:index')

@login_required
@user_passes_test(is_admin)
def eliminar_provincia(request, id):
    provincia = get_object_or_404(Provincia, id=id)
    if request.method == 'POST':
        provincia.delete()
        messages.success(request, 'Provincia eliminada exitosamente')
        return redirect('dashboard:provincias:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': provincia.id,
        'nombre': provincia.nombre
    })
    
# Vistas para localidades
@login_required
def localidades(request):
    provincias = Provincia.objects.all()
    localidades = Localidad.objects.all()
    form = LocalidadForm()
    if request.method == 'POST':
        form = LocalidadForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:localidades:index')
    else:
        form = LocalidadForm()
    return render(request, 'dashboard/parametros/ubicacion/localidades.html', {'localidades': localidades, 'form': form, 'provincias': provincias})

@login_required
def modificar_localidad(request, id):
    localidad = get_object_or_404(Localidad, id=id)
    form = LocalidadForm(instance=localidad)
    if request.method == 'POST':
        nombre = request.POST.get('nombre')
        provincia_id = request.POST.get('provincia')
        localidad.nombre = nombre
        localidad.provincia = get_object_or_404(Provincia, id=provincia_id)
        try:
            localidad.save()
            messages.success(request, 'Localidad modificada exitosamente')
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('dashboard:localidades:index')
        except ValidationError as e:
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'errors': list(e.messages)})
            messages.error(request, 'Error al modificar la localidad')

    return redirect('dashboard:localidades:index')

@login_required
@user_passes_test(is_admin)
def eliminar_localidad(request, id):
    localidad = get_object_or_404(Localidad, id=id)
    if request.method == 'POST':
        localidad.delete()
        messages.success(request, 'Localidad eliminada exitosamente')
        return redirect('dashboard:localidades:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': localidad.id,
        'nombre': localidad.nombre
    })

# Vistas para categorias
@login_required
def categorias(request):
    categorias = Categoria.objects.all()
    form = CategoriaForm()
    if request.method == 'POST':
        form = CategoriaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:categorias:index')
    else:
        form = CategoriaForm()
    return render(request, 'dashboard/parametros/productos/categorias.html', {'categorias': categorias, 'form': form})

@login_required
def modificar_categoria(request, id):
    categoria = get_object_or_404(Categoria, id=id)
    if request.method == 'POST':
        form = CategoriaForm(request.POST, instance=categoria)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Categoría modificada exitosamente')
            return redirect('dashboard:categorias:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devuelve los errores como lista de strings
                errors = [error for field in form.errors.values() for error in field]
                return JsonResponse({'success': False, 'errors': errors})
    else:
        form = CategoriaForm(instance=categoria)
    return render(request, 'dashboard/parametros/productos/modificar_categoria.html', {'form': form})

@login_required
@user_passes_test(is_admin)
def eliminar_categoria(request, id):
    categoria = get_object_or_404(Categoria, id=id)
    if request.method == 'POST':
        categoria.delete()
        messages.success(request, 'Categoría eliminada exitosamente')
        return redirect('dashboard:categorias:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': categoria.id,
        'nombre': categoria.nombre
    })

# Vistas para marcas
@login_required
def marcas(request):
    marcas = Marca.objects.all()
    form = MarcaForm()
    if request.method == 'POST':
        form = MarcaForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:marcas:index')
    else:
        form = MarcaForm()
    return render(request, 'dashboard/parametros/productos/marcas.html', {'marcas': marcas, 'form': form})

@login_required
def modificar_marca(request, id):
    marca = get_object_or_404(Marca, id=id)
    if request.method == 'POST':
        form = MarcaForm(request.POST, instance=marca)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Marca modificada exitosamente')
            return redirect('dashboard:marcas:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devuelve los errores como lista de strings
                errors = [error for field in form.errors.values() for error in field]
                return JsonResponse({'success': False, 'errors': errors})
    else:
        form = MarcaForm(instance=marca)
    return render(request, 'dashboard/parametros/productos/modificar_marca.html', {'form': form})

@login_required
@user_passes_test(is_admin)
def eliminar_marca(request, id):
    marca = get_object_or_404(Marca, id=id)
    if request.method == 'POST':
        marca.delete()
        messages.success(request, 'Marca eliminada exitosamente')
        return redirect('dashboard:marcas:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': marca.id,
        'nombre': marca.nombre
    })


# Vistas para unidades
@login_required
def unidades(request):
    unidades = Unidad.objects.all()
    form = UnidadForm()
    if request.method == 'POST':
        form = UnidadForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:unidades:index')
    else:
        form = UnidadForm()
    return render(request, 'dashboard/parametros/productos/unidades.html', {'unidades': unidades, 'form': form})

@login_required
def modificar_unidad(request, id):
    unidad = get_object_or_404(Unidad, id=id)
    if request.method == 'POST':
        form = UnidadForm(request.POST, instance=unidad)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Unidad modificada exitosamente')
            return redirect('dashboard:unidades:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devuelve los errores como lista de strings
                errors = [error for field in form.errors.values() for error in field]
                return JsonResponse({'success': False, 'errors': errors})
    else:
        form = UnidadForm(instance=unidad)
    return render(request, 'dashboard/parametros/productos/modificar_unidad.html', {'form': form})

@login_required
@user_passes_test(is_admin)
def eliminar_unidad(request, id):
    unidad = get_object_or_404(Unidad, id=id)
    if request.method == 'POST':
        unidad.delete()
        messages.success(request, 'Unidad eliminada exitosamente')
        return redirect('dashboard:unidades:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': unidad.id,
        'nombre': unidad.nombre
    })

# Vistas para tipos de documento
@login_required
def tipos_documento(request):
    tipos_documento = TipoDocumento.objects.all()
    form = TipoDocumentoForm()
    if request.method == 'POST':
        form = TipoDocumentoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:tipos_documento:index')
    else:
        form = TipoDocumentoForm()
    return render(request, 'dashboard/parametros/otros/tipos_documento.html', {'tipos_documento': tipos_documento, 'form': form})

@login_required
def modificar_tipo_documento(request, id):
    tipo_documento = get_object_or_404(TipoDocumento, id=id)
    if request.method == 'POST':
        form = TipoDocumentoForm(request.POST, instance=tipo_documento)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Tipo de documento modificado exitosamente')
            return redirect('dashboard:tipos_documento:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devuelve los errores como lista de strings
                errors = [error for field in form.errors.values() for error in field]
                return JsonResponse({'success': False, 'errors': errors})
    else:
        form = TipoDocumentoForm(instance=tipo_documento)
    return render(request, 'dashboard/parametros/identificacion/modificar_tipo_documento.html', {'form': form})

@login_required
@user_passes_test(is_admin)
def eliminar_tipo_documento(request, id):
    tipo_documento = get_object_or_404(TipoDocumento, id=id)
    if request.method == 'POST':
        tipo_documento.delete()
        messages.success(request, 'Tipo de documento eliminado exitosamente')
        return redirect('dashboard:tipos_documento:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': tipo_documento.id,
        'nombre': tipo_documento.nombre
    })

# Vistas para metodos de pago
@login_required
def metodos_pago(request):
    metodos_pago = MetodoPago.objects.all()
    form = MetodoPagoForm()
    if request.method == 'POST':
        form = MetodoPagoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:metodos_pago:index')
    else:
        form = MetodoPagoForm()
    return render(request, 'dashboard/parametros/otros/metodos_pago.html', {'metodos_pago': metodos_pago, 'form': form})

@login_required
def modificar_metodo_pago(request, id):
    metodo_pago = get_object_or_404(MetodoPago, id=id)
    if request.method == 'POST':
        form = MetodoPagoForm(request.POST, instance=metodo_pago)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            messages.success(request, 'Método de pago modificado exitosamente')
            return redirect('dashboard:metodos_pago:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devuelve los errores como lista de strings
                errors = [error for field in form.errors.values() for error in field]
                return JsonResponse({'success': False, 'errors': errors})
    else:
        form = MetodoPagoForm(instance=metodo_pago)
    return render(request, 'dashboard/parametros/otros/modificar_metodo_pago.html', {'form': form})

@login_required
@user_passes_test(is_admin)
def eliminar_metodo_pago(request, id):
    metodo_pago = get_object_or_404(MetodoPago, id=id)
    if request.method == 'POST':
        metodo_pago.delete()
        messages.success(request, 'Método de pago eliminado exitosamente')
        return redirect('dashboard:metodos_pago:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': metodo_pago.id,
        'nombre': metodo_pago.nombre
    })

# Vistas para empleados
@login_required
@user_passes_test(is_admin)
def empleados(request):
    empleados = Empleado.objects.all()

    if request.method == 'POST':
        user_form_crear = UserForm(request.POST)
        empleado_form_crear = EmpleadoForm(request.POST)

        if user_form_crear.is_valid() and empleado_form_crear.is_valid():
            user = user_form_crear.save(commit=False)
            user.set_password(user_form_crear.cleaned_data['password'])
            user.save()
            grupo = user_form_crear.cleaned_data['grupo']
            user.groups.add(grupo)

            empleado = empleado_form_crear.save(commit=False)
            empleado.user = user
            empleado.save()

            return redirect('dashboard:empleados:index')
    else:
        user_form_crear = UserForm()
        user_form_modificar = UserForm()
        empleado_form_crear = EmpleadoForm()
        empleado_form_modificar = EmpleadoForm()

    return render(request, 'dashboard/empleados.html', {
        'user_form_crear': user_form_crear,
        'user_form_modificar': user_form_modificar,
        'empleado_form_crear': empleado_form_crear,
        'empleado_form_modificar': empleado_form_modificar,
        'empleados': empleados
    })

@login_required
@user_passes_test(is_admin)
def modificar_empleado(request, id):
    usuario = get_object_or_404(User, id=id)
    empleado = get_object_or_404(Empleado, user=usuario)

    if request.method == 'POST':
        user_form = UserForm(request.POST, instance=usuario)
        empleado_form = EmpleadoForm(request.POST, instance=empleado)

        if user_form.is_valid() and empleado_form.is_valid():
            user = user_form.save()
            empleado_form.save()

            grupo = user_form.cleaned_data.get('grupo')
            if grupo:
                user.groups.clear()
                user.groups.add(grupo)

            return JsonResponse({'success': True})
        else:
            errors = (
                list(user_form.errors.values()) +
                list(empleado_form.errors.values())
            )
            flat_errors = [str(e[0]) if isinstance(e, list) else str(e) for e in errors]
            return JsonResponse({'success': False, 'errors': flat_errors})

    # Para GET, si querés permitirlo (opcional)
    return JsonResponse({'error': 'Método no permitido'}, status=405)

@login_required
@user_passes_test(is_admin)
def obtener_empleado(request, id):
    empleado = get_object_or_404(Empleado, id=id)
    user = empleado.user

    data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'grupo': user.groups.first().id if user.groups.exists() else None,
        'nombre': empleado.user.first_name,
        'apellido': empleado.user.last_name,
        'dni': empleado.dni,
        'direccion': empleado.direccion,
        'telefono': empleado.telefono,
        'localidad': empleado.localidad.nombre if empleado.localidad else None,
        'tipo_documento': empleado.tipo_documento.nombre if empleado.tipo_documento else None,
    }
    return JsonResponse(data)

@login_required
@user_passes_test(is_admin)
def eliminar_empleado(request, id):
    empleado = get_object_or_404(Empleado, id=id)
    if request.method == 'POST':
        empleado.delete()
        messages.success(request, 'Empleado eliminado exitosamente')
        return redirect('dashboard:empleados:index')

    # Retornamos JSON para el modal de confirmación
    return JsonResponse({
        'id': empleado.id,
        'nombre': empleado.user.first_name,
        'apellido': empleado.user.last_name
    })

# Vistas para productos
@login_required
def productos(request):
    productos = Producto.objects.all()
    form = ProductoForm()
    form_modificar = ProductoModificarForm() 
    if request.method == 'POST':
        form = ProductoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:productos:index')
    else:
        form = ProductoForm()
    return render(request, 'dashboard/productos.html', {'productos': productos, 'form': form, 'form_modificar': form_modificar})

@login_required
def modificar_producto(request, id):
    producto = get_object_or_404(Producto, id=id)

    if request.method == 'POST':
        form = ProductoForm(request.POST, instance=producto)
        if form.is_valid():
            form.save()
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                return JsonResponse({'success': True})
            return redirect('dashboard:productos:index')
        else:
            if request.headers.get('x-requested-with') == 'XMLHttpRequest':
                # Devolver errores en JSON
                errores = []
                for field in form.errors:
                    for error in form.errors[field]:
                        errores.append(f"{field}: {error}")
                return JsonResponse({'success': False, 'errors': errores})
    else:
        form = ProductoForm(instance=producto)

    return render(request, 'dashboard/productos.html', {'form': form})

@login_required
def obtener_producto(request, id):
    producto = get_object_or_404(Producto, id=id)
    data = {
        'id': producto.id,
        'nombre': producto.nombre,
        'categoria': producto.categoria.id,
        'marca': producto.marca.id,
        'unidad': producto.unidad.id,
    }
    return JsonResponse(data)

@login_required
@user_passes_test(is_admin)
def eliminar_producto(request, id):
    producto = get_object_or_404(Producto, id=id)

    if request.method == 'POST':
        producto.delete()
        return redirect('dashboard:productos:index')

    # Si la petición es AJAX (GET) para cargar el modal
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        return JsonResponse({
            'id': producto.id,
            'nombre': producto.nombre
        })

    # Si no es AJAX, redirigir o mostrar algo por defecto
    return render(request, 'dashboard/productos.html', {'producto': producto})

# Vistas para inventario
@login_required
def inventario(request):
    stock = Stock.objects.all()
    producto = Producto.objects.all()
    form = InventarioForm()
    modificar_precio_form = ModificarPrecioForm()
    modificar_cantidad_form = ModificarCantidadForm()
    if request.method == 'POST':
        form = InventarioForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('dashboard:inventario:index')
    else:
        form = InventarioForm()
    return render(request, 'dashboard/inventario.html', {'stock': stock, 'producto': producto, 'form': form, 'modificar_precio_form': modificar_precio_form, 'modificar_cantidad_form': modificar_cantidad_form})   

@login_required
def modificar_inventario(request, id):
    stock = get_object_or_404(Stock, id=id)
    
    if request.method == 'POST':
        try:
            nueva_cantidad = int(request.POST.get('cantidad'))
            stock.cantidad = nueva_cantidad
            stock.save()
            return redirect('dashboard:inventario:index')
        except Exception as e:
            return JsonResponse({'success': False, 'errors': ['Error al modificar la cantidad.']})

    return JsonResponse({'success': False, 'errors': ['Método no permitido']})

@login_required
def obtener_stock(request, id):
    stock = get_object_or_404(Stock, id=id)
    data = {
        'producto': stock.producto.nombre,
        'cantidad': stock.cantidad
    }
    return JsonResponse(data)