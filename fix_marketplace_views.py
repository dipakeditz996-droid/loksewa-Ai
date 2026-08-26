import os

filepath = 'apps/api/marketplace/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''        serializer.save(
            student=self.request.user,
            expected_amount=expected_amount
        )'''

new_block = '''        submission = serializer.save(
            student=self.request.user,
            expected_amount=expected_amount
        )
        
        # If product is a course, automatically create a pending CourseApplication
        if product.category == 'COURSE' and product.course:
            from courses.models import CourseApplication
            CourseApplication.objects.update_or_create(
                student=self.request.user,
                course=product.course,
                defaults={
                    'status': 'pending',
                    'marketplace_payment': submission
                }
            )'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated marketplace views successfully")
else:
    print("Could not find old block to replace in marketplace/views.py")
