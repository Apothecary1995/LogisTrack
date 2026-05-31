from decimal import Decimal

from django.contrib.auth.password_validation import validate_password
from django.db.models import Q
from rest_framework import serializers

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


class CompanyScopedModelSerializer(serializers.ModelSerializer):
    def create(self, validated_data):
        request = self.context.get("request")
        if request and hasattr(request.user, "company") and request.user.company:
            validated_data.setdefault("company", request.user.company)
        return super().create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "company",
            "company_name",
            "is_company_admin",
            "is_staff",
            "preferred_language",
            "notify_email",
            "notify_push",
            "date_joined",
        ]
        read_only_fields = ["id", "is_company_admin", "is_staff", "date_joined", "company_name"]


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    company_name = serializers.CharField(max_length=180)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        company_name = validated_data.pop("company_name").strip()
        company = Company.objects.filter(name__iexact=company_name).first()
        if not company:
            company = Company.objects.create(name=company_name)

        is_first_company_user = not company.users.exists()

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            full_name=validated_data["full_name"],
            company=company,
            is_company_admin=is_first_company_user,
        )
        ERPSetting.objects.get_or_create(company=company)
        return user


class DriverProfileSerializer(CompanyScopedModelSerializer):
    class Meta:
        model = DriverProfile
        fields = ["id", "full_name", "phone", "notes", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class VehicleSerializer(CompanyScopedModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "id",
            "plate_number",
            "trailer_plate",
            "driver_name",
            "vehicle_model",
            "last_inspection_date",
            "year",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class RouteDistanceSerializer(CompanyScopedModelSerializer):
    class Meta:
        model = RouteDistance
        fields = ["id", "origin", "destination", "km", "created_at"]
        read_only_fields = ["id", "created_at"]


class TripSerializer(CompanyScopedModelSerializer):
    invoice_date = serializers.DateField(
        required=False,
        allow_null=True,
        input_formats=["%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d"],
    )
    total_km = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Trip
        fields = [
            "id",
            "vehicle",
            "plate_number",
            "origin",
            "destination",
            "departure_time",
            "arrival_time",
            "total_duration",
            "cci_km",
            "cargo_type",
            "quantity",
            "waybill_no",
            "customer",
            "price",
            "extra_km",
            "total_amount",
            "bridge_canakkale",
            "bridge_osmangazi",
            "invoice_no",
            "invoice_date",
            "notes",
            "created_at",
            "total_km",
        ]
        read_only_fields = ["id", "created_at", "plate_number", "total_km"]

    def validate_vehicle(self, value):
        request = self.context.get("request")
        if request and request.user.company and value.company_id != request.user.company_id:
            raise serializers.ValidationError("Vehicle does not belong to your company.")
        return value

    def to_internal_value(self, data):
        normalized = data.copy()
        for key in ["invoice_date", "departure_time", "arrival_time"]:
            if normalized.get(key) == "":
                normalized[key] = None
        return super().to_internal_value(normalized)

    def _lookup_cci_km(self, company, origin, destination):
        route = RouteDistance.objects.filter(
            company=company,
            origin__iexact=origin.strip(),
            destination__iexact=destination.strip(),
        ).first()
        if route:
            return route.km

        reverse_route = RouteDistance.objects.filter(
            company=company,
            origin__iexact=destination.strip(),
            destination__iexact=origin.strip(),
        ).first()
        if reverse_route:
            return reverse_route.km

        return Decimal("0")

    def create(self, validated_data):
        request = self.context.get("request")
        vehicle = validated_data["vehicle"]

        validated_data["company"] = request.user.company
        validated_data["plate_number"] = vehicle.plate_number

        provided_cci_km = validated_data.get("cci_km", Decimal("0"))
        if provided_cci_km in (None, Decimal("0"), 0):
            validated_data["cci_km"] = self._lookup_cci_km(
                request.user.company,
                validated_data["origin"],
                validated_data["destination"],
            )

        if not validated_data.get("total_amount"):
            validated_data["total_amount"] = validated_data.get("price") or Decimal("0")

        return super().create(validated_data)

    def get_total_km(self, obj):
        return (obj.cci_km or Decimal("0")) + (obj.extra_km or Decimal("0"))


class ServiceRepairSerializer(CompanyScopedModelSerializer):
    plate_number = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = ServiceRepair
        fields = [
            "id",
            "vehicle",
            "plate_number",
            "date",
            "operation_details",
            "entry_km",
            "cost",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "plate_number"]

    def validate_vehicle(self, value):
        request = self.context.get("request")
        if request and request.user.company and value.company_id != request.user.company_id:
            raise serializers.ValidationError("Vehicle does not belong to your company.")
        return value


class FuelEntrySerializer(CompanyScopedModelSerializer):
    plate_number = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = FuelEntry
        fields = [
            "id",
            "vehicle",
            "plate_number",
            "entry_type",
            "date",
            "liters",
            "amount",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "plate_number"]

    def validate_vehicle(self, value):
        request = self.context.get("request")
        if request and request.user.company and value.company_id != request.user.company_id:
            raise serializers.ValidationError("Vehicle does not belong to your company.")
        return value


class PayrollEntrySerializer(CompanyScopedModelSerializer):
    class Meta:
        model = PayrollEntry
        fields = [
            "id",
            "entry_type",
            "date",
            "driver_name",
            "customer",
            "amount",
            "description",
            "source_module",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DriverLeaveSerializer(CompanyScopedModelSerializer):
    driver_name = serializers.CharField(source="driver.full_name", read_only=True)

    class Meta:
        model = DriverLeave
        fields = ["id", "driver", "driver_name", "start_date", "end_date", "notes", "created_at"]
        read_only_fields = ["id", "created_at", "driver_name"]

    def validate_driver(self, value):
        request = self.context.get("request")
        if request and request.user.company and value.company_id != request.user.company_id:
            raise serializers.ValidationError("Driver does not belong to your company.")
        return value


class ERPSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ERPSetting
        fields = ["vat_rate", "bonus_threshold_km", "bonus_formula", "updated_at"]
        read_only_fields = ["updated_at"]


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class FuelMergedRowSerializer(serializers.Serializer):
    date = serializers.DateField()
    plate_number = serializers.CharField()
    fuel_liters = serializers.DecimalField(max_digits=12, decimal_places=2)
    fuel_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    adblue_liters = serializers.DecimalField(max_digits=12, decimal_places=2)
    adblue_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    notes = serializers.CharField()


class EmployeeStatSerializer(serializers.Serializer):
    driver_name = serializers.CharField()
    total_km = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    efficiency = serializers.DecimalField(max_digits=14, decimal_places=4)


class DateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    view = serializers.ChoiceField(choices=["weekly", "monthly"], default="monthly")


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get("email")
        password = attrs.get("password")
        user = User.objects.filter(Q(email__iexact=email)).first()

        if not user or not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_active:
            raise serializers.ValidationError("User is inactive")

        attrs["user"] = user
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        validate_password(value)
        return value


class UserPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["preferred_language", "notify_email", "notify_push"]
