"""Knowledge retrieval service for LoksewaAI Tutor.

Retrieves and attributes verified, admin-curated Loksewa study materials
(StudyMaterial with status='published' and available_to_ai_tutor=True).
Filtered strictly to courses the requesting student is entitled to access.
Deliberately keyword-based: fast, bounded, database-native, and does not dump
the entire database into prompts or rely on external vector stores.
"""
import re
from typing import Any, Dict, List, Optional, Tuple

from core.models import User
from notes.models import StudyMaterial
from courses.services.course_access_service import CourseAccessService

# Common English and Nepali stop words excluded from keyword scoring
STOPWORDS = frozenset([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'what', 'who', 'when',
    'where', 'why', 'how', 'does', 'do', 'did', 'can', 'could', 'should',
    'would', 'and', 'or', 'but', 'for', 'with', 'about', 'this', 'that',
    'these', 'those', 'you', 'your', 'please', 'explain', 'tell', 'me',
    'to', 'of', 'in', 'on', 'it', 'be', 'i', 'my', 'what', 'which',
    'nepal', 'loksewa', 'aayog', 'exam', 'paper', 'syllabus',
    'ko', 'le', 'lai', 'ma', 'bata', 'dekhi', 'chha', 'thiyo', 'bhaneko',
])

MAX_KNOWLEDGE_MATCHES = 2
MAX_EXCERPT_CHARS = 800


def retrieve_knowledge_sources(
    question_text: str,
    student: Optional[User] = None,
    max_matches: int = MAX_KNOWLEDGE_MATCHES,
    max_excerpt_chars: int = MAX_EXCERPT_CHARS,
) -> Tuple[List[Dict[str, Any]], str]:
    """Keyword-matches question against admin-curated StudyMaterial content.

    Returns:
        (citations, reference_block)
        citations: List of dicts representing verified sources, or [] if none.
        reference_block: Structured prompt context block, or "" if none.
    """
    if not question_text or not question_text.strip():
        return [], ""

    # Extract meaningful search tokens (alphanumeric, length >= 4)
    words = re.findall(r"[a-zA-Z\u0900-\u097F]{4,}", question_text.lower())
    keywords = [w for w in words if w not in STOPWORDS]
    if not keywords:
        return [], ""

    # Only published materials approved for AI Tutor use with non-empty content
    candidates = (
        StudyMaterial.objects.filter(
            status='published',
            available_to_ai_tutor=True,
        )
        .exclude(content='')
        .select_related('exam', 'subject')
    )

    # Entitlement filter: restrict to materials student's enrolled courses allow (or public free notes)
    if student and getattr(student, 'is_authenticated', False):
        candidates = CourseAccessService.filter_notes_queryset(student, candidates, allow_public_free=True)

    scored: List[Tuple[int, StudyMaterial]] = []
    for material in candidates:
        haystack = f"{material.title} {material.content}".lower()
        score = sum(haystack.count(kw) for kw in keywords)
        if score > 0:
            scored.append((score, material))

    if not scored:
        return [], ""

    # Rank by keyword relevance score
    scored.sort(key=lambda pair: pair[0], reverse=True)
    top_matches = [mat for _, mat in scored[:max_matches]]

    citations: List[Dict[str, Any]] = []
    blocks: List[str] = []

    for material in top_matches:
        excerpt = material.content[:max_excerpt_chars].strip()
        subject_name = material.subject.name if material.subject else None
        exam_name = material.exam.name if material.exam else None

        citations.append({
            "id": material.id,
            "title": material.title,
            "type": "study_material",
            "subject": subject_name,
            "exam": exam_name,
        })

        meta_line = f" [Subject: {subject_name}]" if subject_name else ""
        blocks.append(f"### {material.title}{meta_line}\n{excerpt}")

    reference_block = (
        "\n\nReference material curated by the admin team (use it to ground your "
        "answer when relevant, but do not claim it is the only source):\n\n"
        + "\n\n".join(blocks)
    )

    return citations, reference_block
