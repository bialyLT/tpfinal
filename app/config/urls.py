from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from app.core import views  # Import the register view


paises_patterns = [
    path('', views.paises, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_pais, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_pais, name='eliminar'),
]

provincias_patterns = [
    path('', views.provincias, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_provincia, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_provincia, name='eliminar'),
]

localidades_patterns = [
    path('', views.localidades, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_localidad, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_localidad, name='eliminar'),
]

categorias_patterns = [
    path('', views.categorias, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_categoria, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_categoria, name='eliminar'),
]

marcas_patterns = [
    path('', views.marcas, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_marca, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_marca, name='eliminar'),
]

unidades_patterns = [
    path('', views.unidades, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_unidad, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_unidad, name='eliminar'),
]

tipos_documento_patterns = [
    path('', views.tipos_documento, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_tipo_documento, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_tipo_documento, name='eliminar'),
]

empleados_patterns = [
    path('', views.empleados, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_empleado, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_empleado, name='eliminar'),
    path('obtener/<int:id>/', views.obtener_empleado, name='obtener'),
]

productos_patterns = [
    path('', views.productos, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_producto, name='modificar'),
    path('eliminar/<int:id>/', views.eliminar_producto, name='eliminar'),
    path('obtener/<int:id>/', views.obtener_producto, name='obtener_producto'),
]

inventario_patterns = [
    path('', views.inventario, name='index'),  # Listar y crear
    path('modificar/<int:id>/', views.modificar_inventario, name='modificar'),
    path('obtener/<int:id>/', views.obtener_stock, name='obtener_stock')
]

dashboard_patterns = [
    path('', views.dashboard, name='dashboard'),
    path('paises/', include((paises_patterns, 'paises'), namespace='paises')),
    path('provincias/', include((provincias_patterns, 'provincias'), namespace='provincias')),
    path('localidades/', include((localidades_patterns, 'localidades'), namespace='localidades')),
    path('categorias/', include((categorias_patterns, 'categorias'), namespace='categorias')),
    path('marcas/', include((marcas_patterns, 'marcas'), namespace='marcas')),
    path('unidades/', include((unidades_patterns, 'unidades'), namespace='unidades')),
    path('tipos_documento/', include((tipos_documento_patterns, 'tipos_documento'), namespace='tipos_documento')),
    path('empleados/', include((empleados_patterns, 'empleados'), namespace='empleados')),
    path('productos/', include((productos_patterns, 'productos'), namespace='productos')),
    path('inventario/', include((inventario_patterns, 'inventario'), namespace='inventario')),
]



urlpatterns = [
    # path('register/', views.register, name='register'),
    # path('servicios/', views.servicios, name='servicios'),
    path('', views.home, name='home'),  # Define una vista específica para la raíz
    path('admin/', admin.site.urls),
    path('login/', views.CustomLoginView.as_view(), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('dashboard/', include((dashboard_patterns, 'dashboard'), namespace='dashboard')),
]

