from django.test import SimpleTestCase
from django.urls import resolve, reverse
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ArchiveExportView,
    ChangePasswordView,
    DashboardSummaryView,
    DriverLeaveViewSet,
    DriverProfileViewSet,
    EmployeeInsightView,
    ERPSettingView,
    ForgotPasswordView,
    FuelEntryViewSet,
    FuelMergedView,
    HealthCheckView,
    LoginView,
    MeView,
    PayrollEntryViewSet,
    PayrollOverviewView,
    PDFExportView,
    RegisterView,
    RouteDistanceUploadView,
    RouteDistanceViewSet,
    ServiceRepairViewSet,
    TripSearchView,
    TripViewSet,
    UserCountView,
    UserPreferenceView,
    VehicleViewSet,
)

APP_NAMESPACE = None


def ns(name: str) -> str:
    return f"{APP_NAMESPACE}:{name}" if APP_NAMESPACE else name


def view_of(match):
    return getattr(match.func, "view_class", None) or getattr(match.func, "cls", None)


class SimpleViewURLTests(SimpleTestCase):
    def test_reverse_paths(self):
        cases = {
            "health-check": "/health/",
            "users-count": "/users/count/",
            "auth-register": "/auth/register/",
            "auth-login": "/auth/login/",
            "auth-refresh": "/auth/refresh/",
            "auth-forgot-password": "/auth/forgot-password/",
            "auth-me": "/auth/me/",
            "auth-change-password": "/auth/change-password/",
            "auth-preferences": "/auth/preferences/",
            "dashboard-summary": "/dashboard/summary/",
            "route-upload": "/routes/upload/",
            "archive-export": "/archive/export/",
            "fuel-entries-merged": "/fuel-entries/merged/",
            "payroll-overview": "/payroll/overview/",
            "employee-insights": "/employees/insights/",
            "erp-settings": "/erp/settings/",
            "trip-search": "/trips/search/",
            "archive-export-pdf": "/archive/export/pdf/",
        }
        for name, expected in cases.items():
            with self.subTest(name=name):
                self.assertEqual(reverse(ns(name)), expected)

    def test_resolve_to_correct_view(self):
        cases = {
            "/health/": HealthCheckView,
            "/users/count/": UserCountView,
            "/auth/register/": RegisterView,
            "/auth/login/": LoginView,
            "/auth/forgot-password/": ForgotPasswordView,
            "/auth/me/": MeView,
            "/auth/change-password/": ChangePasswordView,
            "/auth/preferences/": UserPreferenceView,
            "/dashboard/summary/": DashboardSummaryView,
            "/routes/upload/": RouteDistanceUploadView,
            "/archive/export/": ArchiveExportView,
            "/fuel-entries/merged/": FuelMergedView,
            "/payroll/overview/": PayrollOverviewView,
            "/employees/insights/": EmployeeInsightView,
            "/erp/settings/": ERPSettingView,
            "/trips/search/": TripSearchView,
            "/archive/export/pdf/": PDFExportView,
        }
        for url, view_cls in cases.items():
            with self.subTest(url=url):
                self.assertEqual(view_of(resolve(url)), view_cls)

    def test_token_refresh_uses_simplejwt(self):
        self.assertEqual(view_of(resolve("/auth/refresh/")), TokenRefreshView)


class RouterURLTests(SimpleTestCase):
    ROUTES = [
        ("vehicle", "vehicles", VehicleViewSet),
        ("route-distance", "route-distances", RouteDistanceViewSet),
        ("trip", "trips", TripViewSet),
        ("service-repair", "service-repairs", ServiceRepairViewSet),
        ("fuel-entry", "fuel-entries", FuelEntryViewSet),
        ("payroll-entry", "payroll-entries", PayrollEntryViewSet),
        ("driver", "drivers", DriverProfileViewSet),
        ("driver-leave", "driver-leaves", DriverLeaveViewSet),
    ]

    def test_list_urls(self):
        for basename, prefix, _ in self.ROUTES:
            with self.subTest(basename=basename):
                self.assertEqual(reverse(ns(f"{basename}-list")), f"/{prefix}/")

    def test_detail_urls(self):
        for basename, prefix, _ in self.ROUTES:
            with self.subTest(basename=basename):
                self.assertEqual(
                    reverse(ns(f"{basename}-detail"), args=[1]), f"/{prefix}/1/"
                )

    def test_list_resolves_to_viewset(self):
        for basename, prefix, viewset in self.ROUTES:
            with self.subTest(basename=basename):
                self.assertEqual(resolve(f"/{prefix}/").func.cls, viewset)


class URLUniquenessTests(SimpleTestCase):
    def test_fuel_merged_not_swallowed_by_router(self):
        self.assertEqual(view_of(resolve("/fuel-entries/merged/")), FuelMergedView)

    def test_trip_search_not_swallowed_by_router(self):
        self.assertEqual(view_of(resolve("/trips/search/")), TripSearchView)