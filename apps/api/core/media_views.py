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

from core import google_drive


def drive_media_proxy(request, file_id):
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

    response = HttpResponse(content, content_type=meta.get('mimeType') or 'application/octet-stream')
    # Files are immutable once uploaded (a "replace" creates a new Drive
    # file with a new id via our storage backend), so this is safe to cache
    # aggressively - it also directly reduces how often we hit the Drive
    # API for the same image.
    response['Cache-Control'] = 'public, max-age=31536000, immutable'
    return response
