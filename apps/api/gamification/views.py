from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
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
    profile = get_or_create_profile(request.user)
    referrals = Referral.objects.filter(referrer=request.user)
    settings = ReferralSetting.get_settings()
    
    total_referrals = referrals.count()
    successful_referrals = referrals.filter(status='rewarded').count()
    pending_referrals = referrals.filter(status='pending').count()
    
    # Calculate XP earned from referrals
    # In a real app we'd look for XPTransactions where reason contains 'Referral Reward'
    # For now, let's just approximate or query the transactions
    referral_xp = XPTransaction.objects.filter(user=request.user, reason__startswith='Referral Reward').aggregate(Sum('amount'))['amount__sum'] or 0
    
    return Response({
        'profile': GamificationProfileSerializer(profile).data,
        'stats': {
            'total_referrals': total_referrals,
            'successful_referrals': successful_referrals,
            'pending_referrals': pending_referrals,
            'total_xp_earned': referral_xp,
            'total_coins_earned': successful_referrals * settings.referrer_coins_reward, # simple approx
            'rank': 12, # Dummy rank for now
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
