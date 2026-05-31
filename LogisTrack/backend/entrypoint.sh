#!/bin/sh
set -e

python manage.py migrate --noinput

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
python manage.py shell <<PYCODE
from api.models import Company, User

email = "${DJANGO_SUPERUSER_EMAIL}"
password = "${DJANGO_SUPERUSER_PASSWORD}"
full_name = "${DJANGO_SUPERUSER_FULL_NAME:-System Admin}"
company_name = "${DJANGO_SUPERUSER_COMPANY:-LogiTarget HQ}"
company, _ = Company.objects.get_or_create(name=company_name)

user = User.objects.filter(email=email).first()
if user is None:
    user = User.objects.create_superuser(
        email=email,
        password=password,
        full_name=full_name,
        company=company,
        is_company_admin=True,
    )
    print("Superuser created:", email)
else:
    user.full_name = full_name
    user.company = company
    user.is_company_admin = True
    user.is_staff = True
    user.is_superuser = True
    user.is_active = True
    user.set_password(password)
    user.save()
    print("Superuser updated:", email)
PYCODE
fi

exec gunicorn config.wsgi:application --bind 0.0.0.0:8000
