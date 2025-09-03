from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth.models import User


API_PREFIX = "/api/v1"


class AuthViewsTests(APITestCase):
    def setUp(self):
        self.register_url = f"{API_PREFIX}/auth/register/"
        self.login_url = f"{API_PREFIX}/auth/login/"
        self.refresh_url = f"{API_PREFIX}/auth/token/refresh/"
        self.user_url = f"{API_PREFIX}/auth/user/"
        self.logout_url = f"{API_PREFIX}/auth/logout/"

        self.valid_payload = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
            "first_name": "Test",
            "last_name": "User",
            # Campos opcionales tolerados por el serializer público
            "telefono": "+54 9 11 1234-5678",
            "direccion": "Calle Falsa 123",
        }

    def test_register_success_returns_tokens_and_user(self):
        res = self.client.post(self.register_url, self.valid_payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)
        self.assertIn("user", res.data)
        self.assertEqual(res.data["user"]["username"], self.valid_payload["username"]) 
        # Usuario creado en DB
        self.assertTrue(User.objects.filter(username=self.valid_payload["username"]).exists())

    def test_register_password_mismatch_returns_400(self):
        payload = {**self.valid_payload, "password2": "otra"}
        res = self.client.post(self.register_url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", res.data)

    def test_login_then_profile_and_refresh_and_logout(self):
        # Registrar primero
        res_reg = self.client.post(self.register_url, self.valid_payload, format="json")
        self.assertEqual(res_reg.status_code, status.HTTP_201_CREATED, res_reg.data)
        access = res_reg.data["access"]
        refresh = res_reg.data["refresh"]

        # Perfil con access
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        res_user = self.client.get(self.user_url)
        self.assertEqual(res_user.status_code, status.HTTP_200_OK, res_user.data)
        self.assertEqual(res_user.data["username"], self.valid_payload["username"]) 

        # Refresh
        self.client.credentials()  # limpiar
        res_refresh = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(res_refresh.status_code, status.HTTP_200_OK, res_refresh.data)
        self.assertIn("access", res_refresh.data)
        new_access = res_refresh.data["access"]
        # El refresh endpoint también debería devolver un nuevo refresh token
        new_refresh = res_refresh.data.get("refresh", refresh)

        # Logout (blacklist refresh)
        # Para requerir auth en logout, enviamos header + refresh en body
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {new_access}")
        res_logout = self.client.post(self.logout_url, {"refresh": new_refresh}, format="json")
        self.assertEqual(res_logout.status_code, status.HTTP_200_OK, res_logout.data)
