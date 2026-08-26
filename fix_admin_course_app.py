import os
import re

filepath = 'apps/api/administration/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# In AdminCourseApplicationView GET method
old_block = '''        qs = CourseApplication.objects.select_related(
            'student', 'course', 'subscription_payment', 'subscription_payment__plan',
            'reviewed_by'
        ).order_by('-applied_at')'''

new_block = '''        qs = CourseApplication.objects.select_related(
            'student', 'course', 'subscription_payment', 'subscription_payment__plan',
            'marketplace_payment', 'marketplace_payment__product',
            'reviewed_by'
        ).order_by('-applied_at')'''

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("Could not find select_related block")

old_block_2 = '''                'payment': {
                    'id': payment.id,
                    'status': payment.status,
                    'amount': str(payment.amount),
                    'plan_name': payment.plan.name,
                    'submitted_at': payment.submitted_at,
                } if payment else None,'''

new_block_2 = '''                'payment': {
                    'id': app.subscription_payment.id,
                    'status': app.subscription_payment.status,
                    'amount': str(app.subscription_payment.amount),
                    'plan_name': app.subscription_payment.plan.name,
                    'submitted_at': app.subscription_payment.submitted_at,
                    'type': 'subscription'
                } if app.subscription_payment else ({
                    'id': app.marketplace_payment.id,
                    'status': app.marketplace_payment.status,
                    'amount': str(app.marketplace_payment.submitted_amount),
                    'plan_name': app.marketplace_payment.product.title,
                    'submitted_at': app.marketplace_payment.submitted_at,
                    'type': 'marketplace'
                } if app.marketplace_payment else None),'''

if old_block_2 in content:
    content = content.replace(old_block_2, new_block_2)
else:
    print("Could not find payment serialization block")
    
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated AdminCourseApplicationView successfully")
