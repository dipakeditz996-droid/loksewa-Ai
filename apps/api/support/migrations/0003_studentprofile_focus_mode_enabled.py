from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('support', '0002_notificationpreference_question_reviews_email_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='focus_mode_enabled',
            field=models.BooleanField(
                default=False,
                help_text='Reduce in-app distractions while studying and taking exams.',
            ),
        ),
    ]
