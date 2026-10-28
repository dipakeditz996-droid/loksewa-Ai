from django.db import migrations


def sync_published_status(apps, schema_editor):
    Product = apps.get_model('marketplace', 'Product')
    # Any product marked published but stuck in PENDING_REVIEW should be ACTIVE
    Product.objects.filter(is_published=True, listing_status='PENDING_REVIEW').update(listing_status='ACTIVE')
    # Any platform product (no seller) that is not published should be DRAFT instead of PENDING_REVIEW
    Product.objects.filter(seller=None, is_published=False, listing_status='PENDING_REVIEW').update(listing_status='DRAFT')


def reverse_sync(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marketplace', '0014_fix_imagefield_max_length'),
    ]

    operations = [
        migrations.RunPython(sync_published_status, reverse_sync),
    ]
