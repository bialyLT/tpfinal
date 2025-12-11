from django.contrib.auth.models import User
from django.test import Client, TestCase

from apps.servicios.models import FormaTerreno


class FormaTerrenoAPITests(TestCase):
    def setUp(self):
        self.client = Client(HTTP_HOST="localhost")
        # Ensure at least one FormaTerreno exists
        FormaTerreno.objects.all().delete()
        FormaTerreno.objects.create(nombre="Rectangular")

    def test_get_formas_terreno_anonymous_ok(self):
        response = self.client.get("/api/v1/servicios/formas-terreno/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.json()) >= 1)

    def test_post_forma_terreno_non_admin_forbidden(self):
        # Anonymous -> 401 unauthorized
        response = self.client.post("/api/v1/servicios/formas-terreno/", {"nombre": "Nueva"})
        self.assertIn(response.status_code, (401, 403))

        # Create a regular user and login
        User.objects.create_user(username="user_test", password="testpass")
        self.client.login(username="user_test", password="testpass")
        response2 = self.client.post("/api/v1/servicios/formas-terreno/", {"nombre": "Otra"})
        # Authenticated non-admin -> 403 forbidden
        self.assertEqual(response2.status_code, 403)

    def test_post_forma_terreno_admin_allowed(self):
        User.objects.create_superuser(username="admin_test", email="admin@example.com", password="adminpass")
        self.client.login(username="admin_test", password="adminpass")
        response = self.client.post("/api/v1/servicios/formas-terreno/", {"nombre": "AdminInsert"})
        # Admin can create -> 201
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data.get("nombre"), "AdminInsert")
