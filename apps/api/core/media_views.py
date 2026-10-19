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
from django.http import HttpResponse, HttpResponseNotFound
from django.views.decorators.clickjacking import xframe_options_exempt

from core import google_drive


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
    from notes.models import StudyMaterial
    from exams.models import Examination, SubjectiveSubmission
    from django.http import HttpResponseForbidden

    # Reject unauthenticated/direct proxy access for genuinely protected materials.
    # Official syllabus PDFs remain public; only restricted exam/submission materials
    # should be blocked through this proxy.
    protected_study_materials = StudyMaterial.objects.exclude(content_category='syllabus').only('file')
    is_protected = any(
        _drive_file_id_matches(material.file.name, file_id)
        for material in protected_study_materials
    )

    if not is_protected:
        question_paper_values = Examination.objects.filter(question_paper_pdf__isnull=False).values_list('question_paper_pdf', flat=True)
        answer_pdf_values = SubjectiveSubmission.objects.filter(answer_pdf__isnull=False).values_list('answer_pdf', flat=True)
        is_protected = any(
            _drive_file_id_matches(value, file_id)
            for value in list(question_paper_values) + list(answer_pdf_values)
        )

    if is_protected:
        return HttpResponseForbidden("Direct access to protected materials via Drive proxy is forbidden. Please access files via the authorized download API.")

    try:
        meta = google_drive.get_file(file_id)
    except google_drive.GoogleDriveError:
        return HttpResponse('Could not reach Google Drive.', status=502)

    if meta is None:
        return HttpResponseNotFound('File not found.')

    try:
        content = google_drive.download_file(file_id)
    except google_drive.GoogleDriveError:
        return HttpResponse('Could not reach Google Drive.', status=502)

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
                    response = HttpResponse(chunk, status=206, content_type=meta.get('mimeType') or 'application/octet-stream')
                    response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
                    response['Content-Length'] = str(len(chunk))
                    response['Accept-Ranges'] = 'bytes'
                    response['Cache-Control'] = 'public, max-age=31536000, immutable'
                    response['Access-Control-Allow-Origin'] = '*'
                    response['Cross-Origin-Resource-Policy'] = 'cross-origin'
                    response['Cross-Origin-Opener-Policy'] = 'unsafe-none'
                    filename = meta.get('name', 'document.pdf')
                    response['Content-Disposition'] = f'inline; filename="{filename}"'
                    return response
            except (ValueError, TypeError):
                pass

    response = HttpResponse(content, content_type=meta.get('mimeType') or 'application/octet-stream')
    response['Accept-Ranges'] = 'bytes'
    response['Content-Length'] = str(file_size)
    response['Cache-Control'] = 'public, max-age=31536000, immutable'
    response['Access-Control-Allow-Origin'] = '*'
    response['Cross-Origin-Resource-Policy'] = 'cross-origin'
    response['Cross-Origin-Opener-Policy'] = 'unsafe-none'
    filename = meta.get('name', 'document.pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
