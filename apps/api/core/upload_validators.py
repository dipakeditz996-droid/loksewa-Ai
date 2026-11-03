"""Shared file-upload validators.

Every FileField/ImageField in this project routes through the same
GoogleDriveStorage backend (core/storage_backends.py), but that backend is a
generic Django Storage implementation - the right layer for "is this file
too big / the wrong type" is Django's own model-field validation, which runs
on every save() and every DRF serializer .is_valid() automatically once
attached here. Without these, an authenticated user could upload an
arbitrarily large or arbitrary-type file to the shared 15GB Drive quota.
"""
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator

# Plain top-level functions, not a factory returning closures - Django's
# migration writer needs to serialize each validator back to an importable
# `module.name` reference, which only works for a real top-level function
# object, not a dynamically-named closure.


def validate_image_size_5mb(file):
    if file.size > 5 * 1024 * 1024:
        raise ValidationError("File too large - maximum size is 5MB.")


def validate_document_size_20mb(file):
    if file.size > 20 * 1024 * 1024:
        raise ValidationError("File too large - maximum size is 20MB.")


def validate_pdf_upload(file):
    if not file.name.lower().endswith('.pdf'):
        raise ValidationError('Only PDF files are accepted.')
    if file.size <= 5:
        raise ValidationError('The PDF file is empty or invalid.')
    content_type = getattr(file, 'content_type', None)
    if content_type and content_type not in ('application/pdf', 'application/x-pdf'):
        raise ValidationError('The uploaded file must have a PDF MIME type.')
    current_position = file.tell() if hasattr(file, 'tell') else None
    header = file.read(5)
    if current_position is not None:
        file.seek(current_position)
    if header != b'%PDF-':
        raise ValidationError('The uploaded file is not a valid PDF document.')

validate_image_extension = FileExtensionValidator(
    allowed_extensions=['jpg', 'jpeg', 'png', 'webp', 'gif']
)
validate_document_extension = FileExtensionValidator(
    allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']
)


def validate_receipt_size_10mb(file):
    """Enforce a strict 10MB limit on payment evidence documents/images."""
    if file.size > 10 * 1024 * 1024:
        raise ValidationError("File too large - maximum receipt size is 10MB.")


def validate_receipt_file(file):
    """
    Validates payment receipts across supported formats:
    Images: JPEG, JPG, PNG, WebP
    Documents: PDF bank receipts
    Enforces strict magic byte / file signature validation and PIL verification.
    """
    name = (getattr(file, 'name', '') or '').lower()
    allowed_exts = ('.jpg', '.jpeg', '.png', '.webp', '.pdf')
    if not any(name.endswith(ext) for ext in allowed_exts):
        raise ValidationError(
            "Unsupported file format. Please upload a receipt screenshot (JPG, PNG, WebP) or bank PDF receipt."
        )

    if file.size <= 5:
        raise ValidationError("The uploaded receipt file is empty or invalid.")

    if file.size > 10 * 1024 * 1024:
        raise ValidationError("File too large - maximum receipt size is 10MB.")

    current_position = file.tell() if hasattr(file, 'tell') else None
    try:
        header = file.read(16)
    finally:
        if current_position is not None:
            file.seek(current_position)

    if name.endswith('.pdf'):
        if not header.startswith(b'%PDF-'):
            raise ValidationError("The uploaded PDF is corrupted or invalid (invalid PDF header).")
    elif name.endswith(('.jpg', '.jpeg')):
        if not header.startswith(b'\xff\xd8\xff'):
            raise ValidationError("Invalid JPEG file signature.")
    elif name.endswith('.png'):
        if not header.startswith(b'\x89PNG\r\n\x1a\n'):
            raise ValidationError("Invalid PNG file signature.")
    elif name.endswith('.webp'):
        if not (header.startswith(b'RIFF') and header[8:12] == b'WEBP'):
            raise ValidationError("Invalid WebP file signature.")
    else:
        raise ValidationError("Unsupported receipt format.")

    # Structural image verification with PIL for image formats
    if not name.endswith('.pdf'):
        try:
            from PIL import Image
            cur_pos = file.tell() if hasattr(file, 'tell') else None
            with Image.open(file) as img:
                img.verify()
            if cur_pos is not None:
                file.seek(cur_pos)
        except Exception as exc:
            raise ValidationError(f"Receipt image is corrupted or invalid: {exc}")

