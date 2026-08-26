import os
import re

# 1. Update subscriptions/models.py to remove Notification model
filepath = 'apps/api/subscriptions/models.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'class Notification\(models\.Model\):.*?def __str__\(self\):.*?return f"To \{self\.student\.username\}: \{self\.title\}"\n', re.DOTALL)
if pattern.search(content):
    content = pattern.sub('', content)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Removed Notification from subscriptions/models.py")

# 2. Update subscriptions/serializers.py
filepath = 'apps/api/subscriptions/serializers.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Notification, Invoice',
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice\nfrom core.models import Notification'
)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated subscriptions/serializers.py")

# 3. Update subscriptions/admin.py
filepath = 'apps/api/subscriptions/admin.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Notification, Invoice',
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice\nfrom core.models import Notification'
)
with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated subscriptions/admin.py")

# 4. Update subscriptions/views.py
filepath = 'apps/api/subscriptions/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Notification, Invoice',
    'from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice\nfrom core.models import Notification'
)

# Update Notification.objects.create calls
content = content.replace('student=self.request.user', 'recipient=self.request.user')
content = content.replace('student=payment.student', 'recipient=payment.student')

content = content.replace("type='PAYMENT_SUBMITTED'", "type='payment'")
content = content.replace("type='PAYMENT_APPROVED'", "type='payment'")
content = content.replace("type='PAYMENT_REJECTED'", "type='payment'")

# Add mark_all_read
mark_all_read_method = '''    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({'status': 'all_read'})'''

if 'def mark_read' in content:
    content = content.replace(
        "    @action(detail=True, methods=['post'])\n    def mark_read",
        mark_all_read_method + "\n\n    @action(detail=True, methods=['post'])\n    def mark_read"
    )

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated subscriptions/views.py")

