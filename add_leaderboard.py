import os
import re

filepath = 'apps/api/gamification/views.py'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

leaderboard_code = '''
@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    """
    Returns the top 50 users based on XP.
    """
    top_users = GamificationProfile.objects.select_related('user').order_by('-xp', 'user__date_joined')[:50]
    
    leaderboard_data = []
    for idx, profile in enumerate(top_users):
        leaderboard_data.append({
            'rank': idx + 1,
            'username': profile.user.username,
            'full_name': profile.user.get_full_name(),
            'avatar': profile.user.avatar,
            'xp': profile.xp,
            'level': profile.level
        })
        
    return Response(leaderboard_data)
'''

if 'def leaderboard' not in content:
    content += '\n' + leaderboard_code
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Added leaderboard view successfully")
else:
    print("leaderboard view already exists")

