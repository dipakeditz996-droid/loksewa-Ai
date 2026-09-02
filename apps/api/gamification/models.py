from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string

def generate_referral_code():
    return get_random_string(8, allowed_chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')

class GamificationProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='gamification_profile')
    referral_code = models.CharField(max_length=20, unique=True, default=generate_referral_code)
    xp = models.IntegerField(default=0)
    coins = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    
    # Study Streaks
    study_current_streak = models.IntegerField(default=0)
    study_highest_streak = models.IntegerField(default=0)
    last_study_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} - Level {self.level} - {self.xp} XP"

class ReferralSetting(models.Model):
    is_enabled = models.BooleanField(default=True)
    referrer_xp_reward = models.IntegerField(default=100)
    referred_xp_reward = models.IntegerField(default=50)
    referrer_coins_reward = models.IntegerField(default=50)
    referred_coins_reward = models.IntegerField(default=25)
    
    # Qualification Action: e.g., 'signup', 'verified', 'first_exam'
    qualification_action = models.CharField(max_length=50, default='signup')
    
    # Reward Processing Mode: 'automatic', 'manual'
    reward_processing = models.CharField(max_length=20, default='automatic')

    # Configurable XP thresholds
    xp_per_level = models.IntegerField(default=1000)

    class Meta:
        verbose_name = "Referral Setting"
        verbose_name_plural = "Referral Settings"

    def save(self, *args, **kwargs):
        self.pk = 1 # Ensure only one settings row exists
        super(ReferralSetting, self).save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Global Gamification & Referral Settings"

class Referral(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('qualified', 'Qualified'),
        ('rewarded', 'Rewarded'),
        ('rejected', 'Rejected'),
    )

    referrer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='referrals_made')
    referred_user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='referred_by')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    qualification_date = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.referrer.username} referred {self.referred_user.username}"

class XPTransaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_transactions')
    amount = models.IntegerField()
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} {self.amount > 0 and '+' or ''}{self.amount} XP - {self.reason}"

class ReferralMilestone(models.Model):
    required_referrals = models.IntegerField(unique=True)
    xp_reward = models.IntegerField(default=0)
    coins_reward = models.IntegerField(default=0)
    badge_name = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Milestone: {self.required_referrals} Referrals"

class Motivation(models.Model):
    message = models.TextField()
    language = models.CharField(max_length=10, default='en', choices=(('en', 'English'), ('ne', 'Nepali')))
    category = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Motivation ({self.language}): {self.message[:30]}..."

class Achievement(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, help_text="Lucide icon name (e.g. 'Crown', 'Zap')")
    xp_reward = models.IntegerField(default=0)
    coins_reward = models.IntegerField(default=0)
    criteria = models.CharField(max_length=100, help_text="Internal string to match trigger (e.g. 'FIRST_BLOOD')")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class StudentAchievement(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name='earned_by')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'achievement')

    def __str__(self):
        return f"{self.user.username} earned {self.achievement.title}"
