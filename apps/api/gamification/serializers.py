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
