from django.test import TestCase

from .models import Categoria, Marca, Producto, Stock


class CategoriaModelTest(TestCase):
    def test_categoria_str(self):
        categoria = Categoria.objects.create(nombre_categoria="Electrónicos", descripcion="Productos varios")
        self.assertEqual(str(categoria), "Electrónicos")


class ProductoStockModelTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre_categoria="Electrónicos")
        self.marca = Marca.objects.create(nombre_marca="Samsung")
        self.producto = Producto.objects.create(
            nombre="Smartphone",
            categoria=self.categoria,
            marca=self.marca,
            descripcion="Producto de prueba",
        )

    def test_producto_str(self):
        self.assertEqual(str(self.producto), "Smartphone - Samsung")

    def test_stock_actual_property(self):
        Stock.objects.create(producto=self.producto, cantidad=10)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock_actual, 10)
