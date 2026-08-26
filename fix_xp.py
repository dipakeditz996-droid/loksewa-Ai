import os

filepath = 'apps/api/exams/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''        session.accuracy = (correct / total * 100) if total > 0 else 0
        session.time_taken_seconds = time_taken_seconds
        session.completed = True
        session.completed_at = timezone.now()
        session.save()'''

new_block = '''        session.accuracy = (correct / total * 100) if total > 0 else 0
        session.time_taken_seconds = time_taken_seconds
        session.completed = True
        session.completed_at = timezone.now()
        session.save()
        
        # Award XP for practice session
        try:
            from gamification.services import award_xp
            # Example: 1 XP per correct answer in practice
            if correct > 0:
                award_xp(session.user, correct, "Practice Session Completed")
        except ImportError:
            pass'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated PracticeSessionViewSet.submit successfully")
else:
    print("Could not find old block in PracticeSessionViewSet")

# Update attempt_timing.py
filepath = 'apps/api/exams/attempt_timing.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_block2 = '''    attempt.save()
    return attempt'''

new_block2 = '''    attempt.save()
    
    # Award XP for examination attempt completion
    try:
        from gamification.services import award_xp
        # Base XP for completion + XP based on score percentage
        xp_to_award = 10 + int(attempt.percentage / 10)
        award_xp(attempt.student, xp_to_award, f"Examination Attempt Completed: {attempt.examination.title}")
    except Exception:
        pass
        
    return attempt'''

if old_block2 in content:
    content = content.replace(old_block2, new_block2)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated finalize_attempt successfully")
else:
    print("Could not find old block in finalize_attempt")

