from django.urls import include, path
from rest_framework.routers import DefaultRouter
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
    RegisterView,
    RouteDistanceUploadView,
    RouteDistanceViewSet,
    ServiceRepairViewSet,
    TripViewSet,
    UserCountView,
    UserPreferenceView,
    VehicleViewSet,
)

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"route-distances", RouteDistanceViewSet, basename="route-distance")
router.register(r"trips", TripViewSet, basename="trip")
router.register(r"service-repairs", ServiceRepairViewSet, basename="service-repair")
router.register(r"fuel-entries", FuelEntryViewSet, basename="fuel-entry")
router.register(r"payroll-entries", PayrollEntryViewSet, basename="payroll-entry")
router.register(r"drivers", DriverProfileViewSet, basename="driver")
router.register(r"driver-leaves", DriverLeaveViewSet, basename="driver-leave")

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("users/count/", UserCountView.as_view(), name="users-count"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/preferences/", UserPreferenceView.as_view(), name="auth-preferences"),
    path("dashboard/summary/", DashboardSummaryView.as_view(), name="dashboard-summary"),
    path("routes/upload/", RouteDistanceUploadView.as_view(), name="route-upload"),
    path("archive/export/", ArchiveExportView.as_view(), name="archive-export"),
    path("fuel-entries/merged/", FuelMergedView.as_view(), name="fuel-entries-merged"),
    path("payroll/overview/", PayrollOverviewView.as_view(), name="payroll-overview"),
    path("employees/insights/", EmployeeInsightView.as_view(), name="employee-insights"),
    path("erp/settings/", ERPSettingView.as_view(), name="erp-settings"),
    path("", include(router.urls)),
]
