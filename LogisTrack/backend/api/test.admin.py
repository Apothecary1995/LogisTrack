"""
Tests for ERP application admin classes.

Run with:
    python manage.py test app_name.tests.test_admin
"""
from datetime import date
from decimal import Decimal

from django.contrib.admin import site as admin_site
from django.contrib.admin.sites import AdminSite
from django.test import RequestFactory, TestCase
from django.urls import reverse

from .admin import (
    CompanyAdmin,
    DriverLeaveAdmin,
    DriverProfileAdmin,
    ERPSettingAdmin,
    FuelEntryAdmin,
    PayrollEntryAdmin,
    RouteDistanceAdmin,
    ServiceRepairAdmin,
    TripAdmin,
    UserAdmin,
    VehicleAdmin,
)
from .models import (
    Company,
    DriverLeave,
    DriverProfile,
    ERPSetting,
    FuelEntry,
    PayrollEntry,
    RouteDistance,
    ServiceRepair,
    Trip,
    User,
    Vehicle,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def make_superuser(email="admin@test.com", password="adminpass123"):
    return User.objects.create_superuser(
        email=email, password=password, full_name="Admin User"
    )


def make_company(name="Test Lojistik"):
    return Company.objects.create(name=name)


def make_vehicle(company, plate="34TST001"):
    return Vehicle.objects.create(
        company=company,
        plate_number=plate,
        driver_name="Test Sofor",
        vehicle_model="Test Model",
        last_inspection_date=date(2025, 1, 1),
        year=2020,
    )


def make_driver(company, full_name="Test Sofor"):
    return DriverProfile.objects.create(company=company, full_name=full_name)


# ---------------------------------------------------------------------------
# Base class for admin unit tests (no HTTP)
# ---------------------------------------------------------------------------
class AdminUnitTestBase(TestCase):
    """AdminSite + RequestFactory — HTTP stack olmadan admin nesnelerini test eder."""

    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.superuser = make_superuser()
        self.company = make_company()
        self.vehicle = make_vehicle(self.company)
        self.driver = make_driver(self.company)


# ---------------------------------------------------------------------------
# Base class for admin integration tests (full HTTP)
# ---------------------------------------------------------------------------
class AdminIntegrationTestBase(TestCase):
    """Django test client ile gerçek admin URL'lerine istek atar."""

    def setUp(self):
        self.superuser = make_superuser()
        self.client.force_login(self.superuser)
        self.company = make_company()
        self.vehicle = make_vehicle(self.company)
        self.driver = make_driver(self.company)


# ===========================================================================
# UserAdmin
# ===========================================================================
class UserAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = UserAdmin(User, self.site)

    def test_list_display_fields(self):
        expected = [
            "email", "full_name", "company", "preferred_language",
            "notify_email", "notify_push", "is_company_admin", "is_staff", "is_active",
        ]
        self.assertEqual(list(self.admin.list_display), expected)

    def test_list_filter_fields(self):
        self.assertIn("is_staff", self.admin.list_filter)
        self.assertIn("is_active", self.admin.list_filter)
        self.assertIn("company", self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("email", self.admin.search_fields)
        self.assertIn("full_name", self.admin.search_fields)
        self.assertIn("company__name", self.admin.search_fields)

    def test_ordering(self):
        self.assertEqual(self.admin.ordering, ["email"])

    def test_fieldsets_contains_email(self):
        all_fields = [
            field
            for _, opts in self.admin.fieldsets
            for field in opts["fields"]
        ]
        self.assertIn("email", all_fields)

    def test_add_fieldsets_contains_required_fields(self):
        all_fields = [
            field
            for _, opts in self.admin.add_fieldsets
            for field in opts["fields"]
        ]
        for f in ("email", "full_name", "password1", "password2"):
            self.assertIn(f, all_fields)


class UserAdminIntegrationTests(AdminIntegrationTestBase):
    def test_changelist_accessible(self):
        url = reverse("admin:app_user_changelist")  # 'app' -> uygulamanızın label'ı
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_add_view_accessible(self):
        url = reverse("admin:app_user_add")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_change_view_accessible(self):
        url = reverse("admin:app_user_change", args=[self.superuser.pk])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)


# ===========================================================================
# CompanyAdmin
# ===========================================================================
class CompanyAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = CompanyAdmin(Company, self.site)

    def test_list_display(self):
        self.assertIn("name", self.admin.list_display)
        self.assertIn("created_at", self.admin.list_display)

    def test_search_fields(self):
        self.assertIn("name", self.admin.search_fields)


class CompanyAdminIntegrationTests(AdminIntegrationTestBase):
    def test_changelist_accessible(self):
        url = reverse("admin:app_company_changelist")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

    def test_search_filters_correctly(self):
        Company.objects.create(name="Arama Sirketi")
        url = reverse("admin:app_company_changelist") + "?q=Arama"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Arama Sirketi")


# ===========================================================================
# DriverProfileAdmin
# ===========================================================================
class DriverProfileAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = DriverProfileAdmin(DriverProfile, self.site)

    def test_list_display(self):
        for field in ("full_name", "company", "is_active", "created_at"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        self.assertIn("is_active", self.admin.list_filter)
        self.assertIn("company", self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("full_name", self.admin.search_fields)
        self.assertIn("company__name", self.admin.search_fields)


# ===========================================================================
# VehicleAdmin
# ===========================================================================
class VehicleAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = VehicleAdmin(Vehicle, self.site)

    def test_list_display(self):
        for field in ("plate_number", "company", "driver_name", "vehicle_model"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        self.assertIn("company", self.admin.list_filter)
        self.assertIn("year", self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("plate_number", self.admin.search_fields)
        self.assertIn("company__name", self.admin.search_fields)


# ===========================================================================
# RouteDistanceAdmin
# ===========================================================================
class RouteDistanceAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = RouteDistanceAdmin(RouteDistance, self.site)

    def test_list_display(self):
        for field in ("company", "origin", "destination", "km"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        self.assertIn("company", self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("origin", self.admin.search_fields)
        self.assertIn("destination", self.admin.search_fields)


# ===========================================================================
# TripAdmin — özel metod testi dahil
# ===========================================================================
class TripAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = TripAdmin(Trip, self.site)

    def test_list_display_contains_total_km(self):
        self.assertIn("total_km", self.admin.list_display)

    def test_list_filter(self):
        self.assertIn("bridge_canakkale", self.admin.list_filter)
        self.assertIn("bridge_osmangazi", self.admin.list_filter)
        self.assertIn("company", self.admin.list_filter)

    def test_search_fields(self):
        for field in ("plate_number", "origin", "destination", "customer", "invoice_no"):
            self.assertIn(field, self.admin.search_fields)

    def test_total_km_method_sums_cci_and_extra(self):
        trip = Trip(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="34TST001",
            origin="A",
            destination="B",
            cci_km=Decimal("500"),
            extra_km=Decimal("75.50"),
        )
        result = self.admin.total_km(trip)
        self.assertEqual(result, Decimal("575.50"))

    def test_total_km_method_handles_zero_values(self):
        trip = Trip(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="34TST001",
            origin="A",
            destination="B",
            cci_km=Decimal("0"),
            extra_km=Decimal("0"),
        )
        self.assertEqual(self.admin.total_km(trip), 0)

    def test_total_km_description(self):
        # @admin.display(description=...) doğrulaması
        self.assertEqual(
            getattr(TripAdmin.total_km, "short_description", None), "Total KM"
        )


# ===========================================================================
# ServiceRepairAdmin
# ===========================================================================
class ServiceRepairAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = ServiceRepairAdmin(ServiceRepair, self.site)

    def test_list_display(self):
        for field in ("date", "company", "vehicle", "entry_km", "cost"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        self.assertIn("company", self.admin.list_filter)
        self.assertIn("date", self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("vehicle__plate_number", self.admin.search_fields)
        self.assertIn("operation_details", self.admin.search_fields)


# ===========================================================================
# FuelEntryAdmin
# ===========================================================================
class FuelEntryAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = FuelEntryAdmin(FuelEntry, self.site)

    def test_list_display(self):
        for field in ("date", "company", "vehicle", "entry_type", "liters", "amount"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        for f in ("company", "entry_type", "date"):
            self.assertIn(f, self.admin.list_filter)


# ===========================================================================
# PayrollEntryAdmin
# ===========================================================================
class PayrollEntryAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = PayrollEntryAdmin(PayrollEntry, self.site)

    def test_list_display(self):
        for field in ("date", "company", "entry_type", "driver_name", "customer", "amount", "source_module"):
            self.assertIn(field, self.admin.list_display)

    def test_search_fields(self):
        for field in ("driver_name", "customer", "description"):
            self.assertIn(field, self.admin.search_fields)


# ===========================================================================
# DriverLeaveAdmin
# ===========================================================================
class DriverLeaveAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = DriverLeaveAdmin(DriverLeave, self.site)

    def test_list_display(self):
        for field in ("driver", "company", "start_date", "end_date"):
            self.assertIn(field, self.admin.list_display)

    def test_list_filter(self):
        for f in ("company", "start_date", "end_date"):
            self.assertIn(f, self.admin.list_filter)

    def test_search_fields(self):
        self.assertIn("driver__full_name", self.admin.search_fields)
        self.assertIn("notes", self.admin.search_fields)


# ===========================================================================
# ERPSettingAdmin
# ===========================================================================
class ERPSettingAdminConfigTests(AdminUnitTestBase):
    def setUp(self):
        super().setUp()
        self.admin = ERPSettingAdmin(ERPSetting, self.site)

    def test_list_display(self):
        for field in ("company", "vat_rate", "bonus_threshold_km", "updated_at"):
            self.assertIn(field, self.admin.list_display)

    def test_search_fields(self):
        self.assertIn("company__name", self.admin.search_fields)


# ===========================================================================
# Tüm modellerin admin'e kayıtlı olduğunu doğrulama
# ===========================================================================
class AdminRegistrationTests(TestCase):
    """Her modelin global admin site'a kayıtlı olduğunu kontrol eder."""

    EXPECTED_MODELS = [
        User, Company, DriverProfile, Vehicle, RouteDistance,
        Trip, ServiceRepair, FuelEntry, PayrollEntry, DriverLeave, ERPSetting,
    ]

    def test_all_models_registered(self):
        for model in self.EXPECTED_MODELS:
            with self.subTest(model=model.__name__):
                self.assertIn(
                    model,
                    admin_site._registry,
                    msg=f"{model.__name__} admin'e kayıtlı değil",
                )