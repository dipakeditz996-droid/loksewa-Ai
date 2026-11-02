from django.db import migrations


def clean_empty_slugs(apps, schema_editor):
    SubscriptionPlan = apps.get_model('subscriptions', 'SubscriptionPlan')
    SubscriptionPlan.objects.filter(slug='').update(slug=None)


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0018_subscription_sub_std_stat_exp_idx'),
    ]

    operations = [
        migrations.RunPython(clean_empty_slugs, migrations.RunPython.noop),
    ]
