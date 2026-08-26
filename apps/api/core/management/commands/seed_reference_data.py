import json
from django.core.management.base import BaseCommand
from django.db import transaction

from exams.models import ExamCategory, Exam, Paper, Subject, Chapter, Topic
from courses.models import Course
from subscriptions.models import SubscriptionPlan
from marketplace.models import Product

class Command(BaseCommand):
    help = 'Seeds initial reference data for LoksewaAI securely and idempotently.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--load-dev-data',
            action='store_true',
            help='Load placeholder DEVELOPMENT ONLY test data instead of waiting for production data.'
        )

    def handle(self, *args, **options):
        load_dev_data = options['load_dev_data']
        
        self.stdout.write(self.style.WARNING("Starting Reference Data Seeding..."))

        # In a real scenario, this would load from a JSON file.
        # Here we embed the template or development data.
        
        if load_dev_data:
            self.stdout.write(self.style.WARNING("WARNING: Loading DEVELOPMENT ONLY sample data. DO NOT USE IN PRODUCTION."))
            academic_data = self.get_dev_academic_data()
            subscription_data = self.get_dev_subscription_data()
            marketplace_data = self.get_dev_marketplace_data()
        else:
            self.stdout.write("Production data not found in repository. No production data loaded.")
            self.stdout.write("Please run with --load-dev-data to insert sample template records, or supply official Loksewa JSON.")
            return

        with transaction.atomic():
            self.seed_academic_hierarchy(academic_data)
            self.seed_courses_and_subscriptions(subscription_data)
            self.seed_marketplace(marketplace_data)
            
        self.stdout.write(self.style.SUCCESS("Seeding completed safely."))

    def seed_academic_hierarchy(self, data):
        for cat_data in data:
            category, created = ExamCategory.objects.get_or_create(
                name=cat_data['name'],
                defaults={'description': cat_data.get('description', '')}
            )
            
            for exam_data in cat_data.get('exams', []):
                exam, created = Exam.objects.get_or_create(
                    category=category,
                    name=exam_data['name'],
                    defaults={'description': exam_data.get('description', '')}
                )
                
                for paper_data in exam_data.get('papers', []):
                    paper, created = Paper.objects.get_or_create(
                        exam=exam,
                        name=paper_data['name'],
                        defaults={'paper_number': paper_data.get('paper_number', '')}
                    )
                    
                    for sub_data in paper_data.get('subjects', []):
                        subject, created = Subject.objects.get_or_create(
                            paper=paper,
                            name=sub_data['name'],
                            defaults={'code': sub_data.get('code', '')}
                        )
                        
                        for chap_data in sub_data.get('chapters', []):
                            chapter, created = Chapter.objects.get_or_create(
                                subject=subject,
                                title=chap_data['title'],
                                defaults={'description': chap_data.get('description', '')}
                            )
                            
                            for topic_data in chap_data.get('topics', []):
                                Topic.objects.get_or_create(
                                    chapter=chapter,
                                    name=topic_data['name']
                                )
        self.stdout.write(self.style.SUCCESS("Academic hierarchy verified/seeded."))

    def seed_courses_and_subscriptions(self, sub_data):
        for plan in sub_data:
            SubscriptionPlan.objects.get_or_create(
                name=plan['name'],
                defaults={
                    'description': plan.get('description', ''),
                    'duration': plan['duration'],
                    'duration_unit': plan.get('duration_unit', 'MONTHS'),
                    'price': plan['price']
                }
            )
        self.stdout.write(self.style.SUCCESS("Subscriptions verified/seeded."))

    def seed_marketplace(self, product_data):
        for prod in product_data:
            # We assume course might exist for COURSE types
            course_obj = None
            if prod.get('type') == 'COURSE' and prod.get('course_slug'):
                course_obj, _ = Course.objects.get_or_create(
                    slug=prod['course_slug'],
                    defaults={
                        'title': prod['course_title'],
                        'status': 'published',
                        'is_open_for_enrollment': True
                    }
                )
            
            Product.objects.get_or_create(
                title=prod['title'],
                category=prod['type'],
                defaults={
                    'description': prod.get('description', ''),
                    'price': prod['price'],
                    'course': course_obj
                }
            )
        self.stdout.write(self.style.SUCCESS("Marketplace verified/seeded."))

    def get_dev_academic_data(self):
        return [
            {
                "name": "[DEV] Kharidar Preparation",
                "description": "Placeholder category for Kharidar",
                "exams": [
                    {
                        "name": "[DEV] Kharidar First Paper",
                        "papers": [
                            {
                                "name": "[DEV] General Knowledge and Basic Office Skills Test",
                                "paper_number": "1",
                                "subjects": [
                                    {
                                        "name": "[DEV] General Knowledge",
                                        "code": "GK-101",
                                        "chapters": [
                                            {
                                                "title": "[DEV] Geography of Nepal",
                                                "topics": [
                                                    {"name": "[DEV] Rivers and Lakes"},
                                                    {"name": "[DEV] Mountains"}
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]

    def get_dev_subscription_data(self):
        return [
            {
                "name": "[DEV] Basic Monthly Plan",
                "description": "Placeholder subscription plan",
                "duration": 1,
                "duration_unit": "MONTHS",
                "price": 500.00
            }
        ]
        
    def get_dev_marketplace_data(self):
        return [
            {
                "title": "[DEV] Kharidar Complete Course",
                "type": "COURSE",
                "description": "Placeholder course for marketplace",
                "price": 2000.00,
                "course_slug": "dev-kharidar-complete-course",
                "course_title": "[DEV] Kharidar Complete Course"
            }
        ]
