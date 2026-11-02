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
    is_free = serializers.BooleanField(read_only=True)
    exam_access_configs = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

    def get_exam_access_configs(self, obj):
        from .universal_exam_access import serialize_plan_exam_access
        return serialize_plan_exam_access(obj)

    def validate_slug(self, value):
        if value is None:
            return None
        stripped = str(value).strip()
        return stripped if stripped else None

    def _format_course_detail(self, course):
        if not course:
            return None
        exam = course.exam
        exam_name = exam.name if exam else None
        level_name = exam.parent.name if (exam and exam.parent) else (exam_name if exam_name and 'level' in exam_name.lower() else None)
        category_name = exam.category.name if (exam and exam.category) else None

        parts = []
        if category_name:
            parts.append(category_name)
        if level_name:
            parts.append(level_name)
        if exam_name and exam_name not in parts:
            parts.append(exam_name)
        elif course.title and course.title not in parts:
            parts.append(course.title)
        hierarchy_path = " › ".join(parts) if parts else course.title

        return {
            "id": course.id,
            "title": course.title,
            "exam": exam_name,
            "level": level_name,
            "category": category_name,
            "service": exam_name if exam and exam.parent else None,
            "hierarchy_path": hierarchy_path,
            "status": course.status,
            "is_coming_soon": course.status == 'coming_soon',
        }

    def get_eligible_courses_details(self, obj):
        return [
            self._format_course_detail(c)
            for c in obj.eligible_courses.all()
        ]

    def get_course_details(self, obj):
        if not obj.course:
            return None
        return self._format_course_detail(obj.course)

    def validate(self, data):
        if 'slug' in data:
            slug_val = data.get('slug')
            if slug_val is not None and not str(slug_val).strip():
                data['slug'] = None

        if (
            self.instance
            and self.instance.status == 'ARCHIVED'
            and data.get('status') not in (None, 'ARCHIVED')
        ):
            raise serializers.ValidationError({
                'status': 'Archived packages cannot be republished.'
            })

        is_default_free = data.get('is_default_free', getattr(self.instance, 'is_default_free', False))
        price = data.get('price', getattr(self.instance, 'price', 0))
        status_val = data.get('status', getattr(self.instance, 'status', 'ACTIVE'))
        is_published = data.get('is_published', getattr(self.instance, 'is_published', True))

        if is_default_free:
            from decimal import Decimal
            try:
                p_dec = Decimal(str(price))
            except Exception:
                p_dec = Decimal('0')
            if p_dec > Decimal('0'):
                raise serializers.ValidationError({'price': 'The default Free Plan must have a price of Rs. 0.00.'})
            if status_val != 'ACTIVE':
                raise serializers.ValidationError({'status': 'The default Free Plan must have an ACTIVE status.'})
            if not is_published:
                raise serializers.ValidationError({'is_published': 'The default Free Plan must be published.'})

        package_type = data.get('package_type', getattr(self.instance, 'package_type', 'SINGLE'))
        course = data.get('course', getattr(self.instance, 'course', None))
        eligible_courses = data.get('eligible_courses')

        selected_courses = []
        if 'course' in data and data['course']:
            selected_courses.append(data['course'])
        if 'eligible_courses' in data:
            selected_courses.extend(data['eligible_courses'])
        for selected_course in {item.pk: item for item in selected_courses}.values():
            exam = selected_course.exam
            if selected_course.status != 'published' or not exam:
                raise serializers.ValidationError({
                    'eligible_courses': 'Packages can only grant access to published Courses linked to the active academic hierarchy.'
                })
            node = exam
            while node:
                cat_active = node.category.is_active if getattr(node, 'category', None) else True
                if node.status != 'active' or not cat_active:
                    raise serializers.ValidationError({
                        'eligible_courses': 'Coming Soon or inactive academic nodes cannot be included in packages.'
                    })
                node = node.parent

        if package_type == 'SINGLE':
            # Sync course and eligible_courses if either is provided
            if not course and eligible_courses and len(eligible_courses) == 1:
                data['course'] = eligible_courses[0]
            elif course and (eligible_courses is None or len(eligible_courses) == 0):
                data['eligible_courses'] = [course]
        elif package_type in ('MULTI', 'BUNDLE'):
            if eligible_courses is not None and len(eligible_courses) == 0:
                raise serializers.ValidationError({"eligible_courses": f"Please select at least one eligible preparation for {package_type} packages."})
            if package_type == 'MULTI':
                allowed = data.get('allowed_preparation_count', getattr(self.instance, 'allowed_preparation_count', 1))
                if allowed < 1:
                    raise serializers.ValidationError({"allowed_preparation_count": "Allowed preparations must be at least 1."})
        elif package_type == 'ALL_ACCESS':
            data['course'] = None
            data['eligible_courses'] = []

        exam_configs_raw = self.initial_data.get('exam_access_configs')
        if exam_configs_raw is not None and isinstance(exam_configs_raw, list):
            from .universal_exam_access import validate_exam_for_type, SUPPORTED_EXAM_TYPES, EXAM_TYPE_LABELS
            from exams.models import Examination
            for item in exam_configs_raw:
                if not isinstance(item, dict):
                    continue
                etype = item.get('exam_type')
                if etype and etype not in SUPPORTED_EXAM_TYPES:
                    raise serializers.ValidationError({
                        'exam_access_configs': f"Unsupported exam type: '{etype}'"
                    })
                access_mode = item.get('access_mode', 'ANY')
                if access_mode not in ('ANY', 'SPECIFIC'):
                    raise serializers.ValidationError({
                        'exam_access_configs': f"Invalid access mode '{access_mode}' for exam type '{etype}'"
                    })
                if access_mode == 'SPECIFIC':
                    selected_ids = item.get('selected_exam_ids')
                    if selected_ids is None and item.get('selected_exams'):
                        selected_ids = [
                            e['id'] if isinstance(e, dict) else e for e in item.get('selected_exams', [])
                        ]
                    if selected_ids:
                        exams = Examination.objects.filter(id__in=selected_ids)
                        for ex in exams:
                            if not validate_exam_for_type(ex, etype):
                                label = EXAM_TYPE_LABELS.get(etype, etype)
                                raise serializers.ValidationError({
                                    'exam_access_configs': f"Exam '{ex.title}' does not belong to the '{label}' category."
                                })

        return data

    def _save_exam_access_configs(self, plan, configs_data):
        from .models import PackageExamAccess
        from exams.models import Examination
        from .universal_exam_access import SUPPORTED_EXAM_TYPES

        if configs_data is not None and isinstance(configs_data, list):
            quotas_dict = dict(plan.exam_quotas or {})
            for item in configs_data:
                if not isinstance(item, dict):
                    continue
                etype = item.get('exam_type')
                if not etype or etype not in SUPPORTED_EXAM_TYPES:
                    continue

                is_enabled = bool(item.get('is_enabled', True))
                access_mode = item.get('access_mode', 'ANY')
                try:
                    total_attempts = int(item.get('total_attempts', -1))
                except (ValueError, TypeError):
                    total_attempts = -1

                attempts_per_exam = item.get('attempts_per_exam')
                if attempts_per_exam is not None and attempts_per_exam != '':
                    try:
                        attempts_per_exam = int(attempts_per_exam)
                    except (ValueError, TypeError):
                        attempts_per_exam = None
                else:
                    attempts_per_exam = None

                selected_ids = item.get('selected_exam_ids')
                if selected_ids is None and item.get('selected_exams'):
                    selected_ids = [
                        e['id'] if isinstance(e, dict) else e for e in item.get('selected_exams', [])
                    ]

                access_obj, _ = PackageExamAccess.objects.update_or_create(
                    plan=plan,
                    exam_type=etype,
                    defaults={
                        'is_enabled': is_enabled,
                        'access_mode': access_mode,
                        'total_attempts': total_attempts,
                        'attempts_per_exam': attempts_per_exam,
                    }
                )

                if access_mode == 'SPECIFIC' and selected_ids:
                    exams = Examination.objects.filter(id__in=selected_ids)
                    access_obj.selected_exams.set(exams)
                else:
                    access_obj.selected_exams.clear()

                quotas_dict[etype] = {
                    'enabled': is_enabled,
                    'attempts': total_attempts,
                    'mode': access_mode,
                }

                if etype == 'mock':
                    if access_mode == 'SPECIFIC' and selected_ids:
                        plan.free_mock_exams.set(Examination.objects.filter(id__in=selected_ids))
                        plan.free_mock_attempts = total_attempts
                    elif access_mode == 'ANY':
                        plan.free_mock_exams.clear()
                        plan.free_mock_attempts = total_attempts

            plan.exam_quotas = quotas_dict
            plan.save(update_fields=['exam_quotas', 'free_mock_attempts'])
        elif plan.exam_quotas:
            # Sync from plan.exam_quotas if configs_data was not explicitly sent
            quotas = plan.exam_quotas
            for etype, q in quotas.items():
                if etype in SUPPORTED_EXAM_TYPES:
                    enabled = q.get('enabled', True) if isinstance(q, dict) else (q != 0)
                    attempts = q.get('attempts', -1) if isinstance(q, dict) else int(q)
                    mode = q.get('mode', 'ANY') if isinstance(q, dict) else 'ANY'
                    PackageExamAccess.objects.update_or_create(
                        plan=plan,
                        exam_type=etype,
                        defaults={
                            'is_enabled': enabled,
                            'access_mode': mode,
                            'total_attempts': attempts,
                        }
                    )

    def create(self, validated_data):
        plan = super().create(validated_data)
        configs_data = self.initial_data.get('exam_access_configs')
        self._save_exam_access_configs(plan, configs_data)
        return plan

    def update(self, instance, validated_data):
        plan = super().update(instance, validated_data)
        configs_data = self.initial_data.get('exam_access_configs')
        self._save_exam_access_configs(plan, configs_data)
        return plan


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    remaining_days = serializers.SerializerMethodField()
    computed_status = serializers.SerializerMethodField()
    authorized_courses = serializers.SerializerMethodField()
    granted_by_username = serializers.CharField(source='granted_by.username', read_only=True, default=None)
    access_source = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ('student', 'status', 'start_date', 'expiry_date')

    def get_access_source(self, obj):
        return "Admin Granted" if obj.source == 'ADMIN_GRANT' else "Student Payment"

    def get_authorized_courses(self, obj):
        request = self.context.get('request')
        cache_attr = f'_auth_courses_{obj.student_id}'
        if request and hasattr(request, cache_attr):
            return getattr(request, cache_attr)
        from courses.models import Enrollment
        enrollments = Enrollment.objects.filter(student=obj.student, status='active').select_related('course', 'course__exam')
        res = [
            {
                "id": e.course.id,
                "title": e.course.title,
                "exam": e.course.exam.name if e.course.exam else None,
            }
            for e in enrollments
        ]
        if request:
            setattr(request, cache_attr, res)
        return res

    has_expiry = serializers.BooleanField(read_only=True)

    def get_remaining_days(self, obj):
        """Derived from expiry_date when present."""
        if obj.status != 'ACTIVE':
            return 0
        if not obj.expiry_date or obj.expiry_date.year < 2000:
            return None
        delta = obj.expiry_date - timezone.now()
        return max(delta.days, 0)

    def get_computed_status(self, obj):
        if obj.status != 'ACTIVE':
            return obj.status
        if not obj.expiry_date or obj.expiry_date.year < 2000:
            return 'ACTIVE'
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
    verification_status_display = serializers.CharField(source='get_verification_status_display', read_only=True)
    
    class Meta:
        model = SubscriptionPayment
        fields = '__all__'
        read_only_fields = (
            'student', 'amount', 'status', 'rejection_reason', 'verified_at', 'verified_by',
            'verification_status', 'verification_result', 'ai_verification_at'
        )

    def get_selected_courses(self, obj):
        apps = list(obj.course_applications.all())
        res = [
            {
                "id": app.course.id,
                "title": app.course.title,
                "exam": app.course.exam.name if (app.course and app.course.exam) else None
            }
            for app in apps if app.course
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


class StudentEntitlementSerializer(serializers.ModelSerializer):
    remaining = serializers.IntegerField(read_only=True)
    is_unlimited = serializers.BooleanField(read_only=True)

    class Meta:
        from .models import StudentEntitlement
        model = StudentEntitlement
        fields = '__all__'


class UsageLedgerSerializer(serializers.ModelSerializer):
    admin_name = serializers.CharField(source='admin_user.get_full_name', read_only=True, default=None)

    class Meta:
        from .models import UsageLedger
        model = UsageLedger
        fields = '__all__'

