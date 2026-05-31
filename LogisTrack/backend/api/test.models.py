"""
Tests for ERP application models.

Run with:
    python manage.py test app_name.tests.test_models
veya pytest kullanıyorsanız:
    pytest app_name/tests/test_models.py
"""
from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

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
# Helper / factory
# ---------------------------------------------------------------------------
class BaseTestData(TestCase):
    """Tüm testlerin paylaştığı temel veri seti."""

    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="Acme Lojistik")
        cls.other_company = Company.objects.create(name="Beta Tasimacilik")

        cls.vehicle = Vehicle.objects.create(
            company=cls.company,
            plate_number="34ABC123",
            trailer_plate="34XYZ999",
            driver_name="Ali Veli",
            vehicle_model="Mercedes Actros",
            last_inspection_date=date(2025, 1, 15),
            year=2020,
        )

        cls.driver = DriverProfile.objects.create(
            company=cls.company,
            full_name="Ali Veli",
            phone="+905551112233",
        )


# ---------------------------------------------------------------------------
# Company
# ---------------------------------------------------------------------------
class CompanyModelTests(TestCase):
    def test_create_company(self):
        company = Company.objects.create(name="Test AS")
        self.assertEqual(str(company), "Test AS")
        self.assertIsNotNone(company.created_at)

    def test_company_name_must_be_unique(self):
        Company.objects.create(name="Unique AS")
        with self.assertRaises(IntegrityError):
            Company.objects.create(name="Unique AS")

    def test_default_ordering_by_name(self):
        Company.objects.create(name="Zeta")
        Company.objects.create(name="Alfa")
        Company.objects.create(name="Mu")
        names = list(Company.objects.values_list("name", flat=True))
        self.assertEqual(names, sorted(names))


# ---------------------------------------------------------------------------
# User & UserManager
# ---------------------------------------------------------------------------
class UserManagerTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="UserCo")

    def test_create_user_with_email(self):
        user = User.objects.create_user(
            email="user@example.com",
            password="strongpass123",
            full_name="Normal User",
            company=self.company,
        )
        self.assertEqual(user.email, "user@example.com")
        self.assertTrue(user.check_password("strongpass123"))
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.is_active)

    def test_create_user_normalizes_email(self):
        user = User.objects.create_user(
            email="MIXED@Example.COM",
            password="pw",
            full_name="Case Test",
        )
        # Domain part is lowercased by normalize_email
        self.assertEqual(user.email, "MIXED@example.com")

    def test_create_user_without_email_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", password="x", full_name="No Mail")

    def test_create_superuser_defaults(self):
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="rootpass",
            full_name="Root Admin",
        )
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)

    def test_create_superuser_requires_is_staff(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="a@b.com", password="pw", full_name="x", is_staff=False
            )

    def test_create_superuser_requires_is_superuser(self):
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="a@b.com", password="pw", full_name="x", is_superuser=False
            )


class UserModelTests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="UserCo")

    def test_email_must_be_unique(self):
        User.objects.create_user(
            email="dup@example.com", password="pw", full_name="A"
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="dup@example.com", password="pw", full_name="B"
            )

    def test_string_representation(self):
        user = User.objects.create_user(
            email="repr@example.com", password="pw", full_name="Repr"
        )
        self.assertEqual(str(user), "repr@example.com")

    def test_default_language_is_turkish(self):
        user = User.objects.create_user(
            email="lang@example.com", password="pw", full_name="Lang"
        )
        self.assertEqual(user.preferred_language, User.LANGUAGE_TR)

    def test_notification_defaults(self):
        user = User.objects.create_user(
            email="notif@example.com", password="pw", full_name="N"
        )
        self.assertTrue(user.notify_email)
        self.assertFalse(user.notify_push)

    def test_company_can_be_null(self):
        # Sadece kök superuser'lar için izin verilen durum
        user = User.objects.create_superuser(
            email="root@example.com", password="pw", full_name="Root"
        )
        self.assertIsNone(user.company)

    def test_username_field_is_email(self):
        self.assertEqual(User.USERNAME_FIELD, "email")
        self.assertIn("full_name", User.REQUIRED_FIELDS)


# ---------------------------------------------------------------------------
# DriverProfile
# ---------------------------------------------------------------------------
class DriverProfileTests(BaseTestData):
    def test_create_driver(self):
        driver = DriverProfile.objects.create(
            company=self.company, full_name="Yeni Sofor"
        )
        self.assertEqual(str(driver), "Yeni Sofor")
        self.assertTrue(driver.is_active)

    def test_unique_together_company_and_full_name(self):
        with self.assertRaises(IntegrityError):
            DriverProfile.objects.create(
                company=self.company, full_name="Ali Veli"
            )

    def test_same_name_allowed_in_different_companies(self):
        # Aynı isimli sofor başka bir şirkette olabilir
        DriverProfile.objects.create(
            company=self.other_company, full_name="Ali Veli"
        )
        self.assertEqual(
            DriverProfile.objects.filter(full_name="Ali Veli").count(), 2
        )


# ---------------------------------------------------------------------------
# Vehicle
# ---------------------------------------------------------------------------
class VehicleModelTests(BaseTestData):
    def test_str_returns_plate_number(self):
        self.assertEqual(str(self.vehicle), "34ABC123")

    def test_unique_together_company_and_plate(self):
        with self.assertRaises(IntegrityError):
            Vehicle.objects.create(
                company=self.company,
                plate_number="34ABC123",
                driver_name="Başka Şoför",
                vehicle_model="Volvo",
                last_inspection_date=date(2025, 6, 1),
                year=2021,
            )

    def test_year_min_value_validator(self):
        v = Vehicle(
            company=self.company,
            plate_number="06DEF456",
            driver_name="X",
            vehicle_model="Y",
            last_inspection_date=date.today(),
            year=1800,  # < 1900, geçersiz
        )
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_same_plate_allowed_in_different_companies(self):
        Vehicle.objects.create(
            company=self.other_company,
            plate_number="34ABC123",
            driver_name="Z",
            vehicle_model="W",
            last_inspection_date=date.today(),
            year=2022,
        )
        self.assertEqual(
            Vehicle.objects.filter(plate_number="34ABC123").count(), 2
        )

    def test_updated_at_changes_on_save(self):
        first = self.vehicle.updated_at
        self.vehicle.notes = "guncellendi"
        self.vehicle.save()
        self.vehicle.refresh_from_db()
        self.assertGreater(self.vehicle.updated_at, first)


# ---------------------------------------------------------------------------
# RouteDistance
# ---------------------------------------------------------------------------
class RouteDistanceTests(BaseTestData):
    def test_create_and_str(self):
        rd = RouteDistance.objects.create(
            company=self.company,
            origin="Istanbul",
            destination="Ankara",
            km=Decimal("450.50"),
        )
        self.assertEqual(str(rd), "Istanbul -> Ankara")

    def test_unique_together(self):
        RouteDistance.objects.create(
            company=self.company,
            origin="Izmir",
            destination="Bursa",
            km=Decimal("330"),
        )
        with self.assertRaises(IntegrityError):
            RouteDistance.objects.create(
                company=self.company,
                origin="Izmir",
                destination="Bursa",
                km=Decimal("335"),
            )

    def test_km_cannot_be_negative(self):
        rd = RouteDistance(
            company=self.company,
            origin="A",
            destination="B",
            km=Decimal("-1"),
        )
        with self.assertRaises(ValidationError):
            rd.full_clean()


# ---------------------------------------------------------------------------
# Trip
# ---------------------------------------------------------------------------
class TripModelTests(BaseTestData):
    def test_create_trip_minimal(self):
        trip = Trip.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            plate_number=self.vehicle.plate_number,
            origin="Istanbul",
            destination="Ankara",
        )
        self.assertEqual(
            str(trip), f"{self.vehicle.plate_number} Istanbul-Ankara"
        )
        # Decimal varsayılanları
        self.assertEqual(trip.cci_km, Decimal("0"))
        self.assertEqual(trip.price, Decimal("0"))
        self.assertEqual(trip.extra_km, Decimal("0"))
        self.assertEqual(trip.total_amount, Decimal("0"))
        self.assertFalse(trip.bridge_canakkale)
        self.assertFalse(trip.bridge_osmangazi)

    def test_default_ordering_newest_first(self):
        t1 = Trip.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="P1",
            origin="A",
            destination="B",
        )
        t2 = Trip.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="P2",
            origin="A",
            destination="B",
        )
        ordered = list(Trip.objects.all())
        self.assertEqual(ordered[0], t2)
        self.assertEqual(ordered[1], t1)

    def test_vehicle_cascade_delete(self):
        Trip.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="P",
            origin="A",
            destination="B",
        )
        self.vehicle.delete()
        self.assertEqual(Trip.objects.count(), 0)


# ---------------------------------------------------------------------------
# ServiceRepair
# ---------------------------------------------------------------------------
class ServiceRepairTests(BaseTestData):
    def test_create_and_str(self):
        sr = ServiceRepair.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            operation_details="Yağ değişimi",
            entry_km=Decimal("150000"),
            cost=Decimal("2500.00"),
        )
        self.assertIn("service", str(sr))
        self.assertEqual(sr.date, timezone.localdate())

    def test_negative_cost_invalid(self):
        sr = ServiceRepair(
            company=self.company,
            vehicle=self.vehicle,
            operation_details="x",
            entry_km=Decimal("100"),
            cost=Decimal("-10"),
        )
        with self.assertRaises(ValidationError):
            sr.full_clean()

    def test_negative_entry_km_invalid(self):
        sr = ServiceRepair(
            company=self.company,
            vehicle=self.vehicle,
            operation_details="x",
            entry_km=Decimal("-5"),
            cost=Decimal("10"),
        )
        with self.assertRaises(ValidationError):
            sr.full_clean()


# ---------------------------------------------------------------------------
# FuelEntry
# ---------------------------------------------------------------------------
class FuelEntryTests(BaseTestData):
    def test_create_fuel_entry(self):
        entry = FuelEntry.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            entry_type=FuelEntry.FUEL,
            liters=Decimal("300"),
            amount=Decimal("12000.50"),
        )
        self.assertEqual(entry.entry_type, "fuel")
        self.assertEqual(entry.date, timezone.localdate())
        self.assertIn("fuel", str(entry))

    def test_create_adblue_entry(self):
        entry = FuelEntry.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            entry_type=FuelEntry.ADBLUE,
            liters=Decimal("20"),
            amount=Decimal("400"),
        )
        self.assertEqual(entry.entry_type, "adblue")

    def test_invalid_entry_type(self):
        entry = FuelEntry(
            company=self.company,
            vehicle=self.vehicle,
            entry_type="diesel",  # geçersiz
            liters=Decimal("10"),
            amount=Decimal("100"),
        )
        with self.assertRaises(ValidationError):
            entry.full_clean()

    def test_negative_liters_invalid(self):
        entry = FuelEntry(
            company=self.company,
            vehicle=self.vehicle,
            entry_type=FuelEntry.FUEL,
            liters=Decimal("-1"),
            amount=Decimal("100"),
        )
        with self.assertRaises(ValidationError):
            entry.full_clean()


# ---------------------------------------------------------------------------
# PayrollEntry
# ---------------------------------------------------------------------------
class PayrollEntryTests(BaseTestData):
    def test_create_driver_wage(self):
        entry = PayrollEntry.objects.create(
            company=self.company,
            entry_type=PayrollEntry.DRIVER_WAGE,
            driver_name="Ali Veli",
            amount=Decimal("15000"),
        )
        self.assertEqual(str(entry), "driver_wage 15000")

    def test_negative_amount_allowed(self):
        # PayrollEntry.amount alanında validator yok -> negatif giderler olabilir
        entry = PayrollEntry.objects.create(
            company=self.company,
            entry_type=PayrollEntry.OTHER_EXPENSE,
            amount=Decimal("-500"),
        )
        self.assertEqual(entry.amount, Decimal("-500"))

    def test_invalid_entry_type(self):
        entry = PayrollEntry(
            company=self.company,
            entry_type="bogus",
            amount=Decimal("100"),
        )
        with self.assertRaises(ValidationError):
            entry.full_clean()


# ---------------------------------------------------------------------------
# DriverLeave
# ---------------------------------------------------------------------------
class DriverLeaveTests(BaseTestData):
    def test_create_leave(self):
        leave = DriverLeave.objects.create(
            company=self.company,
            driver=self.driver,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5),
        )
        self.assertIn("leave", str(leave))

    def test_driver_cascade_delete(self):
        DriverLeave.objects.create(
            company=self.company,
            driver=self.driver,
            start_date=date.today(),
            end_date=date.today(),
        )
        self.driver.delete()
        self.assertEqual(DriverLeave.objects.count(), 0)


# ---------------------------------------------------------------------------
# ERPSetting
# ---------------------------------------------------------------------------
class ERPSettingTests(BaseTestData):
    def test_create_default_setting(self):
        setting = ERPSetting.objects.create(company=self.company)
        self.assertEqual(setting.vat_rate, Decimal("20.00"))
        self.assertEqual(setting.bonus_threshold_km, Decimal("10000"))
        self.assertEqual(str(setting), f"ERP setting for {self.company.name}")

    def test_one_to_one_constraint(self):
        ERPSetting.objects.create(company=self.company)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ERPSetting.objects.create(company=self.company)

    def test_company_cascade_delete(self):
        ERPSetting.objects.create(company=self.company)
        self.company.delete()
        self.assertEqual(ERPSetting.objects.count(), 0)


# ---------------------------------------------------------------------------
# Cross-model: Company cascade
# ---------------------------------------------------------------------------
class CascadeBehaviorTests(BaseTestData):
    def test_company_delete_cascades_to_related(self):
        DriverProfile.objects.create(company=self.company, full_name="Tmp")
        RouteDistance.objects.create(
            company=self.company, origin="X", destination="Y", km=Decimal("1")
        )
        Trip.objects.create(
            company=self.company,
            vehicle=self.vehicle,
            plate_number="P",
            origin="X",
            destination="Y",
        )

        self.company.delete()

        self.assertEqual(Vehicle.objects.filter(company_id=self.company.id).count(), 0)
        self.assertEqual(DriverProfile.objects.filter(company_id=self.company.id).count(), 0)
        self.assertEqual(RouteDistance.objects.filter(company_id=self.company.id).count(), 0)
        self.assertEqual(Trip.objects.filter(company_id=self.company.id).count(), 0)