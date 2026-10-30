"""Serves Drive-hosted media through our own domain instead of linking the
browser straight to Google's public CDN - see google_drive.get_file_url for
why (an undocumented per-referer rate limit on that CDN was breaking every
Drive-hosted image on the site for a browser that had loaded a burst of
pages). Every FileField/ImageField URL in the app points here.

No auth is required to fetch a file - this matches the security posture the
app already had under the R2/S3 setup it replaced (AWS_DEFAULT_ACL was
'public-read' there too), not a new gap introduced by this proxy. A student
with a saved link can still fetch a payment screenshot the way they always
could with a public-read S3 URL; per-file access control is a separate,
larger feature, not something this endpoint changes either way.
"""
from django.http import HttpResponse, HttpResponseNotFound, HttpResponseForbidden, HttpResponseRedirect
from django.views.decorators.clickjacking import xframe_options_exempt

from core import google_drive


def _get_authenticated_user(request):
    """Attempt to resolve user from request.user, session, Authorization Bearer token, or ?token= query param."""
    user = getattr(request, 'user', None)
    if user and user.is_authenticated:
        return user

    from core.authentication import ProfileAwareJWTAuthentication
    jwt_auth = ProfileAwareJWTAuthentication()

    # 1. Check HTTP Authorization header
    try:
        auth_res = jwt_auth.authenticate(request)
        if auth_res:
            return auth_res[0]
    except Exception:
        pass

    # 2. Check query parameter `token` or `jwt`
    token_param = request.GET.get('token') or request.GET.get('jwt')
    if token_param:
        try:
            validated_token = jwt_auth.get_validated_token(token_param)
            return jwt_auth.get_user(validated_token)
        except Exception:
            pass

    return None


def _drive_file_id_matches(value, file_id):
    """Return True when the stored Drive-backed file value resolves to the same
    file ID. The backend stores Drive object names in the form
    '<file_id>__original.pdf', so exact ID comparison is safer than a broad
    substring match that can accidentally classify unrelated files as protected."""
    if not value:
        return False
    name = str(value).replace('\\', '/')
    if '/' in name:
        name = name.rsplit('/', 1)[1]
    if '__' not in name:
        return False
    stored_id, _, _ = name.partition('__')
    return stored_id == file_id


@xframe_options_exempt
def drive_media_proxy(request, file_id):
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        response = HttpResponse(status=200)
        origin = request.META.get('HTTP_ORIGIN')
        response['Access-Control-Allow-Origin'] = origin if origin else '*'
        if origin:
            response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Methods'] = 'GET, HEAD, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Range'
        return response

    from notes.models import StudyMaterial
    from exams.models import Examination, SubjectiveSubmission
    from courses.services.course_access_service import CourseAccessService

    # Check if the requested file belongs to protected resources
    matching_material = None
    matching_exam = None
    matching_submission = None

    # Check StudyMaterial (excluding public syllabus)
    materials = StudyMaterial.objects.exclude(content_category='syllabus').filter(file__contains=file_id)
    for mat in materials:
        if _drive_file_id_matches(mat.file.name, file_id):
            matching_material = mat
            break

    if not matching_material:
        # Fallback check across all non-syllabus materials in case file path doesn't contain file_id directly
        all_materials = StudyMaterial.objects.exclude(content_category='syllabus').only('id', 'file', 'course_id', 'exam_id', 'status', 'access_type')
        for mat in all_materials:
            if _drive_file_id_matches(mat.file.name, file_id):
                matching_material = mat
                break

    if not matching_material:
        candidate_exams = Examination.objects.filter(question_paper_pdf__contains=file_id)
        for exam in candidate_exams:
            if _drive_file_id_matches(exam.question_paper_pdf, file_id):
                matching_exam = exam
                break

    if not matching_material and not matching_exam:
        candidate_submissions = SubjectiveSubmission.objects.filter(answer_pdf__contains=file_id)
        for sub in candidate_submissions:
            if _drive_file_id_matches(sub.answer_pdf, file_id):
                matching_submission = sub
                break

    is_protected = bool(matching_material or matching_exam or matching_submission)

    # Reject unauthenticated/unauthorized proxy access for genuinely protected materials.
    # Official syllabus PDFs remain public; only restricted exam/submission materials
    # and course notes should be blocked when unauthenticated/unauthorized.
    if is_protected:
        user = _get_authenticated_user(request)
        if not user:
            return HttpResponseForbidden(
                "Direct access to protected materials via Drive proxy is forbidden. Please access files via the authorized download API."
            )

        if CourseAccessService.is_privileged(user):
            has_access = True
        elif matching_material:
            has_access = CourseAccessService.has_note_access(user, matching_material)
        elif matching_exam:
            has_access = CourseAccessService.filter_examinations_queryset(
                user, Examination.objects.filter(id=matching_exam.id)
            ).exists()
        elif matching_submission:
            has_access = (matching_submission.student_id == user.id)
        else:
            has_access = False

        if not has_access:
            return HttpResponseForbidden("You do not have access to this protected resource.")

    try:
        meta = google_drive.get_file(file_id)
    except google_drive.GoogleDriveError:
        if not is_protected:
            return HttpResponseRedirect(f'https://lh3.googleusercontent.com/d/{file_id}')
        return HttpResponse('Could not reach Google Drive.', status=502)

    if meta is None:
        if not is_protected:
            return HttpResponseRedirect(f'https://lh3.googleusercontent.com/d/{file_id}')
        return HttpResponseNotFound('File not found.')

    try:
        content = google_drive.download_file(file_id)
    except google_drive.GoogleDriveError:
        if not is_protected:
            return HttpResponseRedirect(f'https://lh3.googleusercontent.com/d/{file_id}')
        return HttpResponse('Could not reach Google Drive.', status=502)

    from core.pdf_utils import resolve_file_display_info, inject_pdf_title, build_content_disposition

    display_title, _ = resolve_file_display_info(file_id)
    if not display_title:
        display_title = meta.get('name', 'document.pdf')

    mime_type = meta.get('mimeType') or 'application/octet-stream'
    if content.startswith(b'%PDF-') or 'pdf' in mime_type.lower():
        content = inject_pdf_title(content, display_title)
        mime_type = 'application/pdf'

    content_disposition = build_content_disposition(display_title, disposition_type='inline')

    origin = request.META.get('HTTP_ORIGIN')
    allow_origin = origin if origin else '*'
    cache_control = 'private, no-cache' if is_protected else 'public, max-age=31536000, immutable'

    file_size = len(content)
    range_header = request.META.get('HTTP_RANGE', '').strip()
    if range_header and range_header.startswith('bytes=') and file_size > 0:
        byte_range = range_header[6:].strip()
        if ',' not in byte_range:
            parts = byte_range.split('-')
            start_str = parts[0].strip()
            end_str = parts[1].strip() if len(parts) > 1 else ''
            try:
                if start_str and end_str:
                    start = int(start_str)
                    end = min(int(end_str), file_size - 1)
                elif start_str:
                    start = int(start_str)
                    end = file_size - 1
                elif end_str:
                    start = max(0, file_size - int(end_str))
                    end = file_size - 1
                else:
                    start = 0
                    end = file_size - 1

                if 0 <= start <= end < file_size:
                    chunk = content[start:end + 1]
                    response = HttpResponse(chunk, status=206, content_type=mime_type)
                    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                    response['Content-Length'] = str(len(chunk))
                    response['Accept-Ranges'] = 'bytes'
                    response['Cache-Control'] = cache_control
                    response['Access-Control-Allow-Origin'] = allow_origin
                    if origin:
                        response['Access-Control-Allow-Credentials'] = 'true'
                    response['Cross-Origin-Resource-Policy'] = 'cross-origin'
                    response['Cross-Origin-Opener-Policy'] = 'unsafe-none'
                    response['Content-Disposition'] = content_disposition
                    return response
            except (ValueError, TypeError):
                pass

    response = HttpResponse(content, content_type=mime_type)
    response['Accept-Ranges'] = 'bytes'
    response['Content-Length'] = str(file_size)
    response['Cache-Control'] = cache_control
    response['Access-Control-Allow-Origin'] = allow_origin
    if origin:
        response['Access-Control-Allow-Credentials'] = 'true'
    response['Cross-Origin-Resource-Policy'] = 'cross-origin'
    response['Cross-Origin-Opener-Policy'] = 'unsafe-none'
    response['Content-Disposition'] = content_disposition
    return response
