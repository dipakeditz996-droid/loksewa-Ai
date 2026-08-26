import datetime
from django.utils import timezone
from .models import StudyPlan, StudyTask
from exams.models import Subject, Topic

def generate_study_plan_tasks(study_plan, regenerate_future=False):
    """
    Generates study tasks based on the assigned StudyPlanTemplate.
    If no template exists, falls back to a 14-day generated plan.
    """
    today = timezone.now().date()
    
    if regenerate_future:
        StudyTask.objects.filter(
            study_plan=study_plan,
            date__gt=today,
            status='PENDING'
        ).delete()

    last_task = StudyTask.objects.filter(study_plan=study_plan).order_by('-date').first()
    
    start_date = today
    if not regenerate_future and last_task and last_task.date >= today:
        start_date = last_task.date + datetime.timedelta(days=1)
    
    if regenerate_future:
        start_date = today + datetime.timedelta(days=1)

    weekday_map = {
        0: 'Monday', 1: 'Tuesday', 2: 'Wednesday', 3: 'Thursday',
        4: 'Friday', 5: 'Saturday', 6: 'Sunday'
    }

    if study_plan.template:
        template_tasks = study_plan.template.tasks.all().order_by('day_number')
        if not template_tasks.exists():
            return
            
        # Do not duplicate if tasks already exist for this plan unless regenerating
        if StudyTask.objects.filter(study_plan=study_plan).exists() and not regenerate_future:
            return

        tasks_to_create = []
        max_day = template_tasks.last().day_number
        date_mapping = {}
        current_date = start_date
        current_day = 1
        
        # Only assign tasks to preferred study days
        study_days = study_plan.study_days if study_plan.study_days else list(weekday_map.values())
        
        while current_day <= max_day:
            day_name = weekday_map[current_date.weekday()]
            if day_name in study_days:
                date_mapping[current_day] = current_date
                current_day += 1
            current_date += datetime.timedelta(days=1)
            
        for t_task in template_tasks:
            task_date = date_mapping.get(t_task.day_number)
            if not task_date:
                continue
                
            tasks_to_create.append(
                StudyTask(
                    study_plan=study_plan,
                    date=task_date,
                    title=t_task.title,
                    task_type=t_task.task_type,
                    subject=t_task.subject,
                    topic=t_task.topic,
                    duration_minutes=t_task.duration_minutes,
                    status='PENDING'
                )
            )
        StudyTask.objects.bulk_create(tasks_to_create)
        return

    # Fallback to legacy random generation if no template
    subjects = Subject.objects.filter(exam=study_plan.exam)
    topics = Topic.objects.filter(subject__in=subjects)
    
    if not topics.exists():
        return

    topics_list = list(topics)
    topic_index = 0
    task_types = ['STUDY_NOTE', 'PRACTICE', 'REVISION', 'PRACTICE', 'REVIEW_MISTAKES']

    days_generated = 0
    current_date = start_date
    
    study_days = study_plan.study_days if study_plan.study_days else list(weekday_map.values())

    while days_generated < 14:
        if current_date > study_plan.target_date:
            break
            
        day_name = weekday_map[current_date.weekday()]
        
        if day_name in study_days:
            minutes_allocated = 0
            task_duration = 30
            
            while minutes_allocated < study_plan.daily_minutes:
                topic = topics_list[topic_index % len(topics_list)]
                task_type = task_types[(topic_index + days_generated) % len(task_types)]
                
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
