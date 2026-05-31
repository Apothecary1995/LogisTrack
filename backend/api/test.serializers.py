import pytest
from decimal import Decimal

from rest_framework.exceptions import ValidationError

from your_app.models import Company, ERPSetting, RouteDistance, User, Vehicle
from your_app.serializers import (
    RegisterSerializer,
    TripSerializer,
    LoginSerializer,
)


@pytest.mark.django_db
def test_register_serializer_creates_company_user_and_erp_setting():
    data = {
        "email": "test@example.com",
        "full_name": "Test User",
        "password": "StrongPass123!",
        "company_name": "Test Company",
    }

    serializer = RegisterSerializer(data=data)
    assert serializer.is_valid(), serializer.errors

    user = serializer.save()

    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.company.name == "Test Company"
    assert user.is_company_admin is True
    assert ERPSetting.objects.filter(company=user.company).exists()


@pytest.mark.django_db
def test_register_serializer_rejects_duplicate_email():
    company = Company.objects.create(name="Company A")
    User.objects.create_user(
        email="test@example.com",
        password="StrongPass123!",
        full_name="Existing User",
        company=company,
    )

    data = {
        "email": "TEST@example.com",
        "full_name": "New User",
        "password": "StrongPass123!",
        "company_name": "Company A",
    }

    serializer = RegisterSerializer(data=data)

    assert serializer.is_valid() is False
    assert "email" in serializer.errors


@pytest.mark.django_db
def test_login_serializer_accepts_valid_credentials():
    company = Company.objects.create(name="Company A")
    user = User.objects.create_user(
        email="login@example.com",
        password="StrongPass123!",
        full_name="Login User",
        company=company,
    )

    serializer = LoginSerializer(
        data={
            "email": "login@example.com",
            "password": "StrongPass123!",
        }
    )

    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["user"] == user


@pytest.mark.django_db
def test_login_serializer_rejects_wrong_password():
    company = Company.objects.create(name="Company A")
    User.objects.create_user(
        email="login@example.com",
        password="StrongPass123!",
        full_name="Login User",
        company=company,
    )

    serializer = LoginSerializer(
        data={
            "email": "login@example.com",
            "password": "WrongPassword",
        }
    )

    assert serializer.is_valid() is False


@pytest.mark.django_db
def test_trip_serializer_auto_fills_cci_km_from_route_distance():
    company = Company.objects.create(name="Company A")
    user = User.objects.create_user(
        email="admin@example.com",
        password="StrongPass123!",
        full_name="Admin",
        company=company,
    )

    vehicle = Vehicle.objects.create(
        company=company,
        plate_number="34ABC123",
        vehicle_model="Mercedes",
    )

    RouteDistance.objects.create(
        company=company,
        origin="Istanbul",
        destination="Ankara",
        km=Decimal("450.00"),
    )

    request = type("Request", (), {"user": user})()

    data = {
        "vehicle": vehicle.id,
        "origin": "Istanbul",
        "destination": "Ankara",
        "price": "1000.00",
        "extra_km": "50.00",
        "cargo_type": "Textile",
        "quantity": "10",
        "customer": "Customer A",
    }

    serializer = TripSerializer(data=data, context={"request": request})
    assert serializer.is_valid(), serializer.errors

    trip = serializer.save()

    assert trip.company == company
    assert trip.plate_number == "34ABC123"
    assert trip.cci_km == Decimal("450.00")
    assert trip.total_amount == Decimal("1000.00")


@pytest.mark.django_db
def test_trip_serializer_total_km_calculation():
    company = Company.objects.create(name="Company A")

    vehicle = Vehicle.objects.create(
        company=company,
        plate_number="34ABC123",
        vehicle_model="Mercedes",
    )

    trip = type(
        "TripObject",
        (),
        {
            "cci_km": Decimal("450.00"),
            "extra_km": Decimal("50.00"),
        },
    )()

    serializer = TripSerializer()

    assert serializer.get_total_km(trip) == Decimal("500.00")


@pytest.mark.django_db
def test_trip_serializer_rejects_vehicle_from_another_company():
    company_1 = Company.objects.create(name="Company A")
    company_2 = Company.objects.create(name="Company B")

    user = User.objects.create_user(
        email="admin@example.com",
        password="StrongPass123!",
        full_name="Admin",
        company=company_1,
    )

    vehicle = Vehicle.objects.create(
        company=company_2,
        plate_number="34İST999",
        vehicle_model="Volvo",
    )

    request = type("Request", (), {"user": user})()

    serializer = TripSerializer(context={"request": request})

    with pytest.raises(ValidationError):
        serializer.validate_vehicle(vehicle)