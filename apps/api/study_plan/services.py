import datetime
from django.utils import timezone
from .models import StudyPlan, StudyTask
from exams.models import Subject, Topic

def generate_study_plan_tasks(study_plan, regenerate_future=False):
    """
    Generates study tasks for the next 14 days based on the study plan parameters.
    If regenerate_future is True, it will delete existing PENDING tasks from tomorrow onwards.
    """
    # 1. Clear future tasks if regenerating
    today = timezone.now().date()
    
    if regenerate_future:
        # Delete pending tasks from tomorrow onwards
        StudyTask.objects.filter(
            study_plan=study_plan,
            date__gt=today,
            status='PENDING'
        ).delete()
    else:
        # Check if tasks already exist for the next 14 days, don't generate if we don't need to.
        # But for simplicity of this initial version, let's just fill in the gaps up to 14 days.
        pass

    # Find the last scheduled date, or start from today/tomorrow
    last_task = StudyTask.objects.filter(study_plan=study_plan).order_by('-date').first()
    
    start_date = today
    if not regenerate_future and last_task and last_task.date >= today:
        start_date = last_task.date + datetime.timedelta(days=1)
    
    if regenerate_future:
        start_date = today + datetime.timedelta(days=1)

    # 2. Collect syllabus topics
    subjects = Subject.objects.filter(exam=study_plan.exam)
    topics = Topic.objects.filter(subject__in=subjects)
    
    if not topics.exists():
        return # Cannot generate plan without topics

    # In a real scenario we'd use analytics to prioritize topics.
    # We will round robin through the topics for now, with mock prioritized logic.
    topics_list = list(topics)
    topic_index = 0
    
    # Task types distribution
    task_types = ['STUDY_NOTE', 'PRACTICE', 'REVISION', 'PRACTICE', 'REVIEW_MISTAKES']

    # 3. Generate tasks for the next 14 days
    days_generated = 0
    current_date = start_date
    
    # Standard mapping of Python weekday (0=Mon, 6=Sun) to our DB format
    weekday_map = {
        0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday',
        4: 'Friday', 5: 'Saturday', 6: 'Sunday'
    }

    while days_generated < 14:
        # Stop if we hit target date
        if current_date > study_plan.target_date:
            break
            
        day_name = weekday_map[current_date.weekday()]
        
        # Only generate tasks on preferred study days
        if day_name in study_plan.study_days:
            # We have a budget of daily_minutes. Let's break it down into ~30 minute tasks
            minutes_allocated = 0
            task_duration = 30
            
            while minutes_allocated < study_plan.daily_minutes:
                topic = topics_list[topic_index % len(topics_list)]
                task_type = task_types[(topic_index + days_generated) % len(task_types)]
                
                # Make title friendly
                title_map = {
                    'STUDY_NOTE': f"Study Note: {topic.title}",
                    'PRACTICE': f"Practice MCQs: {topic.title}",
                    'MODEL_EXAM': f"Take Model Exam for {topic.subject.name}",
                    'SUBJECTIVE_PRACTICE': f"Subjective Practice: {topic.title}",
                    'REVIEW_MISTAKES': f"Review Past Mistakes in {topic.subject.name}",
                    'REVISION': f"Quick Revision: {topic.title}",
                }
                
                title = title_map.get(task_type, f"Study {topic.title}")
                
                StudyTask.objects.create(
                    study_plan=study_plan,
                    date=current_date,
                    title=title,
                    task_type=task_type,
                    subject=topic.subject,
                    topic=topic,
                    duration_minutes=task_duration,
                    status='PENDING'
                )
                
                minutes_allocated += task_duration
                topic_index += 1
                
        current_date += datetime.timedelta(days=1)
        days_generated += 1
