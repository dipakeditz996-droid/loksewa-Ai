"""Admin-facing views for the pending-verification / recovery-code side of
student registration. Kept separate from the already-large views.py,
matching the existing pattern of exam_views.py / question_views.py / etc.

Reuses core.otp (EmailOTP model + create_and_send_otp/verify_otp/
generate_recovery_code) and administration.models.AuditLog - no new
authentication system, no duplicate OTP/recovery model.
"""
import logging

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from core.models import User
from support.models import StudentProfile
from .models import AuditLog
from .permissions import IsAdminUser

logger = logging.getLogger(__name__)


def _exam_position_breakdown(position):
    """Walks a target_position Exam's parent chain to split it back into
    (level, service) for display - position itself is whichever is deepest
    (a Level with no children chosen, or a Service/Faculty under a Level)."""
    if not position:
        return None, None
    if position.parent_id:
        return position.parent, position
    return position, None


def _serialize_pending_profile(profile):
    user = profile.user
    level, service = _exam_position_breakdown(profile.target_position)
    return {
        'id': user.id,
        'name': user.get_full_name() or user.username,
        'username': user.username,
        'email': user.email,
        'phone': profile.phone,
        'permanent_district': profile.permanent_district,
        'permanent_local_level': profile.permanent_local_level,
        'preferred_exam_category': profile.target_category.name if profile.target_category else None,
        'preferred_exam_level': level.name if level else None,
        'preferred_exam_service': service.name if service else None,
        'registered_at': user.date_joined.isoformat(),
        'is_verified': profile.is_verified,
        'status': 'Verified' if profile.is_verified else 'Pending Email Verification',
    }


class AdminPendingVerificationsView(APIView):
    """GET /api/admin/users/pending-verifications/ - students who registered
    but haven't completed email/recovery verification yet. Deliberately
    excludes password, tokens, and OTP/recovery code values."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = StudentProfile.objects.filter(is_verified=False, user__role='student').select_related(
            'user', 'target_category', 'target_position', 'target_position__parent'
        ).order_by('-user__date_joined')
        return Response({'results': [_serialize_pending_profile(p) for p in qs], 'count': qs.count()})


class AdminResendRegistrationOTPView(APIView):
    """POST /api/admin/users/<id>/resend-otp/ - admin-triggered resend of the
    signup verification code, for a student who says they never got it."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = StudentProfile.objects.get_or_create(user=user)
        if profile.is_verified:
            return Response({'error': 'This student is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.otp import create_and_send_otp, OTPError
        try:
            create_and_send_otp(user.email, 'signup')
        except OTPError as e:
            return Response({'error': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        AuditLog.objects.create(
            actor=request.user, action='ADMIN_RESENT_REGISTRATION_OTP',
            entity_type='User', entity_id=str(user.id), details={'email': user.email},
        )
        return Response({'detail': f'Verification code resent to {user.email}.'})


class AdminGenerateRecoveryCodeView(APIView):
    """POST /api/admin/users/<id>/generate-recovery-code/ - for when the
    student can't receive the email OTP at all (full mailbox, spam, wrong
    address, no access). Only admin/super-admin can call this (IsAdminUser
    already excludes teachers). Returns the plaintext code exactly once - it
    is never stored or logged in plaintext; the admin is expected to relay
    it to the student through a secure support channel, not this API."""
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = StudentProfile.objects.get_or_create(user=user)
        if profile.is_verified:
            return Response({'error': 'This student is already verified.'}, status=status.HTTP_400_BAD_REQUEST)

        from core.otp import generate_recovery_code, OTPError, RECOVERY_TTL_MINUTES
        try:
            code = generate_recovery_code(user.email, generated_by=request.user)
        except OTPError as e:
            return Response({'error': str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # No plaintext code in the audit trail - only that one was issued, by whom, for whom.
        AuditLog.objects.create(
            actor=request.user, action='ADMIN_GENERATED_RECOVERY_CODE',
            entity_type='User', entity_id=str(user.id), details={'email': user.email},
        )
        return Response({
            'code': code,
            'expires_in_minutes': RECOVERY_TTL_MINUTES,
            'detail': 'Share this code with the student through a secure support channel. It will not be shown again.',
        })
