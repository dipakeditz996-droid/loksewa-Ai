import os

filepath = 'apps/api/administration/exam_views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will replace the entire @action(detail=True, methods=['get']) def analytics... and def results... blocks.

analytics_pattern = r"    @action\(detail=True, methods=\['get'\]\)\s+def analytics\(self, request, pk=None\):.*?    @action\(detail=True, methods=\['get'\]\)\s+def results\(self, request, pk=None\):"

results_pattern = r"    @action\(detail=True, methods=\['get'\]\)\s+def results\(self, request, pk=None\):.*"

# We will write a custom python parser to find the start and end of these functions to replace them cleanly.
