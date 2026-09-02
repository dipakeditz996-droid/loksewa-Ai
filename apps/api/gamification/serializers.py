from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import GamificationProfile, ReferralSetting, Referral, XPTransaction, ReferralMilestone, Motivation

User = get_user_model()

class GamificationProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = GamificationProfile
        fields = ['referral_code', 'xp', 'coins', 'level', 'username', 'study_current_streak', 'study_highest_streak', 'last_study_date']

class ReferralSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReferralSetting
        fields = '__all__'

class XPTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPTransaction
        fields = ['id', 'amount', 'reason', 'created_at']

class ReferralSerializer(serializers.ModelSerializer):
    referred_username = serializers.CharField(source='referred_user.username', read_only=True)
    reward_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = Referral
        fields = ['id', 'referred_username', 'status', 'created_at', 'qualification_date', 'reward_amount']
        
    def get_reward_amount(self, obj):
        if obj.status == 'rewarded':
            settings = ReferralSetting.get_settings()
            return settings.referrer_xp_reward
        return 0

class MotivationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Motivation
        fields = '__all__'

from .models import Achievement, StudentAchievement

class AchievementSerializer(serializers.ModelSerializer):
    earned_at = serializers.SerializerMethodField()
    locked = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    maxProgress = serializers.SerializerMethodField()

    class Meta:
        model = Achievement
        fields = ['id', 'title', 'description', 'icon', 'xp_reward', 'coins_reward', 'locked', 'progress', 'maxProgress', 'earned_at']

    def get_earned_at(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            sa = StudentAchievement.objects.filter(user=user, achievement=obj).first()
            if sa:
                return sa.earned_at
        return None

    def get_locked(self, obj):
        user = self.context['request'].user
        if user.is_authenticated:
            return not StudentAchievement.objects.filter(user=user, achievement=obj).exists()
        return True
        
    def get_progress(self, obj):
        # Simplistic logic: if unlocked = 100, else 0.
        user = self.context['request'].user
        if user.is_authenticated and StudentAchievement.objects.filter(user=user, achievement=obj).exists():
            return 100
        return 0
        
    def get_maxProgress(self, obj):
        return 100

class RecentActivitySerializer(serializers.ModelSerializer):
    title = serializers.CharField(source='reason')
    description = serializers.SerializerMethodField()
    xpGained = serializers.IntegerField(source='amount')
    timestamp = serializers.DateTimeField(source='created_at')

    class Meta:
        model = XPTransaction
        fields = ['id', 'title', 'description', 'xpGained', 'timestamp']
        
    def get_description(self, obj):
        # We can just return a generic description or based on the reason
        if "Referral" in obj.reason:
            return "Earned from inviting a friend"
        elif "Exam" in obj.reason or "Test" in obj.reason:
            return "Earned from completing a test"
        elif "Win" in obj.reason or "Match" in obj.reason:
            return "Earned from a multiplayer match"
        return "Earned from learning activities"

