from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone


class Company(models.Model):
    name = models.CharField(max_length=180, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email must be set")

        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    LANGUAGE_TR = "tr"
    LANGUAGE_EN = "en"
    LANGUAGE_BS = "bs"
    LANGUAGE_CHOICES = (
        (LANGUAGE_TR, "Turkish"),
        (LANGUAGE_EN, "English"),
        (LANGUAGE_BS, "Bosnian"),
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150)
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
        help_text="Null is only allowed for root superusers.",
    )
    is_company_admin = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    preferred_language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default=LANGUAGE_TR)
    notify_email = models.BooleanField(default=True)
    notify_push = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["email"]

    def __str__(self):
        return self.email


class DriverProfile(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="drivers")
    full_name = models.CharField(max_length=150)
    phone = models.CharField(max_length=30, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["full_name"]
        unique_together = ("company", "full_name")

    def __str__(self):
        return self.full_name


class Vehicle(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="vehicles")
    plate_number = models.CharField(max_length=40)
    trailer_plate = models.CharField(max_length=40, blank=True)
    driver_name = models.CharField(max_length=150)
    vehicle_model = models.CharField(max_length=120)
    last_inspection_date = models.DateField()
    year = models.PositiveIntegerField(validators=[MinValueValidator(1900)])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["plate_number"]
        unique_together = ("company", "plate_number")

    def __str__(self):
        return self.plate_number


class RouteDistance(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="route_distances")
    origin = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    km = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["origin", "destination"]
        unique_together = ("company", "origin", "destination")

    def __str__(self):
        return f"{self.origin} -> {self.destination}"


class Trip(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="trips")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="trips")
    plate_number = models.CharField(max_length=40)
    origin = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    departure_time = models.DateTimeField(null=True, blank=True)
    arrival_time = models.DateTimeField(null=True, blank=True)
    total_duration = models.CharField(max_length=40, blank=True)
    cci_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cargo_type = models.CharField(max_length=120, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    waybill_no = models.CharField(max_length=80, blank=True)
    customer = models.CharField(max_length=160, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    extra_km = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bridge_canakkale = models.BooleanField(default=False)
    bridge_osmangazi = models.BooleanField(default=False)
    invoice_no = models.CharField(max_length=80, blank=True)
    invoice_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.plate_number} {self.origin}-{self.destination}"


class ServiceRepair(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="service_repairs")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="service_repairs")
    date = models.DateField(default=timezone.localdate)
    operation_details = models.TextField()
    entry_km = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    cost = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.vehicle.plate_number} service {self.date}"


class FuelEntry(models.Model):
    FUEL = "fuel"
    ADBLUE = "adblue"
    ENTRY_TYPES = (
        (FUEL, "Fuel"),
        (ADBLUE, "AdBlue"),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="fuel_entries")
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_entries")
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPES)
    date = models.DateField(default=timezone.localdate)
    liters = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.vehicle.plate_number} {self.entry_type} {self.date}"


class PayrollEntry(models.Model):
    DRIVER_WAGE = "driver_wage"
    CUSTOMER_INVOICE = "customer_invoice"
    OTHER_INCOME = "other_income"
    OTHER_EXPENSE = "other_expense"

    ENTRY_TYPES = (
        (DRIVER_WAGE, "Driver Wage"),
        (CUSTOMER_INVOICE, "Customer Invoice"),
        (OTHER_INCOME, "Other Income"),
        (OTHER_EXPENSE, "Other Expense"),
    )

    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="payroll_entries")
    entry_type = models.CharField(max_length=32, choices=ENTRY_TYPES)
    date = models.DateField(default=timezone.localdate)
    driver_name = models.CharField(max_length=150, blank=True)
    customer = models.CharField(max_length=160, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    source_module = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.entry_type} {self.amount}"


class DriverLeave(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="driver_leaves")
    driver = models.ForeignKey(DriverProfile, on_delete=models.CASCADE, related_name="leaves")
    start_date = models.DateField()
    end_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.driver.full_name} leave"


class ERPSetting(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="erp_setting")
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    bonus_threshold_km = models.DecimalField(max_digits=12, decimal_places=2, default=10000)
    bonus_formula = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ERP setting for {self.company.name}"
