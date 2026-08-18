from django.db import models
from core.models import User

class AuditLog(models.Model):
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='audit_logs')
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100, null=True, blank=True) # Changed to CharField to support Q-000001
    timestamp = models.DateTimeField(auto_now_add=True)
    details = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.actor} - {self.action} on {self.entity_type} {self.entity_id}"

class CSVImport(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('validated', 'Validated'),
        ('imported', 'Imported'),
        ('failed', 'Failed'),
    )
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    file_name = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_rows = models.IntegerField(default=0)
    valid_rows = models.IntegerField(default=0)
    duplicate_rows = models.IntegerField(default=0)
    error_rows = models.IntegerField(default=0)
    report_data = models.JSONField(default=dict, blank=True, help_text="Detailed error and validation info per row")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Import {self.file_name} ({self.status})"
