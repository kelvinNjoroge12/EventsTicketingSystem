from __future__ import annotations

import math

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StrathmoreUniversityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(self.page.paginator.count / page_size) if page_size else 1
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "total_pages": total_pages,
                "results": data,
            }
        )

