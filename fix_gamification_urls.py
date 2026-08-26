import os

filepath = 'apps/api/gamification/urls.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "path('motivation/daily/', views.daily_motivation, name='motivation-daily'),",
    "path('motivation/daily/', views.daily_motivation, name='motivation-daily'),\n    path('leaderboard/', views.leaderboard, name='leaderboard'),"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated gamification urls")
