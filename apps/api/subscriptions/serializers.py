from django.utils import timezone
from rest_framework import serializers
from .models import SubscriptionPlan, Subscription, SubscriptionPayment, Invoice
from core.models import Notification
from marketplace.serializers import PaymentMethodSerializer
from core.models import User

# No existing product rule defines "expiring soon" - this is the simple,
# documented default the spec allows in the absence of one.
EXPIRING_SOON_THRESHOLD_DAYS = 7

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    eligible_courses_details = serializers.SerializerMethodField(read_only=True)
    course_details = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

    def get_eligible_courses_details(self, obj):
        details = []
        for course in obj.eligible_courses.select_related('exam', 'exam__parent', 'exam__category').all():
            exam_name = course.exam.name if course.exam else None
            level = course.exam.parent.name if (course.exam and course.exam.parent) else (exam_name if exam_name and 'level' in exam_name.lower() else None)
            details.append({
                "id": course.id,
                "title": course.title,
                "exam": exam_name,
                "level": level,
                "service": exam_name if course.exam and course.exam.parent else None,
            })
        return details

    def get_course_details(self, obj):
        if not obj.course:
            return None
        c = obj.course
        return {
            "id": c.id,
            "title": c.title,
            "exam": c.exam.name if c.exam else None,
        }

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    computed_status = serializers.SerializerMethodField()
    authorized_courses = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ('student', 'status', 'start_date', 'expiry_date')

    def get_authorized_courses(self, obj):
        from courses.models import Enrollment
        enrollments = Enrollment.objects.filter(student=obj.student, status='active').select_related('course', 'course__exam')
        return [
            {
                "id": e.course.id,
                "title": e.course.title,
                "exam": e.course.exam.name if e.course.exam else None,
            }
            for e in enrollments
        ]

    def get_remaining_days(self, obj):
        """Derived from expiry_date, never stored - stays correct without a
        background job having to decrement anything."""
        if obj.status != 'ACTIVE':
            return 0
        delta = obj.expiry_date - timezone.now()
        return max(delta.days, 0)

    def get_computed_status(self, obj):
        if obj.status != 'ACTIVE':
            return obj.status
        if obj.expiry_date <= timezone.now():
            return 'EXPIRED'
        if (obj.expiry_date - timezone.now()).days <= EXPIRING_SOON_THRESHOLD_DAYS:
            return 'EXPIRING_SOON'
        return 'ACTIVE'

class SubscriptionPaymentSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)
    student_name = serializers.CharField(source='student.get_full_name', read_only=True)
    selected_courses = serializers.SerializerMethodField()
    
    class Meta:
        model = SubscriptionPayment
        fields = '__all__'
        read_only_fields = ('student', 'amount', 'status', 'rejection_reason', 'verified_at', 'verified_by')

    def get_selected_courses(self, obj):
        apps = list(obj.course_applications.select_related('course', 'course__exam'))
        res = [
            {
                "id": app.course.id,
                "title": app.course.title,
                "exam": app.course.exam.name if app.course.exam else None
            }
            for app in apps
        ]
        if not res and obj.plan and obj.plan.course:
            res.append({
                "id": obj.plan.course.id,
                "title": obj.plan.course.title,
                "exam": obj.plan.course.exam.name if obj.plan.course.exam else None
            })
        return res

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ('student', 'type', 'title', 'message', 'related_id')

class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = '__all__'
