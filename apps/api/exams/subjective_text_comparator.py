"""
Deterministic Rule-Based Text Comparison and Rubric Evaluation Engine (NO AI / NO LLM).

Provides:
1. Multi-language text normalization (English and Nepali/Devanagari) preserving
   crucial negations, numbers, dates, constitutional articles, and legal sections.
2. Deterministic multi-signal comparison:
   - Token & N-gram overlap (unigrams, bigrams, trigrams)
   - Jaccard similarity and TF-IDF cosine similarity
   - Exact phrase and keyword detection
   - Configured domain synonym dictionaries (Nepali and English public governance terms)
3. Contradiction & negation detection.
4. Concept-based rubric matching with explainable evidence and bounded scoring:
   0 <= awarded_marks <= maximum_marks.
"""

import re
import math
import unicodedata
from typing import List, Dict, Any, Set, Tuple, Optional


# Domain-specific synonym groups (English and Nepali equivalents in Loksewa governance/law)
DOMAIN_SYNONYMS: List[Set[str]] = [
    {"federalism", "federal", "federation", "संघीयता", "संघीय", "संघ", "प्रदेश", "स्थानीय तह", "राज्य पुनर्संरचना"},
    {"legislature", "parliament", "व्यवस्थापिका", "संसद", "प्रतिनिधिसभा", "राष्ट्रिय सभा", "विधायिका"},
    {"executive", "government", "कार्यपालिका", "सरकार", "मन्त्रिपरिषद", "प्रशासनिक"},
    {"judiciary", "court", "supreme court", "न्यायपालिका", "अदालत", "सर्वोच्च अदालत", "न्यायिक"},
    {"rule of law", "supremacy of law", "विधिको शासन", "कानूनको शासन", "कानूनको सर्वोच्चता"},
    {"separation of powers", "checks and balances", "शक्ति पृथकीकरण", "नियन्त्रण र सन्तुलन", "सन्तुलन"},
    {"good governance", "governance", "सुशासन", "सदाचार", "असल शासन", "शासन व्यवस्था"},
    {"accountability", "answerability", "उत्तरदायित्व", "जवाफदेहिता", "जवाफदेही"},
    {"transparency", "openness", "पारदर्शिता", "खुल्लापन", "खुलापन"},
    {"fundamental rights", "basic rights", "human rights", "मौलिक हक", "मौलिक अधिकार", "मानव अधिकार"},
    {"decentralization", "devolution", "विकेन्द्रीकरण", "अधिकार निक्षेपण", "स्थानीय स्वायत्तता"},
    {"civil service", "public service", "bureaucracy", "निजामती सेवा", "सार्वजनिक प्रशासन", "कर्मचारीतन्त्र"},
    {"constitution", "constitutional", "संविधान", "संवैधानिक", "मूल कानून"},
    {"sovereignty", "sovereign", "सार्वभौमसत्ता", "सार्वभौमिकता", "सार्वभौम"},
    {"democracy", "democratic", "लोकतन्त्र", "प्रजातन्त्र", "गणतन्त्र", "लोकतान्त्रिक"},
]

# Words indicating negation or contradiction in English and Nepali
NEGATION_WORDS: Set[str] = {
    "not", "never", "no", "neither", "nor", "none", "without", "lack", "fails",
    "छैन", "छैनन्", "हुँदैन", "हुन्न", "होइन", "हैन", "नभएको", "विना", "रहित", "अभाव", "विपरित", "उल्टो"
}


def normalize_text(text: str) -> str:
    """
    Normalizes text across Unicode, case, punctuation, and whitespace while strictly
    preserving negation terms, numbers, dates, constitutional articles, and legal sections.
    """
    if not text:
        return ""
    # Unicode NFKC normalization
    normalized = unicodedata.normalize('NFKC', text)
    # Convert Devanagari digits to standard digits for consistent comparison
    from .subjective_question_paper_parser import normalize_digits
    normalized = normalize_digits(normalized)
    # Lowercase Latin characters
    normalized = normalized.lower()
    # Normalize punctuation to spaces except meaningful hyphens in numbers
    normalized = re.sub(r'[\r\t\f\v]', ' ', normalized)
    normalized = re.sub(r'[।!?,;:|"\'`(){}\[\]<>\/\\~*#@^&+=]', ' ', normalized)
    # Collapse consecutive whitespace
    normalized = re.sub(r'\s+', ' ', normalized).strip()
    return normalized


def tokenize(text: str) -> List[str]:
    """Tokenizes text into meaningful words supporting both English and Devanagari."""
    norm = normalize_text(text)
    # Match words: sequences of letters (including Devanagari \u0900-\u097F) and digits
    tokens = re.findall(r'[a-zA-Z0-9\u0900-\u097F]+', norm)
    return tokens


def extract_ngrams(tokens: List[str], n: int) -> Set[Tuple[str, ...]]:
    """Extracts n-grams from a list of tokens."""
    if len(tokens) < n:
        return set()
    return {tuple(tokens[i:i + n]) for i in range(len(tokens) - n + 1)}


def calculate_jaccard_similarity(tokens1: List[str], tokens2: List[str]) -> float:
    """Computes Jaccard similarity between two token lists."""
    s1 = set(tokens1)
    s2 = set(tokens2)
    if not s1 or not s2:
        return 0.0
    intersection = s1.intersection(s2)
    union = s1.union(s2)
    return len(intersection) / len(union)


def calculate_ngram_overlap(tokens1: List[str], tokens2: List[str], n: int = 2) -> float:
    """Computes overlap ratio of n-grams between student and reference."""
    ng1 = extract_ngrams(tokens1, n)
    ng2 = extract_ngrams(tokens2, n)
    if not ng2:
        return 0.0
    overlap = len(ng1.intersection(ng2))
    return overlap / len(ng2)


def calculate_tfidf_cosine_similarity(text1: str, text2: str) -> float:
    """Computes cosine similarity based on sub-linear term frequencies."""
    t1 = tokenize(text1)
    t2 = tokenize(text2)
    if not t1 or not t2:
        return 0.0

    tf1: Dict[str, float] = {}
    for tok in t1:
        tf1[tok] = tf1.get(tok, 0.0) + 1.0

    tf2: Dict[str, float] = {}
    for tok in t2:
        tf2[tok] = tf2.get(tok, 0.0) + 1.0

    # Sub-linear term frequency scaling: 1 + log(tf)
    for k in tf1:
        tf1[k] = 1.0 + math.log(tf1[k])
    for k in tf2:
        tf2[k] = 1.0 + math.log(tf2[k])

    dot_product = sum(tf1[k] * tf2[k] for k in tf1 if k in tf2)
    norm1 = math.sqrt(sum(v * v for v in tf1.values()))
    norm2 = math.sqrt(sum(v * v for v in tf2.values()))

    if norm1 == 0 or norm2 == 0:
        return 0.0
    return min(1.0, max(0.0, dot_product / (norm1 * norm2)))


def find_synonym_matches(token: str) -> Set[str]:
    """Returns all known synonyms for a given term from configured domain dictionaries."""
    synonyms = {token}
    for group in DOMAIN_SYNONYMS:
        if token in group:
            synonyms.update(group)
    return synonyms


def detect_negation_in_window(tokens: List[str], target_index: int, window_size: int = 3) -> bool:
    """Checks if a negation word occurs within window_size words of target_index."""
    start = max(0, target_index - window_size)
    end = min(len(tokens), target_index + window_size + 1)
    for i in range(start, end):
        if tokens[i] in NEGATION_WORDS:
            return True
    return False


class RuleBasedAnswerComparator:
    """
    Transparent, explainable rubric evaluation engine without AI or LLM.
    """

    @classmethod
    def evaluate_answer(
        cls,
        student_answer: str,
        expert_solution: str,
        rubric: List[Dict[str, Any]],
        max_marks: float,
        ocr_confidence: float = 1.0,
        question_text: str = "",
        evaluation_type: str = "descriptive",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Evaluates a single student answer against the approved Expert Solution and rubric.
        Returns:
            - marks_obtained (bounded 0 <= marks_obtained <= max_marks)
            - max_marks
            - criterion_scores (detailed breakdown per rubric item)
            - text_similarity_metrics
            - contradiction_warnings
            - marking_confidence
            - status ('rule_evaluated' or 'needs_review')
            - explanation
        """
        if not student_answer or not student_answer.strip():
            return cls._empty_answer_result(rubric, max_marks, ocr_confidence)

        student_norm = normalize_text(student_answer)
        student_tokens = tokenize(student_norm)
        expert_norm = normalize_text(expert_solution)
        expert_tokens = tokenize(expert_norm)

        # 1. Multi-signal similarity metrics
        jaccard = calculate_jaccard_similarity(student_tokens, expert_tokens)
        bigram_sim = calculate_ngram_overlap(student_tokens, expert_tokens, n=2)
        tfidf_sim = calculate_tfidf_cosine_similarity(student_norm, expert_norm)

        metrics = {
            'jaccard_similarity': round(jaccard, 3),
            'bigram_overlap': round(bigram_sim, 3),
            'tfidf_cosine': round(tfidf_sim, 3),
            'composite_similarity': round(0.4 * tfidf_sim + 0.3 * bigram_sim + 0.3 * jaccard, 3),
        }

        # 2. Check for contradictions or negations
        contradictions = cls._detect_contradictions(student_tokens, expert_tokens)

        # 3. Evaluate configured rubric criteria
        criterion_scores = []
        total_awarded = 0.0

        for idx, crit in enumerate(rubric):
            c_id = crit.get('id', f'c{idx + 1}')
            c_desc = crit.get('description', f'Criterion {idx + 1}')
            c_max = float(crit.get('max_marks', crit.get('weight', 1.0)))
            key_concepts = crit.get('expected_concepts') or crit.get('key_concepts') or crit.get('keywords') or []
            if not key_concepts:
                # Extract key tokens from criterion description and expert solution segment
                key_concepts = [w for w in tokenize(c_desc) if len(w) >= 3 and w not in NEGATION_WORDS]

            c_result = cls._evaluate_criterion(
                student_tokens=student_tokens,
                student_norm=student_norm,
                key_concepts=key_concepts,
                criterion_max=c_max,
                description=c_desc,
            )

            # Reduce score if contradictory negation detected on this criterion
            if any(concept.lower() in " ".join(contradictions).lower() for concept in key_concepts):
                c_result['marks_obtained'] = 0.0
                c_result['status'] = 'contradictory'
                c_result['feedback'] += " (Contradictory statement detected)."

            c_result['criterion_id'] = c_id
            c_result['max_marks'] = c_max
            criterion_scores.append(c_result)
            total_awarded += c_result['marks_obtained']

        # Enforce strict bounds: 0 <= total_awarded <= max_marks
        total_awarded = min(float(max_marks), max(0.0, round(total_awarded, 2)))
        provisional_percentage = round((total_awarded / max_marks * 100), 2) if max_marks > 0 else 0.0

        # Calculate marking confidence (combination of match clarity, OCR confidence, and lack of contradictions)
        has_contradiction = len(contradictions) > 0
        marking_confidence = round(
            ocr_confidence * (0.90 if not has_contradiction else 0.40) * (0.95 if metrics['composite_similarity'] >= 0.20 else 0.60),
            2
        )

        # Routing logic: route to 'needs_review' if confidence is low, contradictions exist, or answer is minimal
        needs_review = (
            marking_confidence < 0.65 or
            has_contradiction or
            ocr_confidence < 0.60 or
            len(student_tokens) < 15
        )

        status = 'needs_review' if needs_review else 'ai_evaluated'
        review_reasons = []
        if has_contradiction:
            review_reasons.append("Contradictory or negated statements detected.")
        if ocr_confidence < 0.60:
            review_reasons.append("Low OCR confidence.")
        if len(student_tokens) < 15:
            review_reasons.append("Extracted student answer is very short.")
        if marking_confidence < 0.65 and not review_reasons:
            review_reasons.append("Provisional rule-based confidence below review threshold.")

        metrics_with_counts = {**metrics, 'contradictions_found': len(contradictions)}

        return {
            'marks_obtained': total_awarded,
            'max_marks': float(max_marks),
            'provisional_percentage': provisional_percentage,
            'criterion_scores': criterion_scores,
            'similarity_metrics': metrics,
            'metrics': metrics_with_counts,
            'contradiction_warnings': contradictions,
            'marking_confidence': marking_confidence,
            'confidence_score': marking_confidence,
            'status': status,
            'review_reason': "; ".join(review_reasons),
            'overall_feedback': cls._generate_overall_feedback(criterion_scores, total_awarded, max_marks),
        }

    @classmethod
    def _evaluate_criterion(
        cls,
        student_tokens: List[str],
        student_norm: str,
        key_concepts: List[str],
        criterion_max: float,
        description: str,
    ) -> Dict[str, Any]:
        """Evaluates presence of expected concepts/keywords with synonym expansion."""
        if not key_concepts:
            return {
                'description': description,
                'marks_obtained': round(criterion_max * 0.5, 2),
                'status': 'partially_matched',
                'matched_concepts': [],
                'missing_concepts': [],
                'feedback': 'Standard criterion without explicit keywords.',
                'evidence': '',
            }

        matched_concepts = []
        missing_concepts = []
        student_token_set = set(student_tokens)

        for concept in key_concepts:
            concept_norm = normalize_text(concept)
            if " " in concept_norm:
                phrase_words = [w for w in concept_norm.split() if len(w) >= 3 and w not in NEGATION_WORDS]
                if concept_norm in student_norm or (phrase_words and all(any(syn in student_token_set for syn in find_synonym_matches(w)) for w in phrase_words)):
                    matched_concepts.append(concept)
                    continue

            # Check single word or domain synonyms
            synonyms = find_synonym_matches(concept_norm)
            if any(syn in student_token_set for syn in synonyms):
                matched_concepts.append(concept)
            else:
                missing_concepts.append(concept)

        match_ratio = len(matched_concepts) / len(key_concepts) if key_concepts else 0.0

        if match_ratio >= 0.75:
            c_status = 'matched'
            marks = criterion_max
            feedback = f"Fully satisfied: covered {', '.join(matched_concepts)}."
        elif match_ratio >= 0.35:
            c_status = 'partially_matched'
            marks = round(criterion_max * match_ratio, 2)
            feedback = f"Partially satisfied: included {', '.join(matched_concepts)}, missing {', '.join(missing_concepts)}."
        else:
            c_status = 'missing'
            marks = 0.0
            feedback = f"Missing key concepts: expected {', '.join(missing_concepts)}."

        return {
            'description': description,
            'marks_obtained': min(criterion_max, max(0.0, marks)),
            'status': c_status,
            'matched_concepts': matched_concepts,
            'missing_concepts': missing_concepts,
            'feedback': feedback,
            'evidence': f"Matched {len(matched_concepts)}/{len(key_concepts)} required concepts.",
        }

    @classmethod
    def _detect_contradictions(cls, student_tokens: List[str], expert_tokens: List[str]) -> List[str]:
        """Detects if student text negates key positive concepts asserted in expert solution."""
        contradictions = []
        for idx, tok in enumerate(student_tokens):
            if tok in NEGATION_WORDS:
                # Look at next 2 words
                subsequent = student_tokens[idx + 1:idx + 3]
                for next_word in subsequent:
                    syns = find_synonym_matches(next_word)
                    if any(s in expert_tokens for s in syns) and len(next_word) >= 3:
                        contradictions.append(f"Negation detected: '{tok} {next_word}'")
        return contradictions

    @classmethod
    def _empty_answer_result(
        cls, rubric: List[Dict[str, Any]], max_marks: float, ocr_confidence: float
    ) -> Dict[str, Any]:
        criterion_scores = [
            {
                'criterion_id': crit.get('id', f'c{i + 1}'),
                'description': crit.get('description', ''),
                'max_marks': float(crit.get('max_marks', crit.get('weight', 1.0))),
                'marks_obtained': 0.0,
                'status': 'missing',
                'matched_concepts': [],
                'missing_concepts': crit.get('key_concepts', crit.get('keywords', [])),
                'feedback': 'No handwritten answer detected for this question.',
                'evidence': '',
            }
            for i, crit in enumerate(rubric)
        ]
        return {
            'marks_obtained': 0.0,
            'max_marks': float(max_marks),
            'provisional_percentage': 0.0,
            'criterion_scores': criterion_scores,
            'similarity_metrics': {'jaccard_similarity': 0.0, 'bigram_overlap': 0.0, 'tfidf_cosine': 0.0, 'composite_similarity': 0.0},
            'contradiction_warnings': [],
            'marking_confidence': 0.10,
            'status': 'needs_review',
            'review_reason': 'Unanswered question or unreadable handwriting.',
            'overall_feedback': 'No answer recorded for this question.',
        }

    @classmethod
    def _generate_overall_feedback(cls, criterion_scores: List[Dict[str, Any]], awarded: float, max_marks: float) -> str:
        matched_count = sum(1 for c in criterion_scores if c['status'] == 'matched')
        partial_count = sum(1 for c in criterion_scores if c['status'] == 'partially_matched')
        missing_count = sum(1 for c in criterion_scores if c['status'] in ('missing', 'contradictory'))

        parts = [f"Awarded {awarded:g}/{max_marks:g} marks."]
        if matched_count:
            parts.append(f"{matched_count} criteria fully satisfied.")
        if partial_count:
            parts.append(f"{partial_count} criteria partially satisfied.")
        if missing_count:
            parts.append(f"{missing_count} criteria need improvement.")
        return " ".join(parts)
