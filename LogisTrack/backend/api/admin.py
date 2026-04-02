from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

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


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ["email"]
    list_display = [
        "email",
        "full_name",
        "company",
        "preferred_language",
        "notify_email",
        "notify_push",
        "is_company_admin",
        "is_staff",
        "is_active",
    ]
    list_filter = ["is_company_admin", "is_staff", "is_active", "company"]
    search_fields = ["email", "full_name", "company__name"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("full_name", "company", "preferred_language", "notify_email", "notify_push")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_company_admin",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "company", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ["full_name", "company", "is_active", "created_at"]
    search_fields = ["full_name", "company__name"]
    list_filter = ["company", "is_active"]


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ["plate_number", "company", "driver_name", "vehicle_model", "last_inspection_date", "year"]
    search_fields = ["plate_number", "driver_name", "vehicle_model", "company__name"]
    list_filter = ["company", "year"]


@admin.register(RouteDistance)
class RouteDistanceAdmin(admin.ModelAdmin):
    list_display = ["company", "origin", "destination", "km"]
    list_filter = ["company"]
    search_fields = ["origin", "destination"]


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    list_display = ["created_at", "company", "plate_number", "origin", "destination", "total_amount", "total_km"]
    list_filter = ["company", "bridge_canakkale", "bridge_osmangazi"]
    search_fields = ["plate_number", "origin", "destination", "customer", "invoice_no"]

    @admin.display(description="Total KM")
    def total_km(self, obj):
        return (obj.cci_km or 0) + (obj.extra_km or 0)


@admin.register(ServiceRepair)
class ServiceRepairAdmin(admin.ModelAdmin):
    list_display = ["date", "company", "vehicle", "entry_km", "cost"]
    list_filter = ["company", "date"]
    search_fields = ["vehicle__plate_number", "operation_details"]


@admin.register(FuelEntry)
class FuelEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "company", "vehicle", "entry_type", "liters", "amount"]
    list_filter = ["company", "entry_type", "date"]
    search_fields = ["vehicle__plate_number", "notes"]


@admin.register(PayrollEntry)
class PayrollEntryAdmin(admin.ModelAdmin):
    list_display = ["date", "company", "entry_type", "driver_name", "customer", "amount", "source_module"]
    list_filter = ["company", "entry_type", "date"]
    search_fields = ["driver_name", "customer", "description"]


@admin.register(DriverLeave)
class DriverLeaveAdmin(admin.ModelAdmin):
    list_display = ["driver", "company", "start_date", "end_date"]
    list_filter = ["company", "start_date", "end_date"]
    search_fields = ["driver__full_name", "notes"]


@admin.register(ERPSetting)
class ERPSettingAdmin(admin.ModelAdmin):
    list_display = ["company", "vat_rate", "bonus_threshold_km", "updated_at"]
    search_fields = ["company__name"]
