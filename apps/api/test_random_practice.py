"""Final verification: test random practice for the course that actually has questions."""
from exams.models import Question
from courses.models import Course
from courses.access import get_course_exam_ids
from exams.selection_service import QuestionSelectionService

# Use Course 29: Civil Sub Engineer (exam_id=64) which has 183 questions
course = Course.objects.get(id=29)
print(f'Course: {course.title} (id={course.id}, exam_id={course.exam_id})')

exam_ids = get_course_exam_ids(course)
print(f'Exam IDs: {exam_ids}')

service = QuestionSelectionService()
base_qs = service.get_base_queryset()
print(f'Base queryset total: {base_qs.count()}')

filtered = service.apply_filters(base_qs, exam_ids=exam_ids, question_type='objective')
print(f'After exam_ids + objective filter: {filtered.count()}')

result = service.select(
    count=10,
    randomize=True,
    question_type='objective',
    exam_ids=exam_ids,
)
print(f'Selected: {result["selected"]} / requested: {result["requested"]}')
print(f'Satisfied: {result["satisfied"]}')
if result['questions']:
    print('SUCCESS: Random practice works for Civil Sub Engineer!')
    for q in result['questions'][:5]:
        print(f'  Q#{q.id} type={q.question_type} exam={q.exam_id}')
else:
    print(f'FAILURE: {result["warnings"]}')
