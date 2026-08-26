import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, TeacherProfile


class IsTeacher:
    """Mixin that ensures the authenticated user is a teacher (or admin)."""
    def _check_teacher(self, request):
        if request.user.role not in ('teacher', 'admin', 'super-admin'):
            return Response({'detail': 'Access restricted to teachers.'}, status=status.HTTP_403_FORBIDDEN)
        return None


class TeacherProfileView(IsTeacher, APIView):
    """
    GET  /api/auth/teacher/profile/  - Return full profile for the authenticated teacher.
    PATCH /api/auth/teacher/profile/ - Update editable profile fields.
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create_profile(self, user):
        profile, _ = TeacherProfile.objects.get_or_create(user=user)
        return profile

    def _build_response(self, user, profile):
        return {
            # User fields
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'name': f"{user.first_name} {user.last_name}".strip() or user.username,
            'email': user.email,
            'role': user.role,
            'is_active': user.is_active,
            'avatar': user.avatar,
            'date_joined': user.date_joined.isoformat(),
            # TeacherProfile fields
            'bio': profile.bio or '',
            'specialization': profile.specialization or '',
            'designation': profile.designation or '',
            'experience_years': profile.experience_years,
            'phone_number': profile.phone_number or '',
            'preferred_difficulty': profile.preferred_difficulty,
            'preferred_question_type': profile.preferred_question_type,
            'profile_updated_at': profile.updated_at.isoformat(),
        }

    def get(self, request):
        err = self._check_teacher(request)
        if err:
            return err
        user = request.user
        profile = self._get_or_create_profile(user)
        return Response(self._build_response(user, profile))

    def patch(self, request):
        err = self._check_teacher(request)
        if err:
            return err

        user = request.user
        profile = self._get_or_create_profile(user)
        data = request.data

        # Update User fields — NEVER allow role/is_active/is_staff changes
        ALLOWED_USER_FIELDS = ['first_name', 'last_name']
        for field in ALLOWED_USER_FIELDS:
            if field in data:
                setattr(user, field, data[field])
        user.save(update_fields=ALLOWED_USER_FIELDS)

        # Update TeacherProfile fields
        ALLOWED_PROFILE_FIELDS = [
            'bio', 'specialization', 'designation', 'experience_years', 'phone_number'
        ]
        for field in ALLOWED_PROFILE_FIELDS:
            if field in data:
                setattr(profile, field, data[field])
        profile.save()

        return Response(self._build_response(user, profile))


class TeacherAvatarUploadView(IsTeacher, APIView):
    """
    POST /api/auth/teacher/avatar/
    Accepts multipart/form-data with an 'image' file.
    Saves to media/avatars/, updates User.avatar with the served URL.
    """
    permission_classes = [IsAuthenticated]

    ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

    def post(self, request):
        err = self._check_teacher(request)
        if err:
            return err

        image = request.FILES.get('image')
        if not image:
            return Response({'detail': 'No image file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if image.content_type not in self.ALLOWED_TYPES:
            return Response(
                {'detail': 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if image.size > self.MAX_SIZE_BYTES:
            return Response(
                {'detail': 'Image too large. Maximum allowed size is 5 MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user
        ext = os.path.splitext(image.name)[1].lower() or '.jpg'
        filename = f"avatars/teacher_{user.id}{ext}"

        # Save to media storage
        saved_path = default_storage.save(filename, ContentFile(image.read()))

        # Build URL using storage backend
        avatar_url = default_storage.url(saved_path)

        # If it's a relative URL (e.g., local storage), make it absolute
        if not avatar_url.startswith('http'):
            avatar_url = request.build_absolute_uri(avatar_url)

        user.avatar = avatar_url
        user.save(update_fields=['avatar'])

        return Response({'avatar_url': avatar_url}, status=status.HTTP_200_OK)


class TeacherChangePasswordView(IsTeacher, APIView):
    """
    POST /api/auth/teacher/change-password/
    Securely changes the authenticated teacher's password.
    Returns new JWT tokens to keep the session active.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        err = self._check_teacher(request)
        if err:
            return err

        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        confirm_password = request.data.get('confirm_password', '')

        if not current_password or not new_password or not confirm_password:
            return Response(
                {'detail': 'All password fields are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user

        # Verify current password
        if not authenticate(username=user.username, password=current_password):
            return Response(
                {'detail': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_password != confirm_password:
            return Response(
                {'detail': 'New passwords do not match.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if current_password == new_password:
            return Response(
                {'detail': 'New password must be different from the current password.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate against Django password validators
        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            return Response(
                {'detail': ' '.join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Change the password
        user.set_password(new_password)
        user.save()

        # Blacklist old refresh token if provided
        refresh_token = request.data.get('refresh_token')
        if refresh_token:
            try:
                old_token = RefreshToken(refresh_token)
                old_token.blacklist()
            except Exception:
                pass  # Already invalid or blacklisted

        # Issue new tokens so the user stays logged in
        new_refresh = RefreshToken.for_user(user)
        return Response({
            'detail': 'Password updated successfully.',
            'access': str(new_refresh.access_token),
            'refresh': str(new_refresh),
        }, status=status.HTTP_200_OK)


class TeacherPreferencesView(IsTeacher, APIView):
    """
    GET  /api/auth/teacher/preferences/  - Return teaching preferences.
    PATCH /api/auth/teacher/preferences/ - Update teaching preferences.
    """
    permission_classes = [IsAuthenticated]

    def _get_or_create_profile(self, user):
        profile, _ = TeacherProfile.objects.get_or_create(user=user)
        return profile

    def get(self, request):
        err = self._check_teacher(request)
        if err:
            return err
        profile = self._get_or_create_profile(request.user)
        return Response({
            'preferred_difficulty': profile.preferred_difficulty,
            'preferred_question_type': profile.preferred_question_type,
        })

    def patch(self, request):
        err = self._check_teacher(request)
        if err:
            return err
        profile = self._get_or_create_profile(request.user)
        allowed = ['preferred_difficulty', 'preferred_question_type']
        for field in allowed:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response({
            'preferred_difficulty': profile.preferred_difficulty,
            'preferred_question_type': profile.preferred_question_type,
        })
