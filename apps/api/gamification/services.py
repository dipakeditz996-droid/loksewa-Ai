from django.db import transaction
from django.utils import timezone
from .models import GamificationProfile, ReferralSetting, Referral, XPTransaction, ReferralMilestone

def get_or_create_profile(user):
    profile, created = GamificationProfile.objects.get_or_create(user=user)
    return profile

def award_xp(user, amount, reason):
    if amount <= 0:
        return
    
    # 1. Create transaction
    XPTransaction.objects.create(
        user=user,
        amount=amount,
        reason=reason
    )
    
    # 2. Update user profile XP
    profile = get_or_create_profile(user)
    profile.xp += amount
    
    # 3. Calculate new level
    settings = ReferralSetting.get_settings()
    # Simple linear level progression: 1000 XP per level
    new_level = (profile.xp // settings.xp_per_level) + 1
    old_level = profile.level
    profile.level = max(profile.level, new_level)

    profile.save()

    if profile.level > old_level:
        from core.notification_service import NotificationService
        new_level = profile.level
        transaction.on_commit(lambda: NotificationService.notify_level_up(user, new_level))

def award_coins(user, amount):
    if amount <= 0:
        return
    profile = get_or_create_profile(user)
    profile.coins += amount
    profile.save()

def process_referral_action(user, action_type):
    """
    Called when a user performs an action (e.g., 'signup', 'verified', 'first_exam').
    Checks if this user was referred by someone and if the action satisfies the qualification requirement.
    """
    settings = ReferralSetting.get_settings()
    
    if not settings.is_enabled:
        return

    # Check if this user was referred
    try:
        referral = Referral.objects.get(referred_user=user, status='pending')
    except Referral.DoesNotExist:
        return

    # Check if the action matches the required qualification action
    if action_type != settings.qualification_action:
        return

    # Action matches! Mark as qualified
    referral.status = 'qualified'
    referral.qualification_date = timezone.now()
    referral.save()

    # Process reward
    if settings.reward_processing == 'automatic':
        grant_referral_reward(referral)

def grant_referral_reward(referral):
    if referral.status != 'qualified':
        return
        
    settings = ReferralSetting.get_settings()
    
    # 1. Reward Referrer
    referrer = referral.referrer
    if settings.referrer_xp_reward > 0:
        award_xp(referrer, settings.referrer_xp_reward, f"Referral Reward: {referral.referred_user.username}")
    if settings.referrer_coins_reward > 0:
        award_coins(referrer, settings.referrer_coins_reward)
        
    # 2. Reward Referred User
    referred_user = referral.referred_user
    if settings.referred_xp_reward > 0:
        award_xp(referred_user, settings.referred_xp_reward, f"Welcome Reward (Referred by {referrer.username})")
    if settings.referred_coins_reward > 0:
        award_coins(referred_user, settings.referred_coins_reward)
        
    referral.status = 'rewarded'
    referral.save()
    
    # 3. Check Milestones for Referrer
    check_referral_milestones(referrer)

def check_referral_milestones(user):
    successful_referrals = Referral.objects.filter(referrer=user, status='rewarded').count()
    
    # Check if this count hits exactly a milestone
    milestone = ReferralMilestone.objects.filter(required_referrals=successful_referrals).first()
    if milestone:
        if milestone.xp_reward > 0:
            award_xp(user, milestone.xp_reward, f"Milestone Unlocked: {successful_referrals} Referrals")
        if milestone.coins_reward > 0:
            award_coins(user, milestone.coins_reward)

def register_referral(new_user, referral_code):
    settings = ReferralSetting.get_settings()
    if not settings.is_enabled:
        return
        
    try:
        referrer_profile = GamificationProfile.objects.get(referral_code=referral_code)
        referrer = referrer_profile.user
        
        # Self referral protection
        if referrer == new_user:
            return
            
        # Create referral
        Referral.objects.create(
            referrer=referrer,
            referred_user=new_user,
            status='pending'
        )
        
        # If the qualification action is 'signup', process it immediately
        if settings.qualification_action == 'signup':
            process_referral_action(new_user, 'signup')
            
    except GamificationProfile.DoesNotExist:
        pass # Invalid referral code
