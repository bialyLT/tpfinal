from django.test import TestCase
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import (
    Persona, Usuario, Rol, Pago, DetallePago, 
    MetodoPago, HistorialAcceso, ConfiguracionUsuario
)


class PersonaModelTest(TestCase):
    def setUp(self):
        self.persona = Persona.objects.create(
            nombres="Juan Carlos",
            apellidos="Pérez García",
            tipo_documento="dni",
            numero_documento="12345678",
            telefono="+541123456789",
            ciudad="Buenos Aires"
        )

    def test_persona_creation(self):
        self.assertEqual(self.persona.nombres, "Juan Carlos")
        self.assertEqual(self.persona.nombre_completo, "Juan Carlos Pérez García")
        self.assertTrue(self.persona.activo)

    def test_persona_str(self):
        self.assertEqual(str(self.persona), "Pérez García, Juan Carlos")


class UsuarioModelTest(TestCase):
    def setUp(self):
        self.persona = Persona.objects.create(
            nombres="Ana María",
            apellidos="López Silva",
            tipo_documento="dni",
            numero_documento="87654321"
        )
        
        self.grupo = Group.objects.create(name="Vendedor")
        self.rol = Rol.objects.create(
            grupo=self.grupo,
            descripcion="Rol de vendedor",
            nivel_acceso=3
        )
        
        self.usuario = Usuario.objects.create_user(
            username="alopez",
            email="ana@ejemplo.com",
            password="password123",
            persona=self.persona
        )
        self.usuario.roles.add(self.rol)

    def test_usuario_creation(self):
        self.assertEqual(self.usuario.username, "alopez")
        self.assertEqual(self.usuario.nombre_completo, "Ana María López Silva")
        self.assertTrue(self.usuario.puede_acceder)

    def test_usuario_roles(self):
        self.assertIn("Vendedor", self.usuario.roles_nombres)
        self.assertFalse(self.usuario.es_administrador)

    def test_intentos_fallidos(self):
        initial_attempts = self.usuario.intentos_fallidos_login
        self.usuario.agregar_intento_fallido()
        self.assertEqual(self.usuario.intentos_fallidos_login, initial_attempts + 1)


class MetodoPagoModelTest(TestCase):
    def setUp(self):
        self.metodo_pago = MetodoPago.objects.create(
            nombre="Tarjeta de Crédito",
            tipo="tarjeta_credito",
            comision_porcentaje=Decimal('3.5'),
            comision_fija=Decimal('2.50')
        )

    def test_metodo_pago_creation(self):
        self.assertEqual(self.metodo_pago.nombre, "Tarjeta de Crédito")
        self.assertTrue(self.metodo_pago.activo)

    def test_calculo_comision(self):
        monto = Decimal('100.00')
        comision = self.metodo_pago.calcular_comision(monto)
        expected = Decimal('3.50') + Decimal('2.50')  # 3.5% + $2.50
        self.assertEqual(comision, expected)


class PagoModelTest(TestCase):
    def setUp(self):
        self.persona = Persona.objects.create(
            nombres="Carlos",
            apellidos="Rodríguez",
            tipo_documento="dni",
            numero_documento="11223344"
        )
        
        self.usuario = Usuario.objects.create_user(
            username="crodriguez",
            email="carlos@ejemplo.com",
            password="password123",
            persona=self.persona
        )
        
        self.metodo_pago = MetodoPago.objects.create(
            nombre="Efectivo",
            tipo="efectivo",
            comision_porcentaje=Decimal('0'),
            comision_fija=Decimal('0')
        )
        
        self.pago = Pago.objects.create(
            usuario=self.usuario,
            metodo_pago=self.metodo_pago,
            monto=Decimal('150.00'),
            tipo_transaccion='compra'
        )

    def test_pago_creation(self):
        self.assertIsNotNone(self.pago.numero_transaccion)
        self.assertEqual(self.pago.monto_neto, Decimal('150.00'))
        self.assertEqual(self.pago.estado, 'pendiente')

    def test_completar_pago(self):
        self.pago.marcar_como_completado()
        self.assertEqual(self.pago.estado, 'completado')
        self.assertIsNotNone(self.pago.fecha_completado)

    def test_cancelar_pago(self):
        self.pago.cancelar("Cancelado por el usuario")
        self.assertEqual(self.pago.estado, 'cancelado')
        self.assertIn("Cancelado", self.pago.observaciones)
