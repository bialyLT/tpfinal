"""
Clases de paginación personalizadas para la app de servicios
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Paginación estándar para listas de servicios y diseños.

    Parámetros de query:
    - page: número de página (default: 1)
    - page_size: cantidad de items por página (default: 10, max: 100)

    Ejemplo: /api/v1/servicios/servicios/?page=2&page_size=20
    """

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        """
        Formato de respuesta personalizado con información útil para el frontend
        """
        return Response(
            {
                "count": self.page.paginator.count,  # Total de items
                "total_pages": self.page.paginator.num_pages,  # Total de páginas
                "current_page": self.page.number,  # Página actual
                "page_size": self.page.paginator.per_page,  # Items por página
                "next": self.get_next_link(),  # URL de siguiente página
                "previous": self.get_previous_link(),  # URL de página anterior
                "results": data,  # Los datos
            }
        )


class LargeResultsSetPagination(PageNumberPagination):
    """
    Paginación para listas grandes (ej: catálogo completo de productos)
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.page.paginator.per_page,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )


class SmallResultsSetPagination(PageNumberPagination):
    """
    Paginación para listas pequeñas (ej: mis reservas)
    """

    page_size = 5
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "page_size": self.page.paginator.per_page,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
