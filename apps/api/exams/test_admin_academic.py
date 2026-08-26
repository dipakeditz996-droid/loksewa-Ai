from rest_framework.test import APITestCase
from rest_framework import status
from core.models import User
from exams.models import (
    ExamCategory, Exam, Paper, Subject, Chapter, Topic, Question
)

class AdminAcademicHierarchyTests(APITestCase):

    def setUp(self):
        # Create users
        self.student = User.objects.create_user(username='student', password='password', role='student')
        self.teacher = User.objects.create_user(username='teacher', password='password', role='teacher')
        self.admin = User.objects.create_user(username='admin', password='password', role='admin')
        
        # Create base academic data
        self.category = ExamCategory.objects.create(name='Loksewa')
        self.exam = Exam.objects.create(category=self.category, name='Section Officer')
        self.paper = Paper.objects.create(exam=self.exam, name='General Knowledge')
        self.subject = Subject.objects.create(paper=self.paper, name='Constitution')
        self.chapter = Chapter.objects.create(subject=self.subject, title='Fundamental Rights')
        self.topic = Topic.objects.create(chapter=self.chapter, name='Right to Equality')
        
        self.category_url = '/api/admin/academic/categories/'
        self.exam_url = '/api/admin/academic/exams/'
        self.paper_url = '/api/admin/academic/papers/'
        self.subject_url = '/api/admin/academic/subjects/'
        self.chapter_url = '/api/admin/academic/chapters/'
        self.topic_url = '/api/admin/academic/topics/'
        self.tree_url = '/api/admin/academic/tree/'

    def test_authentication_required(self):
        # Anonymous
        response = self.client.get(self.category_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Student
        self.client.force_authenticate(user=self.student)
        response = self.client.get(self.category_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Teacher
        self.client.force_authenticate(user=self.teacher)
        response = self.client.get(self.category_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Admin
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.category_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_crud(self):
        self.client.force_authenticate(user=self.admin)
        
        # Create Category
        res = self.client.post(self.category_url, {'name': 'New Category'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_category_id = res.data['id']
        
        # Create Exam
        res = self.client.post(self.exam_url, {'category': new_category_id, 'name': 'New Exam'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_exam_id = res.data['id']
        
        # Create Paper
        res = self.client.post(self.paper_url, {'exam': new_exam_id, 'name': 'New Paper'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_paper_id = res.data['id']
        
        # Create Subject
        res = self.client.post(self.subject_url, {'paper': new_paper_id, 'name': 'New Subject'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_subject_id = res.data['id']
        
        # Create Chapter
        res = self.client.post(self.chapter_url, {'subject': new_subject_id, 'title': 'New Chapter'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_chapter_id = res.data['id']
        
        # Create Topic
        res = self.client.post(self.topic_url, {'chapter': new_chapter_id, 'name': 'New Topic'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        new_topic_id = res.data['id']

        # Clean delete (bottom-up)
        self.assertEqual(self.client.delete(f"{self.topic_url}{new_topic_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.delete(f"{self.chapter_url}{new_chapter_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.delete(f"{self.subject_url}{new_subject_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.delete(f"{self.paper_url}{new_paper_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.delete(f"{self.exam_url}{new_exam_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.delete(f"{self.category_url}{new_category_id}/").status_code, status.HTTP_204_NO_CONTENT)

    def test_validation_invalid_parent(self):
        self.client.force_authenticate(user=self.admin)
        # Try to create Exam without category
        res = self.client.post(self.exam_url, {'name': 'New Exam'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Try with invalid category ID
        res = self.client.post(self.exam_url, {'category': 9999, 'name': 'New Exam'})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filtering_and_search(self):
        self.client.force_authenticate(user=self.admin)
        
        # Filter exams by category
        res = self.client.get(f"{self.exam_url}?category={self.category.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(len(res.data), 1)
        
        empty_cat = ExamCategory.objects.create(name='Empty')
        res = self.client.get(f"{self.exam_url}?category={empty_cat.id}")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)
        
        # Search topic by name
        res = self.client.get(f"{self.topic_url}?search=Right to Equality")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 1)
        
        res = self.client.get(f"{self.topic_url}?search=Nonexistent")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 0)

    def test_delete_protection(self):
        self.client.force_authenticate(user=self.admin)
        
        # Try to delete Chapter that has Topic
        res = self.client.delete(f"{self.chapter_url}{self.chapter.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)
        
        # Create Question tied to Topic
        question = Question.objects.create(topic=self.topic, text="What is equality?", status='approved')
        
        # Try to delete Topic that has Question
        res = self.client.delete(f"{self.topic_url}{self.topic.id}/")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", res.data)
        
        # Delete Question manually
        question.delete()
        
        # Now Topic delete should succeed
        res = self.client.delete(f"{self.topic_url}{self.topic.id}/")
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_tree_endpoint(self):
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(self.tree_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Ensure correct nested structure
        self.assertTrue(len(res.data) > 0)
        first_cat = res.data[0]
        self.assertEqual(first_cat['name'], 'Loksewa')
        self.assertTrue('exams' in first_cat)
        
        first_exam = first_cat['exams'][0]
        self.assertEqual(first_exam['name'], 'Section Officer')
        self.assertTrue('papers' in first_exam)
        
        first_paper = first_exam['papers'][0]
        self.assertEqual(first_paper['name'], 'General Knowledge')
        self.assertTrue('subjects' in first_paper)
        
        first_subject = first_paper['subjects'][0]
        self.assertEqual(first_subject['name'], 'Constitution')
        self.assertTrue('chapters' in first_subject)
        
        first_chapter = first_subject['chapters'][0]
        self.assertEqual(first_chapter['title'], 'Fundamental Rights')
        self.assertTrue('topics' in first_chapter)
        
        first_topic = first_chapter['topics'][0]
        self.assertEqual(first_topic['name'], 'Right to Equality')
