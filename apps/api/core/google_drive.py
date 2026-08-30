"""Google Drive service layer - the only module in this codebase that talks
to the Google Drive API directly. Everything else (the Storage backend,
views, etc.) goes through the functions here.

Authentication is OAuth 2.0 user authorization (NOT a service account) -
uploads belong to and count against the real personal Drive account that
ran `manage.py drive_authorize`, using its actual 15GB quota. See that
command's docstring for the one-time setup.

Never log: access tokens, refresh tokens, client secrets, authorization
codes, or full file content. Only safe diagnostic fields (file id, name,
mime type, sizes, HTTP status codes) are logged.
"""
import io
import logging
import os
import threading

from django.conf import settings

logger = logging.getLogger('core.google_drive')

FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'

# In-process cache of folder name -> Drive folder ID, keyed by parent folder
# ID. Avoids a Drive search API call on every single upload for the lifetime
# of this worker process. Not persisted - a fresh worker just repopulates it
# via get_or_create_drive_folder, which is itself idempotent (search-before-create).
_folder_cache = {}
_folder_cache_lock = threading.Lock()

# Reused across requests within a worker; google-auth's Credentials object
# refreshes its own access token in place when expired, so one instance is
# fine to hold for the process lifetime.
_credentials = None
_credentials_lock = threading.Lock()


class GoogleDriveError(Exception):
    """Raised for any Drive operation failure. Never carries secrets."""
    pass


def _notify_storage_failure(detail):
    """Best-effort admin alert for a Drive failure. Deliberately swallows its
    own errors - a broken notification path must never mask the real
    GoogleDriveError this is called right before raising."""
    try:
        from core.notification_service import NotificationService
        NotificationService.notify_system_failure(
            component='Google Drive Storage',
            detail=detail,
            action_url='/admin-dashboard/settings',
        )
    except Exception:
        pass


def is_configured():
    """True if all four required env vars are present. Used by settings.py
    to decide whether Drive-backed storage is even selectable, and by the
    storage health check endpoint."""
    return all([
        os.environ.get('GOOGLE_DRIVE_CLIENT_ID', '').strip(),
        os.environ.get('GOOGLE_DRIVE_CLIENT_SECRET', '').strip(),
        os.environ.get('GOOGLE_DRIVE_REFRESH_TOKEN', '').strip(),
        os.environ.get('GOOGLE_DRIVE_ROOT_FOLDER_ID', '').strip(),
    ])


def get_credentials(force_refresh=False):
    """Returns valid OAuth credentials, refreshing the access token if
    expired. Raises GoogleDriveError (never the underlying exception, which
    could carry request/response detail) if the refresh token itself is
    invalid or revoked."""
    global _credentials

    if not is_configured():
        raise GoogleDriveError(
            'Google Drive is not configured. Set GOOGLE_DRIVE_CLIENT_ID, '
            'GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN, and '
            'GOOGLE_DRIVE_ROOT_FOLDER_ID.'
        )

    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    with _credentials_lock:
        if _credentials is None:
            _credentials = Credentials(
                token=None,
                refresh_token=os.environ['GOOGLE_DRIVE_REFRESH_TOKEN'].strip(),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=os.environ['GOOGLE_DRIVE_CLIENT_ID'].strip(),
                client_secret=os.environ['GOOGLE_DRIVE_CLIENT_SECRET'].strip(),
                scopes=['https://www.googleapis.com/auth/drive.file'],
            )

        if force_refresh or not _credentials.valid:
            try:
                _credentials.refresh(Request())
            except Exception as e:
                logger.error('Google Drive credential refresh failed: %s', type(e).__name__)
                raise GoogleDriveError(
                    'Could not refresh Google Drive access token. The refresh token may '
                    'have been revoked - re-run `manage.py drive_authorize`.'
                ) from None

        return _credentials


def _get_service():
    from googleapiclient.discovery import build
    return build('drive', 'v3', credentials=get_credentials(), cache_discovery=False)


def get_or_create_drive_folder(name, parent_id):
    """Finds a folder named `name` directly under `parent_id`, creating it
    only if it doesn't already exist. Cached in-process so repeat uploads
    into the same folder (e.g. course-media) don't re-search Drive every
    time. Returns the folder's Drive file ID."""
    cache_key = (parent_id, name)
    with _folder_cache_lock:
        if cache_key in _folder_cache:
            return _folder_cache[cache_key]

    service = _get_service()
    safe_name = name.replace("'", "\\'")
    query = (
        f"name = '{safe_name}' and mimeType = '{FOLDER_MIME_TYPE}' "
        f"and '{parent_id}' in parents and trashed = false"
    )
    try:
        results = service.files().list(q=query, fields='files(id, name)', pageSize=1).execute()
    except Exception as e:
        logger.error('Google Drive folder lookup failed: %s', type(e).__name__)
        raise GoogleDriveError('Could not search Google Drive for folder.') from None

    existing = results.get('files', [])
    if existing:
        folder_id = existing[0]['id']
    else:
        try:
            created = service.files().create(
                body={'name': name, 'mimeType': FOLDER_MIME_TYPE, 'parents': [parent_id]},
                fields='id',
            ).execute()
        except Exception as e:
            logger.error('Google Drive folder creation failed: %s', type(e).__name__)
            raise GoogleDriveError('Could not create Google Drive folder.') from None
        folder_id = created['id']
        logger.info('Created Drive folder "%s" under parent %s', name, parent_id)

    with _folder_cache_lock:
        _folder_cache[cache_key] = folder_id
    return folder_id


# Maps the leading segment of a model's `upload_to` path to one of the fixed
# subfolders under the LoksewaAI root. Anything unmatched goes to "other".
_CATEGORY_FOLDERS = {
    'avatars': 'avatars',
    'courses': 'course-media',
    'exams': 'course-media',
    'study_materials': 'study-materials',
    'question-images': 'question-images',
    'subjective-answers': 'subjective-answers',
}


def _resolve_target_folder(relative_path):
    """Given a storage-relative path like 'courses/thumbnails/foo.jpg',
    returns the Drive folder ID it belongs in, creating the category
    subfolder under the LoksewaAI root on first use."""
    root_id = os.environ['GOOGLE_DRIVE_ROOT_FOLDER_ID'].strip()
    relative_path = relative_path.replace('\\', '/')
    first_segment = relative_path.split('/', 1)[0] if '/' in relative_path else ''
    category = _CATEGORY_FOLDERS.get(first_segment, 'other')
    return get_or_create_drive_folder(category, root_id)


def upload_file(relative_path, file_obj, mime_type=None):
    """Uploads file_obj (any file-like object opened for reading in binary
    mode) into the correct category subfolder, named after the last segment
    of relative_path. Returns a dict: {id, name, mimeType, size, webViewLink}.

    Uses resumable upload via MediaIoBaseUpload so large files aren't
    buffered entirely in memory beyond googleapiclient's own chunking.
    """
    from googleapiclient.http import MediaIoBaseUpload

    relative_path = relative_path.replace('\\', '/')
    service = _get_service()
    parent_id = _resolve_target_folder(relative_path)
    filename = relative_path.rsplit('/', 1)[-1]

    if not hasattr(file_obj, 'read'):
        raise GoogleDriveError('upload_file requires a file-like object.')

    media = MediaIoBaseUpload(
        file_obj,
        mimetype=mime_type or 'application/octet-stream',
        resumable=True,
        chunksize=5 * 1024 * 1024,  # 5MB chunks - avoids loading large files whole
    )

    try:
        drive_file = service.files().create(
            body={'name': filename, 'parents': [parent_id]},
            media_body=media,
            fields='id, name, mimeType, size, webViewLink, webContentLink',
        ).execute()
    except Exception as e:
        logger.error('Google Drive upload failed for "%s": %s', filename, type(e).__name__)
        _notify_storage_failure(f'Upload failed for "{filename}": {type(e).__name__}')
        raise GoogleDriveError(f'Upload to Google Drive failed for "{filename}".') from None

    # Grant "anyone with the link can view" - matches this project's existing
    # public-read S3/R2 behaviour (AWS_DEFAULT_ACL='public-read'), not a
    # regression. Per-file private access control is a separate, larger
    # feature - see the migration report for what that would require.
    try:
        service.permissions().create(
            fileId=drive_file['id'],
            body={'role': 'reader', 'type': 'anyone'},
        ).execute()
    except Exception as e:
        logger.warning('Could not set public permission on Drive file %s: %s', drive_file['id'], type(e).__name__)

    logger.info('Uploaded "%s" to Drive as %s (%s bytes)', filename, drive_file['id'], drive_file.get('size'))
    return drive_file


def get_file_url(file_id, filename=''):
    """URL the browser should load this file from.

    Earlier this linked straight to Google's own drive.google.com/lh3 URLs,
    but those are served from a public CDN with an undocumented per-referer
    rate limit - a burst of page loads from one admin's browser was enough
    to start 429ing every Drive-hosted image on the site for that browser,
    for far longer than expected. Proxying through our own backend
    (core.media_views.DriveMediaProxyView) avoids that entirely: the proxy
    fetches via the authenticated Drive API, which is a separate quota from
    the public CDN's referer-based throttling.
    """
    base = getattr(settings, 'BACKEND_PUBLIC_URL', '') or ''
    return f'{base}/api/media/drive/{file_id}/'


def download_file(file_id):
    """Returns the raw bytes of a Drive file."""
    from googleapiclient.http import MediaIoBaseDownload

    service = _get_service()
    request = service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    try:
        while not done:
            _, done = downloader.next_chunk()
    except Exception as e:
        logger.error('Google Drive download failed for %s: %s', file_id, type(e).__name__)
        _notify_storage_failure(f'Download failed for file {file_id}: {type(e).__name__}')
        raise GoogleDriveError('Download from Google Drive failed.') from None
    buffer.seek(0)
    return buffer.read()


def get_file(file_id):
    """Returns metadata for a Drive file, or None if it doesn't exist."""
    service = _get_service()
    try:
        return service.files().get(fileId=file_id, fields='id, name, mimeType, size, webViewLink').execute()
    except Exception as e:
        status = getattr(getattr(e, 'resp', None), 'status', None)
        if status == 404:
            return None
        logger.error('Google Drive get_file failed for %s: %s', file_id, type(e).__name__)
        raise GoogleDriveError('Could not retrieve file metadata from Google Drive.') from None


def delete_file(file_id):
    """Deletes a file from Drive. Returns True if deleted, False if it was
    already gone (not an error - matches Django Storage._delete semantics,
    which should be a no-op for a missing file)."""
    service = _get_service()
    try:
        service.files().delete(fileId=file_id).execute()
        return True
    except Exception as e:
        status = getattr(getattr(e, 'resp', None), 'status', None)
        if status == 404:
            return False
        logger.error('Google Drive delete failed for %s: %s', file_id, type(e).__name__)
        raise GoogleDriveError('Could not delete file from Google Drive.') from None


def move_file(file_id, new_parent_folder_id):
    """Moves a file to a different parent folder."""
    service = _get_service()
    try:
        existing = service.files().get(fileId=file_id, fields='parents').execute()
        previous_parents = ','.join(existing.get('parents', []))
        return service.files().update(
            fileId=file_id,
            addParents=new_parent_folder_id,
            removeParents=previous_parents,
            fields='id, parents',
        ).execute()
    except Exception as e:
        logger.error('Google Drive move failed for %s: %s', file_id, type(e).__name__)
        raise GoogleDriveError('Could not move file in Google Drive.') from None
