"""
Utilidades para el módulo de emails
"""

from typing import Any, Dict


def format_email_context(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Formatea el contexto para los templates de email

    Args:
        context: Diccionario con datos del contexto

    Returns:
        Diccionario formateado
    """
    return {"site_name": "El Edén", "site_url": "http://localhost:3000", **context}


def validate_email_params(**kwargs) -> bool:
    """
    Valida que los parámetros requeridos para un email estén presentes

    Args:
        **kwargs: Parámetros a validar

    Returns:
        True si todos los parámetros requeridos están presentes
    """
    required_params = ["user_email", "user_name"]

    for param in required_params:
        if param not in kwargs or not kwargs[param]:
            return False

    return True
