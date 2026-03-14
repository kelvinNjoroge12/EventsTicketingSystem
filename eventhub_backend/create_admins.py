import os

apps = ['tickets', 'orders', 'payments', 'speakers', 'schedules', 'sponsors', 'checkin', 'analytics', 'notifications', 'finances', 'waitlist']

for app in apps:
    path = f'apps/{app}/admin.py'
    if not os.path.exists(path):
        with open(path, 'w') as f:
            f.write('''from django.contrib import admin
from django.apps import apps

app_models = apps.get_app_config(__package__.split('.')[-1]).get_models()
for model in app_models:
    try:
        @admin.register(model)
        class MetaAdmin(admin.ModelAdmin):
            list_display = [field.name for field in model._meta.fields if field.name != "id"]
            if len(list_display) > 5:
                list_display = list_display[:5]
    except admin.sites.AlreadyRegistered:
        pass
''')
