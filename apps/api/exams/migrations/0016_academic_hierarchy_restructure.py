from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone

def seed_default_papers(apps, schema_editor):
    Exam = apps.get_model('exams', 'Exam')
    Paper = apps.get_model('exams', 'Paper')
    Subject = apps.get_model('exams', 'Subject')
    
    for exam in Exam.objects.all():
        paper, created = Paper.objects.get_or_create(
            exam=exam,
            name="Paper I",
            paper_number="I",
            defaults={'is_active': True}
        )
        # Migrate subjects to this paper
        for subject in Subject.objects.filter(exam=exam):
            subject.paper = paper
            subject.save()

class Migration(migrations.Migration):

    dependencies = [
        ('exams', '0015_questionset_set_type_and_more'),
    ]

    operations = [
        # 1. Create Paper Model
        migrations.CreateModel(
            name='Paper',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('paper_number', models.CharField(blank=True, max_length=50)),
                ('description', models.TextField(blank=True)),
                ('is_active', models.BooleanField(default=True)),
                ('order', models.IntegerField(default=0)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='papers', to='exams.exam')),
            ],
        ),
        
        # 2. Add `paper` field to Subject, nullable first
        migrations.AddField(
            model_name='subject',
            name='paper',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='subjects', to='exams.paper'),
        ),
        
        # 3. Rename Subject.exam to legacy_exam, making it nullable
        migrations.AlterField(
            model_name='subject',
            name='exam',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='legacy_subjects', to='exams.exam'),
        ),
        
        # 4. Run data migration
        migrations.RunPython(seed_default_papers),
        
        # 5. Rename Unit to Chapter
        migrations.RenameModel(
            old_name='Unit',
            new_name='Chapter',
        ),
        
        # 6. Rename Topic.unit to chapter
        migrations.RenameField(
            model_name='topic',
            old_name='unit',
            new_name='chapter',
        ),
        
        # 7. Rename other references of unit to chapter
        migrations.RenameField(
            model_name='questionset',
            old_name='unit',
            new_name='chapter',
        ),
    ]
