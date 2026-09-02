import os
import re

search_dirs = [
    r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\apps\api",
    r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\apps\web",
]

# Patterns to search for
patterns = [
    re.compile(r'\b(dummy|fake|sample data|hardcoded|Coming Soon|Under Development|Demo|Lorem ipsum)\b', re.IGNORECASE),
    re.compile(r'\bmock\b', re.IGNORECASE), # special case to ignore "mock exam"
]

# Ignore files
ignore_dirs = ['node_modules', '.next', 'venv', 'migrations', '__pycache__', '.git']

results = []

for sdir in search_dirs:
    for root, dirs, files in os.walk(sdir):
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        for file in files:
            if not file.endswith(('.py', '.ts', '.tsx')):
                continue
            if 'test' in file.lower(): # ignore test files
                continue
            
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        if 'placeholder=' in line: # ignore UI placeholders
                            continue
                        
                        match_found = False
                        for p in patterns:
                            if p.search(line):
                                # If it's the mock pattern, make sure it's not "mock exam" or "mock test"
                                if 'mock' in line.lower():
                                    if 'mock exam' in line.lower() or 'mock test' in line.lower() or 'mock-exam' in line.lower() or 'mock_exam' in line.lower():
                                        continue
                                match_found = True
                                break
                                
                        if match_found:
                            rel_path = os.path.relpath(filepath, r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website")
                            results.append(f"{rel_path}:{i+1}: {line.strip()}")
            except Exception as e:
                pass

with open(r"c:\Users\diwas\OneDrive\Documents\Desktop\loksewa website\fake_data_findings.txt", "w", encoding='utf-8') as f:
    for r in results:
        f.write(r + "\n")
print(f"Found {len(results)} matches.")
