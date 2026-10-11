"""
Deterministic Question Paper and Marks Extraction Engine (NO AI / NO LLM).

Extracts:
1. Main question numbers (e.g. 1, 2, Q1, Q.1, Question 1, प्रश्न १)
2. Subquestion identifiers (e.g. 1(a), 1(b), a), b), (i), (ii), क, ख)
3. Question text and layout hierarchy
4. Maximum marks and combined marks expressions (e.g. [5+6], [5 + 5], [4+6], 5 + 6)
   with positional mapping across multiple questions or subquestions.
5. Extraction confidence, parent/subquestion hierarchy, and ambiguity detection.
"""

import re
import unicodedata
from typing import List, Dict, Any, Optional, Tuple


NEPALI_TO_ARABIC_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

NEPALI_SUBQUESTION_MAP = {
    'क': 'a', 'ख': 'b', 'ग': 'c', 'घ': 'd', 'ङ': 'e',
    'च': 'f', 'छ': 'g', 'ज': 'h', 'झ': 'i', 'ञ': 'j'
}


def normalize_digits(text: str) -> str:
    """Converts Devanagari digits to standard ASCII digits."""
    return "".join(NEPALI_TO_ARABIC_DIGITS.get(ch, ch) for ch in text)


def extract_combined_marks_summands(raw_marks_str: str) -> List[float]:
    """
    Parses expressions like '5 + 6', '[5+6]', '(4+6+5)', '5 + 5' into [5.0, 6.0].
    Returns empty list if not a valid addition expression.
    """
    cleaned = normalize_digits(raw_marks_str.strip())
    # Strip enclosing brackets or parentheses
    cleaned = re.sub(r'^[\[\(\{\<]\s*', '', cleaned)
    cleaned = re.sub(r'\s*[\]\)\}\>]$', '', cleaned)
    cleaned = re.sub(r'(?:marks|mark|अङ्क|पूर्णाङ्क)\s*', '', cleaned, flags=re.IGNORECASE).strip()

    if '+' in cleaned:
        parts = cleaned.split('+')
        summands = []
        for p in parts:
            p_clean = p.strip()
            try:
                val = float(p_clean)
                if val >= 0:
                    summands.append(val)
                else:
                    return []
            except ValueError:
                return []
        return summands
    else:
        try:
            val = float(cleaned)
            return [val] if val >= 0 else []
        except ValueError:
            return []


class QuestionPaperParser:
    """
    Deterministic rule-based parser for Loksewa question papers.
    """

    # Matches question headers at the start of a line: e.g. 1., Q.1, 7(a), प्रश्न १
    QUESTION_START_RE = re.compile(
        r'^(?:'
        r'(?:Question|Q\.?No\.?|Q\.?|Que\.?|प्रश्न(?:\s*नं\.?)?)\s*[:.-]?\s*(\d+|[०-९]+)'  # e.g. Q.1 or प्रश्न १
        r'|'
        r'(\d+|[०-९]+)(?:\s*[\.)\-]\s*|\s*(?=[\(\[]?[a-zA-Zक-ह]))'  # e.g. 1. or 7(a)
        r')'
        r'(?:\s*[\(\[]?([a-zA-Z]|[क-ह]|(?:i{1,3}|iv|v|vi{0,3}))[\)\]\.]\s*)?',  # optional subquestion: (a) or a)
        re.IGNORECASE
    )

    # Standalone subquestion indicator: e.g. "a) Rule of law" or "(a)" or "क)"
    SUBQUESTION_START_RE = re.compile(
        r'^(?:'
        r'[\(\[]?([a-zA-Z]|[क-ह]|(?:i{1,3}|iv|v|vi{0,3}))[\)\]\.]\s+'
        r')',
        re.IGNORECASE
    )

    # Matches marks indicators typically at end of question or line:
    # e.g. [5], (6), [5 + 5], [5+6], (4+6), [ 10 ], 5 marks, ५ अङ्क
    MARKS_EXPRESSION_RE = re.compile(
        r'(?:'
        r'[\[\(]\s*([०-९\d]+(?:\.\d+)?(?:\s*\+\s*[०-९\d]+(?:\.\d+)?)*)\s*[\]\)]'  # [5+6] or (5 + 5)
        r'|'
        r'\b([०-९\d]+(?:\.\d+)?(?:\s*\+\s*[०-९\d]+(?:\.\d+)?)*)\s*(?:marks?|अङ्क|पूर्णाङ्क)\b'  # 5 marks
        r')$',
        re.IGNORECASE
    )

    @classmethod
    def parse_paper_text(cls, text: str) -> Dict[str, Any]:
        """
        Parses full question paper text into a structured list of questions with marks.
        """
        raw_lines = text.split('\n')
        extracted_items = []
        pending_questions = []

        # Check for stated total marks on the paper: e.g. "Full Marks: 100", "पूर्णाङ्क: १००"
        stated_total = cls._detect_stated_total_marks(text)

        current_main_num = None
        current_sub_id = None
        current_text_lines = []
        current_marks_str = None

        def flush_current():
            nonlocal current_main_num, current_sub_id, current_text_lines, current_marks_str
            if current_main_num is not None:
                full_q_text = " ".join(current_text_lines).strip()
                extracted_items.append({
                    'main_number': current_main_num,
                    'sub_id': current_sub_id,
                    'question_text': full_q_text,
                    'raw_marks': current_marks_str,
                })
                current_text_lines = []
                current_marks_str = None

        for line in raw_lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Check if this line ends with marks
            marks_match = cls.MARKS_EXPRESSION_RE.search(stripped)
            line_marks = None
            text_without_marks = stripped
            if marks_match:
                line_marks = marks_match.group(1) or marks_match.group(2)
                text_without_marks = stripped[:marks_match.start()].strip()

            q_match = cls.QUESTION_START_RE.match(stripped)
            sub_match = cls.SUBQUESTION_START_RE.match(stripped)

            if q_match:
                flush_current()
                raw_num = q_match.group(1) or q_match.group(2) or "1"
                current_main_num = int(normalize_digits(raw_num))
                raw_sub = q_match.group(3)
                current_sub_id = cls._normalize_sub_id(raw_sub) if raw_sub else None

                q_body = stripped[q_match.end():].strip()
                if line_marks:
                    current_marks_str = line_marks
                    q_body = text_without_marks[q_match.end():].strip() if len(text_without_marks) >= q_match.end() else q_body

                if q_body:
                    current_text_lines.append(q_body)

            elif sub_match and current_main_num is not None:
                flush_current()
                raw_sub = sub_match.group(1)
                current_sub_id = cls._normalize_sub_id(raw_sub)

                sub_body = stripped[sub_match.end():].strip()
                if line_marks:
                    current_marks_str = line_marks
                    sub_body = text_without_marks[sub_match.end():].strip() if len(text_without_marks) >= sub_match.end() else sub_body

                if sub_body:
                    current_text_lines.append(sub_body)

            else:
                if line_marks and not current_marks_str:
                    current_marks_str = line_marks
                    if text_without_marks:
                        current_text_lines.append(text_without_marks)
                else:
                    current_text_lines.append(stripped)

        flush_current()

        # Positional resolution of combined marks across adjacent questions
        resolved_questions = cls._resolve_combined_marks(extracted_items)

        # Build validation report
        total_calculated = sum(q['max_marks'] for q in resolved_questions)
        is_reconciled = (stated_total is None) or abs(total_calculated - stated_total) < 0.01

        has_ambig = any(q.get('is_ambiguous', False) for q in resolved_questions)
        return {
            'questions': resolved_questions,
            'total_questions': len(resolved_questions),
            'calculated_total_marks': round(total_calculated, 2),
            'total_marks': round(total_calculated, 2),
            'stated_total_marks': stated_total,
            'is_reconciled': is_reconciled,
            'has_ambiguity': has_ambig,
            'validation': {
                'valid': not has_ambig and is_reconciled,
                'errors': ['Combined marks mapping ambiguous'] if has_ambig else [],
                'warnings': []
            }
        }

    def parse_question_paper(self, text: str) -> Dict[str, Any]:
        return self.parse_paper_text(text)

    def parse(self, text: str) -> Dict[str, Any]:
        return self.parse_paper_text(text)

    @classmethod
    def _normalize_sub_id(cls, raw: Optional[str]) -> Optional[str]:
        if not raw:
            return None
        cleaned = raw.strip().lower()
        return NEPALI_SUBQUESTION_MAP.get(cleaned, cleaned)

    @classmethod
    def _detect_stated_total_marks(cls, text: str) -> Optional[float]:
        norm = normalize_digits(text)
        match = re.search(
            r'(?:Full\s*Marks|Total\s*Marks|पूर्णाङ्क|कुल\s*अङ्क)\s*[:.-]?\s*([0-9]+(?:\.[0-9]+)?)',
            norm, re.IGNORECASE
        )
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                pass
        return None

    @classmethod
    def _resolve_combined_marks(cls, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Resolves combined marks expressions (e.g. [5 + 6] or [4+6]) across multiple questions
        or subquestions positionally.
        """
        resolved = []
        n = len(items)
        i = 0

        while i < n:
            item = items[i]
            raw_marks = item.get('raw_marks')
            summands = extract_combined_marks_summands(raw_marks) if raw_marks else []

            if len(summands) > 1:
                # Combined marks expression found directly on this item!
                # Scenario A: This item has subquestions grouped together, or is the last of a group
                # Check backwards for preceding unallocated questions
                back_candidates = []
                j = i - 1
                while j >= 0 and not items[j].get('raw_marks') and len(back_candidates) < len(summands) - 1:
                    back_candidates.insert(0, j)
                    j -= 1

                combined_group = [items[idx] for idx in back_candidates] + [item]

                if len(combined_group) == len(summands):
                    # Exact 1-to-1 positional mapping across the questions!
                    # Remove the earlier added unallocated placeholders from resolved
                    for _ in back_candidates:
                        if resolved:
                            resolved.pop()

                    for idx, q_item in enumerate(combined_group):
                        m_val = summands[idx]
                        q_num = str(q_item['main_number']) + (f"({q_item['sub_id']})" if q_item.get('sub_id') else "")
                        q_key = f"Q{q_num}"
                        resolved.append({
                            'question_key': q_key,
                            'question_number': q_num,
                            'main_number': q_item['main_number'],
                            'sub_id': q_item.get('sub_id'),
                            'question_text': q_item['question_text'],
                            'max_marks': m_val,
                            'order': len(resolved) + 1,
                            'is_ambiguous': False,
                            'confidence': 0.95,
                            'marks_formula': f"Positional summand #{idx+1} from '{raw_marks}'",
                        })
                    i += 1
                    continue

                # Scenario B: This question has subquestions forward
                forward_candidates = []
                j = i + 1
                while j < n and not items[j].get('raw_marks') and len(forward_candidates) < len(summands) - 1:
                    forward_candidates.append(j)
                    j += 1

                combined_forward = [item] + [items[idx] for idx in forward_candidates]
                if len(combined_forward) == len(summands):
                    for idx, q_item in enumerate(combined_forward):
                        m_val = summands[idx]
                        q_num = str(q_item['main_number']) + (f"({q_item['sub_id']})" if q_item.get('sub_id') else "")
                        q_key = f"Q{q_num}"
                        resolved.append({
                            'question_key': q_key,
                            'question_number': q_num,
                            'main_number': q_item['main_number'],
                            'sub_id': q_item.get('sub_id'),
                            'question_text': q_item['question_text'],
                            'max_marks': m_val,
                            'order': len(resolved) + 1,
                            'is_ambiguous': False,
                            'confidence': 0.95,
                            'marks_formula': f"Positional summand #{idx+1} from '{raw_marks}'",
                        })
                    i += len(combined_forward)
                    continue

                # Fallback: Assign total sum to parent or mark as ambiguous
                total_sum = sum(summands)
                q_num = str(item['main_number']) + (f"({item['sub_id']})" if item.get('sub_id') else "")
                q_key = f"Q{q_num}"
                resolved.append({
                    'question_key': q_key,
                    'question_number': q_num,
                    'main_number': item['main_number'],
                    'sub_id': item.get('sub_id'),
                    'question_text': item['question_text'],
                    'max_marks': total_sum,
                    'order': len(resolved) + 1,
                    'is_ambiguous': True,
                    'ambiguity_reason': f"Combined marks '{raw_marks}' has {len(summands)} summands but could not unambiguously align with adjacent questions.",
                    'confidence': 0.50,
                    'marks_formula': f"Sum of '{raw_marks}'",
                })
                i += 1
                continue

            elif len(summands) == 1:
                # Single mark
                q_num = str(item['main_number']) + (f"({item['sub_id']})" if item.get('sub_id') else "")
                q_key = f"Q{q_num}"
                resolved.append({
                    'question_key': q_key,
                    'question_number': q_num,
                    'main_number': item['main_number'],
                    'sub_id': item.get('sub_id'),
                    'question_text': item['question_text'],
                    'max_marks': summands[0],
                    'order': len(resolved) + 1,
                    'is_ambiguous': False,
                    'confidence': 0.95,
                    'marks_formula': f"{summands[0]}",
                })
                i += 1
                continue

            else:
                # No marks found on this item - check if next item has combined marks
                if i + 1 < n and items[i + 1].get('raw_marks'):
                    next_summands = extract_combined_marks_summands(items[i + 1]['raw_marks'])
                    if len(next_summands) == 2:
                        # e.g. Q5 has no marks, Q6 has [5+6] => map Q5 = 5.0, Q6 = 6.0
                        q5_num = str(item['main_number']) + (f"({item['sub_id']})" if item.get('sub_id') else "")
                        q5_key = f"Q{q5_num}"
                        resolved.append({
                            'question_key': q5_key,
                            'question_number': q5_num,
                            'main_number': item['main_number'],
                            'sub_id': item.get('sub_id'),
                            'question_text': item['question_text'],
                            'max_marks': next_summands[0],
                            'order': len(resolved) + 1,
                            'is_ambiguous': False,
                            'confidence': 0.95,
                            'marks_formula': f"Positional 1st summand from next line '{items[i+1]['raw_marks']}'",
                        })

                        next_item = items[i + 1]
                        q6_num = str(next_item['main_number']) + (f"({next_item['sub_id']})" if next_item.get('sub_id') else "")
                        q6_key = f"Q{q6_num}"
                        resolved.append({
                            'question_key': q6_key,
                            'question_number': q6_num,
                            'main_number': next_item['main_number'],
                            'sub_id': next_item.get('sub_id'),
                            'question_text': next_item['question_text'],
                            'max_marks': next_summands[1],
                            'order': len(resolved) + 1,
                            'is_ambiguous': False,
                            'confidence': 0.95,
                            'marks_formula': f"Positional 2nd summand from '{next_item['raw_marks']}'",
                        })
                        i += 2
                        continue

                # Default fallback for unallocated question
                q_num = str(item['main_number']) + (f"({item['sub_id']})" if item.get('sub_id') else "")
                q_key = f"Q{q_num}"
                resolved.append({
                    'question_key': q_key,
                    'question_number': q_num,
                    'main_number': item['main_number'],
                    'sub_id': item.get('sub_id'),
                    'question_text': item['question_text'],
                    'max_marks': 0.0,
                    'order': len(resolved) + 1,
                    'is_ambiguous': True,
                    'ambiguity_reason': "No maximum mark detected on this question.",
                    'confidence': 0.20,
                    'marks_formula': "Missing",
                })
                i += 1

        return resolved
