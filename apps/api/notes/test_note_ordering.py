from django.test import SimpleTestCase
from notes.views import extract_leading_number, get_study_material_sort_key


class NoteOrderingUnitTests(SimpleTestCase):
    """
    Tests for numeric-aware ascending note sorting.
    Verifies that notes with titles like '1. Engineering Surveying', '2. Construction Materials',
    '3. Mechanics of Materials', and '10. Fluid Mechanics' sort in ascending numerical order (1, 2, 3, 10).
    """

    def test_extract_leading_number_standard(self):
        self.assertEqual(extract_leading_number("1. Engineering Surveying – Notes by Iswor Rawat"), 1.0)
        self.assertEqual(extract_leading_number("2. Construction Materials – Notes by Iswor Rawat"), 2.0)
        self.assertEqual(extract_leading_number("3. Mechanics of Materials – Notes by Iswor Rawat"), 3.0)
        self.assertEqual(extract_leading_number("10. Highway Engineering"), 10.0)

    def test_extract_leading_number_prefixes_and_brackets(self):
        self.assertEqual(extract_leading_number("Chapter 4: Soil Mechanics"), 4.0)
        self.assertEqual(extract_leading_number("Topic 5.1 Hydrology"), 5.1)
        self.assertEqual(extract_leading_number("Unit 6 - Environmental Engineering"), 6.0)
        self.assertEqual(extract_leading_number("[7] Irrigation Engineering"), 7.0)

    def test_extract_leading_number_non_numbered(self):
        self.assertIsNone(extract_leading_number("General Curriculum Overview"))
        self.assertIsNone(extract_leading_number("IOE MSc Engineering Entrance Information Brochure 2081"))
        self.assertIsNone(extract_leading_number(""))
        self.assertIsNone(extract_leading_number(None))

    def test_numeric_sort_reverses_descending_problem(self):
        """Problem case: 3, 2, 1 must become 1, 2, 3."""
        items = [
            {"id": 72, "title": "3. Mechanics of Materials – Notes by Iswor Rawat", "order": 0},
            {"id": 71, "title": "2. Construction Materials – Notes by Iswor Rawat", "order": 0},
            {"id": 70, "title": "1. Engineering Surveying – Notes by Iswor Rawat", "order": 0},
        ]
        sorted_items = sorted(items, key=get_study_material_sort_key)
        self.assertEqual([x["id"] for x in sorted_items], [70, 71, 72])
        self.assertEqual(
            [x["title"] for x in sorted_items],
            [
                "1. Engineering Surveying – Notes by Iswor Rawat",
                "2. Construction Materials – Notes by Iswor Rawat",
                "3. Mechanics of Materials – Notes by Iswor Rawat",
            ],
        )

    def test_numeric_not_lexicographic_sort_2_before_10(self):
        """2 must appear before 10 (numeric sort, not alphabetical)."""
        items = [
            {"id": 10, "title": "10. Highway Engineering", "order": 0},
            {"id": 3, "title": "3. Mechanics of Materials", "order": 0},
            {"id": 1, "title": "1. Engineering Surveying", "order": 0},
            {"id": 2, "title": "2. Construction Materials", "order": 0},
        ]
        sorted_items = sorted(items, key=get_study_material_sort_key)
        self.assertEqual([x["id"] for x in sorted_items], [1, 2, 3, 10])

    def test_stable_secondary_sort_for_unnumbered_notes(self):
        """Numbered notes come first, then unnumbered notes in stable alphabetical/ID order."""
        items = [
            {"id": 100, "title": "Z - Syllabus Annex", "order": 0},
            {"id": 2, "title": "2. Construction Materials", "order": 0},
            {"id": 101, "title": "A - Introduction Guide", "order": 0},
            {"id": 1, "title": "1. Engineering Surveying", "order": 0},
        ]
        sorted_items = sorted(items, key=get_study_material_sort_key)
        self.assertEqual([x["id"] for x in sorted_items], [1, 2, 101, 100])

    def test_explicit_order_field_takes_priority(self):
        """If explicit positive order is set, it is respected."""
        items = [
            {"id": 5, "title": "Advanced Topic B", "order": 2},
            {"id": 4, "title": "Advanced Topic A", "order": 1},
        ]
        sorted_items = sorted(items, key=get_study_material_sort_key)
        self.assertEqual([x["id"] for x in sorted_items], [4, 5])
