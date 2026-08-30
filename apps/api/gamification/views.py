from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework import viewsets
from django.db.models import Sum
from django.utils import timezone
import hashlib

from .models import GamificationProfile, ReferralSetting, Referral, XPTransaction, Motivation
from .serializers import GamificationProfileSerializer, ReferralSettingSerializer, ReferralSerializer, XPTransactionSerializer, MotivationSerializer
from .services import get_or_create_profile, award_xp

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_referral_code(request):
    code = request.GET.get('code', '').strip()
    if not code:
        return Response({'valid': False, 'message': 'No code provided.'})
    
    exists = GamificationProfile.objects.filter(referral_code=code).exists()
    return Response({'valid': exists})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_referral_dashboard(request):
    if not _gamification_enabled():
        raise PermissionDenied("Gamification is currently disabled by the administrator.")
    profile = get_or_create_profile(request.user)
    referrals = Referral.objects.filter(referrer=request.user)
    settings = ReferralSetting.get_settings()
    
    total_referrals = referrals.count()
    successful_referrals = referrals.filter(status='rewarded').count()
    pending_referrals = referrals.filter(status='pending').count()
    
    # Calculate XP earned from referrals
    referral_xp = XPTransaction.objects.filter(user=request.user, reason__startswith='Referral Reward').aggregate(Sum('amount'))['amount__sum'] or 0
    
    # 1. Rank (Real DB Calculation)
    rank = GamificationProfile.objects.filter(xp__gt=profile.xp).count() + 1
    
    # 2. 7-Day Streak Array Calculation
    from datetime import timedelta
    today = timezone.now().date()
    streak_days = [False] * 7
    for i in range(7):
        day = today - timedelta(days=6 - i)
        has_activity = XPTransaction.objects.filter(
            user=request.user,
            created_at__date=day
        ).exists()
        streak_days[i] = has_activity
        
    # 3. Games stats
    games_played = 0
    games_won = 0
    best_score = 0
    accuracy = 0
    questions_answered = 0
    
    try:
        from games.models import GameProfile, GameAnswer
        game_profile = GameProfile.objects.filter(user=request.user).first()
        if game_profile:
            games_won = game_profile.total_1v1_wins
            best_score = game_profile.best_survival_score
        
        games_played = request.user.matches_as_p1.count() + request.user.matches_as_p2.count()
        total_ans = GameAnswer.objects.filter(player=request.user).count()
        correct_ans = GameAnswer.objects.filter(player=request.user, is_correct=True).count()
        accuracy = int((correct_ans / total_ans) * 100) if total_ans > 0 else 0
        questions_answered = total_ans
    except Exception:
        pass
        
    return Response({
        'profile': GamificationProfileSerializer(profile).data,
        'stats': {
            'total_referrals': total_referrals,
            'successful_referrals': successful_referrals,
            'pending_referrals': pending_referrals,
            'total_xp_earned': referral_xp,
            'total_coins_earned': successful_referrals * settings.referrer_coins_reward,
            'rank': rank,
            'streak_days': streak_days,
            'games_played': games_played,
            'games_won': games_won,
            'accuracy': accuracy,
            'best_score': best_score,
            'questions_answered': questions_answered,
        },
        'settings': ReferralSettingSerializer(settings).data
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_referral_history(request):
    referrals = Referral.objects.filter(referrer=request.user).order_by('-created_at')
    serializer = ReferralSerializer(referrals, many=True)
    return Response(serializer.data)

@api_view(['GET', 'PUT'])
@permission_classes([IsAdminUser])
def admin_referral_settings(request):
    settings = ReferralSetting.get_settings()
    if request.method == 'GET':
        return Response(ReferralSettingSerializer(settings).data)
    elif request.method == 'PUT':
        serializer = ReferralSettingSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_referral_analytics(request):
    referrals = Referral.objects.all()
    total = referrals.count()
    successful = referrals.filter(status='rewarded').count()
    pending = referrals.filter(status='pending').count()
    
    xp_distributed = XPTransaction.objects.filter(reason__startswith='Referral Reward').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return Response({
        'total_referrals': total,
        'successful_referrals': successful,
        'pending_referrals': pending,
        'conversion_rate': (successful / total * 100) if total > 0 else 0,
        'xp_distributed': xp_distributed
    })

@api_view(['GET'])
@permission_classes([IsAdminUser])
def admin_referrals_list(request):
    referrals = Referral.objects.all().order_by('-created_at')
    # Extend serializer slightly for admin if needed, or use same one
    serializer = ReferralSerializer(referrals, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_manual_approve(request, pk):
    try:
        referral = Referral.objects.get(pk=pk)
        if referral.status != 'rewarded':
            # Force qualification and reward
            from .services import grant_referral_reward
            referral.status = 'qualified'
            referral.save()
            grant_referral_reward(referral)
            return Response({'status': 'success'})
        return Response({'error': 'Already rewarded'}, status=400)
    except Referral.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_motivation(request):
    today = timezone.now().date()
    # Find all active motivations
    motivations = list(Motivation.objects.filter(is_active=True).order_by('id'))
    
    if not motivations:
        return Response({'message': 'Small progress every day becomes a big result.', 'language': 'en', 'category': 'General'})
    
    # Hash date and user ID to consistently pick one for today
    seed_str = f"{today.isoformat()}-{request.user.id}"
    seed = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
    
    index = seed % len(motivations)
    selected_motivation = motivations[index]
    
    return Response(MotivationSerializer(selected_motivation).data)

class MotivationAdminViewSet(viewsets.ModelViewSet):
    queryset = Motivation.objects.all().order_by('-created_at')
    serializer_class = MotivationSerializer
    permission_classes = [IsAdminUser]


def _gamification_enabled():
    from core.models import AdminSettings
    return AdminSettings.get_settings().enable_gamification


@api_view(['GET'])
@permission_classes([AllowAny])
def leaderboard(request):
    """
    Returns the top 50 users based on XP.
    """
    if not _gamification_enabled():
        raise PermissionDenied("Gamification is currently disabled by the administrator.")
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
