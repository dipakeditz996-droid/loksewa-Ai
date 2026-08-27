from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()

class SupportE2EFlowTests(APITestCase):
    def setUp(self):
        # Create student user
        self.student = User.objects.create_user(
            username='student1',
            password='password123',
            email='student1@example.com',
            role='student'
        )
        
        # Create admin user
        self.admin = User.objects.create_superuser(
            username='admin1',
            password='password123',
            email='admin1@example.com',
            role='admin'
        )

    def test_end_to_end_support_flow(self):
        # 1. Login as student and create a ticket
        self.client.force_authenticate(user=self.student)
        
        ticket_data = {
            'subject': 'Help with exam',
            'category': 'technical',
            'priority': 'high',
            'description': 'I cannot open my exam.'
        }
        
        # Student creates ticket
        response = self.client.post('/api/support/support/tickets/', ticket_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, "Student should be able to create a ticket")
        
        from support.models import SupportTicket
        ticket_id = SupportTicket.objects.get(student=self.student).id
        
        # 2. Login as admin and verify ticket appears
        self.client.force_authenticate(user=self.admin)
        
        # Check tickets list
        response = self.client.get('/api/admin/support/tickets/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, "Admin should be able to get tickets list")
        
        # Ensure the ticket is in the list
        tickets = response.data['tickets']
        self.assertTrue(any(t['id'] == ticket_id for t in tickets), "Admin should see the created ticket in the list")
        
        # Verify the global summary is working
        summary = response.data.get('summary', {})
        self.assertEqual(summary.get('total'), 1)
        self.assertEqual(summary.get('open'), 1)
        self.assertEqual(summary.get('high_priority'), 1)
        
        # 3. Admin replies to ticket
        reply_data = {
            'message': 'We are looking into this issue right now.'
        }
        response = self.client.post(f'/api/admin/support/tickets/{ticket_id}/reply/', reply_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, "Admin should be able to reply to ticket")
        
        # 4. Admin updates status and priority
        update_data = {
            'status': 'in_progress',
            'priority': 'urgent'
        }
        response = self.client.patch(f'/api/admin/support/tickets/{ticket_id}/status/', update_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK, "Admin should be able to update status/priority")
        
        # 5. Login back as student and see the reply and updated status
        self.client.force_authenticate(user=self.student)
        response = self.client.get(f'/api/support/support/tickets/{ticket_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, "Student should be able to view their ticket")
        
        # Check status was updated
        self.assertEqual(response.data['status'], 'in_progress')
        self.assertEqual(response.data['priority'], 'urgent')
        
        # Check messages (should be 2: initial description + admin reply)
        messages = response.data.get('messages', [])
        self.assertEqual(len(messages), 2)
        
        admin_reply = messages[1]
        self.assertEqual(admin_reply['message'], 'We are looking into this issue right now.')
        self.assertTrue(admin_reply['is_staff_reply'])

