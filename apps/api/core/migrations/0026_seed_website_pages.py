from django.db import migrations


# Conservative placeholder content only - no fabricated legal claims. Every
# row is seeded as a draft; an admin must review and explicitly publish
# before any of this is ever shown to a visitor (core.public_views.
# PublicWebsitePageView only ever returns status='published' rows).
PAGES = [
    {
        'slug': 'contact',
        'title': 'Contact Us',
        'content': (
            "Get in Touch\n\n"
            "We're here to help with any questions about your Loksewa preparation.\n\n"
            "Email: support@loksewaai.com\n\n"
            "This page is a draft. An administrator should review and publish it "
            "from Admin Dashboard → Website Content before it goes live."
        ),
    },
    {
        'slug': 'privacy',
        'title': 'Privacy Policy',
        'content': (
            "Privacy Policy\n\n"
            "This privacy policy has not been finalized yet. An administrator "
            "needs to review and publish the approved policy text from "
            "Admin Dashboard → Website Content before this page is shown "
            "to visitors."
        ),
    },
    {
        'slug': 'terms',
        'title': 'Terms & Conditions',
        'content': (
            "Terms & Conditions\n\n"
            "These terms have not been finalized yet. An administrator needs "
            "to review and publish the approved terms from "
            "Admin Dashboard → Website Content before this page is shown "
            "to visitors."
        ),
    },
    {
        'slug': 'refund',
        'title': 'Refund Policy',
        'content': (
            "Refund Policy\n\n"
            "This refund policy has not been finalized yet. An administrator "
            "needs to review and publish the approved policy from "
            "Admin Dashboard → Website Content before this page is shown "
            "to visitors."
        ),
    },
]


def seed_pages(apps, schema_editor):
    WebsitePage = apps.get_model('core', 'WebsitePage')
    for page in PAGES:
        WebsitePage.objects.get_or_create(
            slug=page['slug'],
            defaults={'title': page['title'], 'content': page['content'], 'status': 'draft'},
        )


def remove_pages(apps, schema_editor):
    WebsitePage = apps.get_model('core', 'WebsitePage')
    WebsitePage.objects.filter(slug__in=[p['slug'] for p in PAGES]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0025_websitepage'),
    ]

    operations = [
        migrations.RunPython(seed_pages, remove_pages),
    ]
