"""Custom Django Storage backend backed by Google Drive.

Wired in as STORAGES['default']['BACKEND'] in settings.py when Drive is
configured, so existing FileField/ImageField model fields and the manual
default_storage.save() avatar-upload pattern both transparently use Drive
with no other code changes.

Naming scheme: Django computes the desired relative path itself (via each
field's upload_to), e.g. "courses/thumbnails/foo.jpg". Drive has no concept
of a path or of "this name is taken" the way a filesystem does - every
upload becomes a new object with its own opaque file ID, and two files can
share a name in the same folder. To let _url()/delete()/_open() resolve a
saved name back to the right Drive object with NO extra API call (url() in
particular needs to be cheap - it can run on every list-page render), the
Drive file ID is folded into the *returned* name as a filename prefix:
"courses/thumbnails/<file_id>__foo.jpg". That returned value is what
actually gets stored in the model's FileField/ImageField column.
"""
import logging
import mimetypes

from django.core.files.base import ContentFile
from django.core.files.storage import Storage, FileSystemStorage

from core import google_drive

logger = logging.getLogger(__name__)


def _split_name(name):
    """'dir/sub/<file_id>__foo.jpg' -> ('dir/sub', '<file_id>__foo.jpg')

    Django's FileField.generate_filename() builds names via pathlib.PurePath,
    which stringifies with backslashes on Windows dev machines even though
    upload_to values are written with forward slashes. Normalize first so
    routing/parsing behaves the same on Windows dev and Linux production.
    """
    name = name.replace('\\', '/')
    if '/' in name:
        directory, basename = name.rsplit('/', 1)
    else:
        directory, basename = '', name
    return directory, basename


def _parse_file_id(name):
    """Returns the Drive file ID embedded in a previously-saved name, or
    None if this name was never saved (e.g. a freshly-generated candidate
    name that hasn't gone through _save yet)."""
    _, basename = _split_name(name)
    if '__' not in basename:
        return None
    # Google Drive file IDs are base64url characters and may contain double
    # underscores ('__'). If basename contains multiple '__', partition('__')
    # would incorrectly cut the file ID short (e.g. '1Bk__AKkag...' -> '1Bk').
    cand_r, _, _rest_r = basename.rpartition('__')
    cand_l, _, _rest_l = basename.partition('__')
    if cand_r and not any(c in cand_r for c in ' /\\'):
        if len(cand_l) < 15 and len(cand_r) >= 15:
            return cand_r
    if cand_l and not any(c in cand_l for c in ' /\\'):
        return cand_l
    if cand_r and not any(c in cand_r for c in ' /\\'):
        return cand_r
    return None


class GoogleDriveStorage(Storage):
    """
    Dual-mode resilient storage backend.
    Attempts primary upload and access via Google Drive.
    If Google Drive credentials fail (e.g. expired refresh token), network is down,
    or Google Drive is unreachable, seamlessly falls back to local FileSystemStorage
    without raising 500 errors.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._local_storage = FileSystemStorage()

    def _open(self, name, mode='rb'):
        file_id = _parse_file_id(name)
        if file_id is not None:
            try:
                data = google_drive.download_file(file_id)
                return ContentFile(data, name=name)
            except Exception as exc:
                logger.warning('Google Drive download failed for "%s" (%s); attempting local storage fallback.', name, exc)
        if self._local_storage.exists(name):
            return self._local_storage.open(name, mode=mode)
        raise FileNotFoundError(f'"{name}" could not be opened from Google Drive or local storage.')

    def _save(self, name, content):
        name = name.replace('\\', '/')
        content_type = getattr(content, 'content_type', None)
        mime_type = content_type or mimetypes.guess_type(name)[0] or 'application/octet-stream'

        file_obj = content.file if hasattr(content, 'file') else content
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        try:
            drive_file = google_drive.upload_file(name, file_obj, mime_type=mime_type)
            directory, basename = _split_name(name)
            clean_basename = basename.replace('__', '_')
            new_basename = f"{drive_file['id']}__{clean_basename}"
            return f'{directory}/{new_basename}' if directory else new_basename
        except Exception as drive_exc:
            logger.warning('Google Drive upload failed (%s). Safely falling back to local storage for "%s".', drive_exc, name)
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)
            return self._local_storage.save(name, content)

    def exists(self, name):
        file_id = _parse_file_id(name)
        if file_id is not None:
            try:
                if google_drive.get_file(file_id) is not None:
                    return True
            except Exception:
                pass
        return self._local_storage.exists(name)

    def delete(self, name):
        file_id = _parse_file_id(name)
        if file_id is not None:
            try:
                google_drive.delete_file(file_id)
            except Exception:
                pass
        if self._local_storage.exists(name):
            try:
                self._local_storage.delete(name)
            except Exception:
                pass

    def size(self, name):
        file_id = _parse_file_id(name)
        if file_id is not None:
            try:
                meta = google_drive.get_file(file_id)
                if meta is not None:
                    return int(meta.get('size', 0))
            except Exception:
                pass
        if self._local_storage.exists(name):
            return self._local_storage.size(name)
        raise FileNotFoundError(f'File "{name}" not found in Drive or local storage.')

    def url(self, name):
        file_id = _parse_file_id(name)
        if file_id is not None:
            _, basename = _split_name(name)
            prefix = f'{file_id}__'
            if basename.startswith(prefix):
                original_filename = basename[len(prefix):]
            else:
                original_filename = basename.split('__', 1)[1] if '__' in basename else basename
            try:
                return google_drive.get_file_url(file_id, filename=original_filename)
            except Exception:
                pass
        try:
            return self._local_storage.url(name)
        except Exception:
            return f'/media/{name}'

    def get_available_name(self, name, max_length=None):
        return self._local_storage.get_available_name(name, max_length=max_length)
