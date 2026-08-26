import json
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
)
from courses.models import Course, Enrollment, TeacherCourseAssignment
from core.models import User
from subscriptions.models import SubscriptionPlan
from gamification.models import GamificationProfile
from marketplace.models import Product

class Command(BaseCommand):
    help = 'Imports real Loksewa academic seed data idempotently.'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='Path to the JSON seed file')

    def handle(self, *args, **options):
        file_path = options['json_file']
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            return

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        try:
            with transaction.atomic():
                self.import_users(data.get('users', []))
                self.import_hierarchy(data.get('hierarchy', []))
                self.import_courses(data.get('courses', []))
                self.stdout.write(self.style.SUCCESS('Successfully imported real data!'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error during import: {str(e)}'))

    def import_users(self, users_data):
        for user_data in users_data:
            user, created = User.objects.get_or_create(
                email=user_data['email'],
                defaults={
                    'username': user_data['username'],
                    'role': user_data.get('role', 'student'),
                    'first_name': user_data.get('first_name', ''),
                    'last_name': user_data.get('last_name', ''),
                    'is_active': True,
                }
            )
            if created:
                user.set_password(user_data.get('password', 'Loksewa@123'))
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Created user: {user.email}"))
            
            if user.role == 'student':
                GamificationProfile.objects.get_or_create(user=user)

    def import_hierarchy(self, hierarchy_data):
        for cat_data in hierarchy_data:
            category, _ = ExamCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data.get('description', '')}
            )
            
            for exam_data in cat_data.get('exams', []):
                exam, _ = Exam.objects.get_or_create(
                    category=category,
                    name=exam_data['name'],
                    defaults={'description': exam_data.get('description', '')}
                )
                
                for paper_data in exam_data.get('papers', []):
                    paper, _ = Paper.objects.get_or_create(
                        exam=exam,
                        name=paper_data['name'],
                        defaults={'paper_number': paper_data.get('paper_number', '')}
                    )
                    
                    for sub_data in paper_data.get('subjects', []):
                        subject, _ = Subject.objects.get_or_create(
                            paper=paper,
                            name=sub_data['name'],
                            defaults={'code': sub_data.get('code', '')}
                        )
                        
                        for chap_data in sub_data.get('chapters', []):
                            chapter, _ = Chapter.objects.get_or_create(
                                subject=subject,
                                title=chap_data['title'],
                            )
                            
                            for top_data in chap_data.get('topics', []):
                                topic, _ = Topic.objects.get_or_create(
                                    chapter=chapter,
                                    name=top_data['name'],
                                )
                                
                                for q_data in top_data.get('questions', []):
                                    question, q_created = Question.objects.get_or_create(
                                        text=q_data['text'],
                                        topic=topic,
                                        defaults={
                                            'question_type': q_data.get('question_type', 'mcq'),
                                            'option_a': q_data.get('option_a', ''),
                                            'option_b': q_data.get('option_b', ''),
                                            'option_c': q_data.get('option_c', ''),
                                            'option_d': q_data.get('option_d', ''),
                                            'correct_option': q_data.get('correct_option', 'A'),
                                            'explanation': q_data.get('explanation', ''),
                                            'marks': q_data.get('marks', 1),
                                            'negative_marks': q_data.get('negative_marks', 0.2),
                                            'difficulty': q_data.get('difficulty', 'medium'),
                                            'status': 'approved'
                                        }
                                    )
                                    if q_created:
                                        self.stdout.write(f"Imported Q: {question.id}")

    def import_courses(self, courses_data):
        for course_data in courses_data:
            exam = Exam.objects.filter(name=course_data['exam_name']).first()
            if not exam:
                self.stdout.write(self.style.WARNING(f"Exam '{course_data['exam_name']}' not found for course. Skipping."))
                continue

            course, created = Course.objects.get_or_create(
                title=course_data['title'],
                exam=exam,
                defaults={
                    'description': course_data.get('description', ''),
                    'price': course_data.get('price', 0),
                    'duration_days': course_data.get('duration_days', 30),
                    'status': 'published'
                }
            )

            # Assign teacher
            teacher_email = course_data.get('teacher_email')
            if teacher_email:
                teacher = User.objects.filter(email=teacher_email, role='teacher').first()
                if teacher:
                    TeacherCourseAssignment.objects.get_or_create(
                        teacher=teacher,
                        course=course,
                        defaults={'role': 'primary'}
                    )
