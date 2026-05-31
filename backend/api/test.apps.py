from django.test import TestCase
from api.apps import ApiConfig


class ApiConfigTest(TestCase):

    def test_app_config_name(self):
        self.assertEqual(ApiConfig.name, "api")

    def test_default_auto_field(self):
        self.assertEqual(
            ApiConfig.default_auto_field,
            "django.db.models.BigAutoField"
        )