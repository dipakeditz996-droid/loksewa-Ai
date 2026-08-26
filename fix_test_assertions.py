import os

filepath = 'apps/api/administration/tests/test_exam_analytics.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("response.data['total_attempts']", "response.data['summary']['total_attempts']")
content = content.replace("data['total_attempts']", "data['summary']['total_attempts']")
content = content.replace("data['completed_attempts']", "data['summary']['completed_attempts']")
content = content.replace("data['average_score']", "data['summary']['average_score']")
content = content.replace("data['highest_score']", "data['summary']['highest_score']")
content = content.replace("data['lowest_score']", "data['summary']['lowest_score']")
content = content.replace("data['pass_count']", "data['summary']['pass_count']")
content = content.replace("data['fail_count']", "data['summary']['fail_count']")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed assertions")
