from django.test import TestCase
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import Categoria, Marca, Unidad, Producto, Stock, MovimientoStock


class CategoriaModelTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(
            nombre="Electrónicos",
            descripcion="Productos electrónicos diversos"
        )

    def test_categoria_creation(self):
        self.assertEqual(self.categoria.nombre, "Electrónicos")
        self.assertTrue(self.categoria.activo)
        self.assertIsNotNone(self.categoria.fecha_creacion)

    def test_categoria_str(self):
        self.assertEqual(str(self.categoria), "Electrónicos")


class ProductoModelTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre="Electrónicos")
        self.marca = Marca.objects.create(nombre="Samsung")
        self.unidad = Unidad.objects.create(nombre="Unidad", abreviatura="UN")
        
        self.producto = Producto.objects.create(
            codigo="PROD001",
            nombre="Smartphone",
            categoria=self.categoria,
            marca=self.marca,
            unidad=self.unidad,
            precio_compra=Decimal('500.00'),
            precio_venta=Decimal('700.00')
        )

    def test_producto_creation(self):
        self.assertEqual(self.producto.codigo, "PROD001")
        self.assertEqual(self.producto.margen_ganancia, 40.0)

    def test_precio_venta_menor_compra(self):
        self.producto.precio_venta = Decimal('400.00')
        with self.assertRaises(ValidationError):
            self.producto.full_clean()


class StockModelTest(TestCase):
    def setUp(self):
        categoria = Categoria.objects.create(nombre="Electrónicos")
        marca = Marca.objects.create(nombre="Samsung")
        unidad = Unidad.objects.create(nombre="Unidad", abreviatura="UN")
        
        self.producto = Producto.objects.create(
            codigo="PROD001",
            nombre="Smartphone",
            categoria=categoria,
            marca=marca,
            unidad=unidad,
            precio_compra=Decimal('500.00'),
            precio_venta=Decimal('700.00')
        )
        
        self.stock = Stock.objects.create(
            producto=self.producto,
            cantidad_actual=Decimal('10.000'),
            cantidad_minima=Decimal('5.000')
        )

    def test_stock_creation(self):
        self.assertEqual(self.stock.cantidad_actual, Decimal('10.000'))
        self.assertFalse(self.stock.necesita_reposicion)

    def test_stock_critico(self):
        self.stock.cantidad_actual = Decimal('3.000')
        self.stock.save()
        self.assertTrue(self.stock.necesita_reposicion)
        self.assertEqual(self.stock.estado_stock, 'critico')


class MovimientoStockModelTest(TestCase):
    def setUp(self):
        categoria = Categoria.objects.create(nombre="Electrónicos")
        marca = Marca.objects.create(nombre="Samsung")
        unidad = Unidad.objects.create(nombre="Unidad", abreviatura="UN")
        
        self.producto = Producto.objects.create(
            codigo="PROD001",
            nombre="Smartphone",
            categoria=categoria,
            marca=marca,
            unidad=unidad,
            precio_compra=Decimal('500.00'),
            precio_venta=Decimal('700.00')
        )
        
        self.stock = Stock.objects.create(
            producto=self.producto,
            cantidad_actual=Decimal('10.000'),
            cantidad_minima=Decimal('5.000')
        )

    def test_movimiento_entrada(self):
        movimiento = MovimientoStock.objects.create(
            producto=self.producto,
            tipo='entrada',
            motivo='compra',
            cantidad=Decimal('5.000')
        )
        
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad_actual, Decimal('15.000'))
        self.assertEqual(movimiento.stock_anterior, Decimal('10.000'))
        self.assertEqual(movimiento.stock_posterior, Decimal('15.000'))

    def test_movimiento_salida(self):
        movimiento = MovimientoStock.objects.create(
            producto=self.producto,
            tipo='salida',
            motivo='venta',
            cantidad=Decimal('3.000')
        )
        
        self.stock.refresh_from_db()
        self.assertEqual(self.stock.cantidad_actual, Decimal('7.000'))
        self.assertEqual(movimiento.stock_anterior, Decimal('10.000'))
        self.assertEqual(movimiento.stock_posterior, Decimal('7.000'))
