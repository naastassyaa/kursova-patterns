from decimal import Decimal

import django.db.models.deletion
from django.db import migrations, models


def assign_default_center(apps, schema_editor):
    SportCenter = apps.get_model('api', 'SportCenter')
    GymHall = apps.get_model('api', 'GymHall')

    if not GymHall.objects.filter(center__isnull=True).exists():
        return

    default_center, _ = SportCenter.objects.get_or_create(
        name='Default Sport Center',
        defaults={
            'city': 'N/A',
            'address': 'TBD',
            'contact_phone': '+0000000000',
            'email': '',
            'description': 'Auto-created to satisfy non-null constraints.',
            'opening_hours': '',
        },
    )

    for hall in GymHall.objects.filter(center__isnull=True):
        hall.center = default_center
        hall.save(update_fields=['center'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_loyaltytier_sportcenter_gymhall_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='section',
            name='base_price',
            field=models.DecimalField(decimal_places=2, default=Decimal('350.00'), max_digits=8),
        ),
        migrations.RunPython(assign_default_center, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='gymhall',
            name='center',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='halls', to='api.sportcenter'),
        ),
    ]

