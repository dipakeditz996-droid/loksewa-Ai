"""
Universal Exam Entitlements & Access Control Engine for LoksewaAI Packages.
Provides canonical categorization, validation, serialization, and quota resolution
for all exam types.
"""
from typing import Dict, List, Optional, Any
from exams.models import Examination

EXAM_TYPE_CONFIGS = [
    {
        'key': 'mock',
        'label': 'Mock Exams',
        'description': 'Full-length simulated mock tests designed to replicate official PSC examination conditions.',
    },
    {
        'key': 'live',
        'label': 'Live Scheduled Exams',
        'description': 'Time-bound live examinations held synchronously on specific dates and countdown windows.',
    },
    {
        'key': 'practice',
        'label': 'Practice Exams',
        'description': 'Untimed or flexible practice tests designed for self-paced learning and revision.',
    },
    {
        'key': 'model',
        'label': 'Model Exams',
        'description': 'Curated model test papers based on the official Loksewa syllabus and mark scheme.',
    },
    {
        'key': 'past_year',
        'label': 'Past Question Papers',
        'description': 'Actual historical questions and question sets from previous Loksewa PSC examinations.',
    },
    {
        'key': 'subject',
        'label': 'Subjectwise Tests',
        'description': 'Focused assessments targeted to individual syllabus subjects (e.g. General Knowledge, Civil Engineering).',
    },
    {
        'key': 'topicwise',
        'label': 'Topicwise Tests',
        'description': 'Granular micro-tests covering specific syllabus chapters and topics.',
    },
    {
        'key': 'subjective',
        'label': 'Subjective Exams',
        'description': 'Written and descriptive answer examinations requiring manual or AI-assisted paper checking.',
    },
]

EXAM_TYPE_LABELS: Dict[str, str] = {c['key']: c['label'] for c in EXAM_TYPE_CONFIGS}
SUPPORTED_EXAM_TYPES: List[str] = [c['key'] for c in EXAM_TYPE_CONFIGS]


def resolve_exam_type(examination: Examination) -> str:
    """
    Returns the primary canonical exam_type key for an Examination.
    """
    if getattr(examination, 'exam_type', None) == 'subjective':
        return 'subjective'
    if getattr(examination, 'is_scheduled_live', False) or getattr(examination, 'objective_category', None) == 'live':
        return 'live'
    if getattr(examination, 'objective_category', None) == 'topicwise' or (
        getattr(examination, 'exam_type', None) == 'subject' and getattr(examination, 'topic_id', None)
    ):
        return 'topicwise'
    if getattr(examination, 'exam_type', None) == 'subject':
        return 'subject'
    if getattr(examination, 'exam_type', None) == 'practice':
        return 'practice'
    if getattr(examination, 'objective_category', None) == 'past_year':
        return 'past_year'
    if getattr(examination, 'objective_category', None) == 'model':
        return 'model'
    if getattr(examination, 'exam_type', None) == 'mock':
        return 'mock'
    return 'mock'


def matches_exam_type(examination: Examination, exam_type: str) -> bool:
    """
    Determines whether an Examination is eligible for the specified exam_type category.
    """
    key = exam_type.lower()
    if key == 'subjective':
        return getattr(examination, 'exam_type', None) == 'subjective'
    if key == 'live':
        return (
            getattr(examination, 'objective_category', None) == 'live'
            or bool(getattr(examination, 'start_time', None))
            or getattr(examination, 'is_scheduled_live', False)
        )
    if key == 'topicwise':
        return getattr(examination, 'objective_category', None) == 'topicwise' or bool(getattr(examination, 'topic_id', None))
    if key == 'subject':
        return getattr(examination, 'exam_type', None) == 'subject'
    if key == 'practice':
        return getattr(examination, 'exam_type', None) == 'practice'
    if key == 'past_year':
        return getattr(examination, 'objective_category', None) == 'past_year'
    if key == 'model':
        return getattr(examination, 'objective_category', None) == 'model'
    if key == 'mock':
        return getattr(examination, 'exam_type', None) == 'mock' or getattr(examination, 'objective_category', None) in ('model', 'past_year')
    return False


def validate_exam_for_type(examination: Examination, exam_type: str) -> bool:
    """
    Validates that a selected Examination belongs to the target exam_type.
    """
    return matches_exam_type(examination, exam_type)


def get_default_exam_access_configs() -> List[Dict[str, Any]]:
    """
    Returns default template configurations for all supported exam types.
    """
    defaults = []
    for cfg in EXAM_TYPE_CONFIGS:
        key = cfg['key']
        # sensible defaults
        enabled = True
        attempts = 10 if key in ('mock', 'model', 'past_year') else (5 if key == 'live' else 20)
        if key == 'subjective':
            attempts = 5
        defaults.append({
            'exam_type': key,
            'exam_type_label': cfg['label'],
            'description': cfg['description'],
            'is_enabled': enabled,
            'access_mode': 'ANY',
            'total_attempts': attempts,
            'attempts_per_exam': None,
            'selected_exams_count': 0,
            'selected_exam_ids': [],
            'selected_exams': [],
        })
    return defaults


def serialize_plan_exam_access(plan) -> List[Dict[str, Any]]:
    """
    Produces complete, normalized exam access configs for a SubscriptionPlan.
    Supports plans with or without existing PackageExamAccess records.
    """
    configs_by_type = {}
    if hasattr(plan, 'exam_access_configs'):
        for access in plan.exam_access_configs.all():
            selected = list(access.selected_exams.all())
            configs_by_type[access.exam_type] = {
                'id': access.id,
                'exam_type': access.exam_type,
                'exam_type_label': EXAM_TYPE_LABELS.get(access.exam_type, access.exam_type.replace('_', ' ').title()),
                'is_enabled': access.is_enabled,
                'access_mode': access.access_mode,
                'total_attempts': access.total_attempts,
                'attempts_per_exam': access.attempts_per_exam,
                'selected_exams_count': len(selected),
                'selected_exam_ids': [e.id for e in selected],
                'selected_exams': [
                    {
                        'id': e.id,
                        'title': e.title,
                        'exam_type': e.exam_type,
                        'objective_category': e.objective_category,
                        'total_questions': e.total_questions,
                        'total_marks': e.total_marks,
                        'time_limit': e.time_limit,
                        'status': e.status,
                        'is_published': e.status in ('published', 'live'),
                    }
                    for e in selected
                ]
            }

    # Merge with full supported list to guarantee all 8 exam types are always present
    result = []
    legacy_quotas = getattr(plan, 'exam_quotas', {}) or {}
    free_mock_attempts = getattr(plan, 'free_mock_attempts', 0)
    free_mock_ids = list(plan.free_mock_exams.values_list('id', flat=True)) if hasattr(plan, 'free_mock_exams') else []

    for item in EXAM_TYPE_CONFIGS:
        k = item['key']
        if k in configs_by_type:
            c = configs_by_type[k]
            c['description'] = item['description']
            result.append(c)
        else:
            # Synthesize fallback from legacy plan data
            enabled = True
            attempts = -1 if getattr(plan, 'package_type', None) == 'BUNDLE' else 10
            access_mode = 'ANY'
            selected_ids = []
            selected_objs = []

            if k == 'mock' and free_mock_ids:
                access_mode = 'SPECIFIC'
                selected_ids = free_mock_ids
                selected_objs = list(plan.free_mock_exams.all())
                attempts = free_mock_attempts if free_mock_attempts != 0 else 10
            elif k in legacy_quotas:
                q = legacy_quotas[k]
                if isinstance(q, dict):
                    enabled = q.get('enabled', True)
                    attempts = q.get('attempts', 10)
                elif isinstance(q, (int, float)):
                    attempts = int(q)
            elif k == 'model' and 'model' in legacy_quotas:
                q = legacy_quotas['model']
                if isinstance(q, dict):
                    enabled = q.get('enabled', True)
                    attempts = q.get('attempts', 10)

            result.append({
                'id': None,
                'exam_type': k,
                'exam_type_label': item['label'],
                'description': item['description'],
                'is_enabled': enabled,
                'access_mode': access_mode,
                'total_attempts': attempts,
                'attempts_per_exam': None,
                'selected_exams_count': len(selected_ids),
                'selected_exam_ids': selected_ids,
                'selected_exams': [
                    {
                        'id': e.id,
                        'title': e.title,
                        'exam_type': e.exam_type,
                        'objective_category': e.objective_category,
                        'total_questions': e.total_questions,
                        'total_marks': e.total_marks,
                        'time_limit': e.time_limit,
                        'status': e.status,
                        'is_published': e.status in ('published', 'live'),
                    }
                    for e in selected_objs
                ]
            })

    return result

