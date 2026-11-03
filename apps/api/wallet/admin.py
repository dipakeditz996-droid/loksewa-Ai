from django.contrib import admin
from .models import (
    StudentWallet,
    WalletTransaction,
    CoinTopUpSetting,
    XPConversionSetting,
    XPConversionLog,
    CoinRewardRule,
    CoinRewardClaim,
    CoinTopUp,
    ContentCoinPricing,
    ContentEntitlement
)


@admin.register(StudentWallet)
class StudentWalletAdmin(admin.ModelAdmin):
    list_display = ('user', 'balance', 'total_credited', 'total_debited', 'is_locked', 'lock_reason', 'updated_at')
    search_fields = ('user__username', 'user__email')
    list_filter = ('is_locked', 'created_at')
    readonly_fields = ('balance', 'total_credited', 'total_debited', 'created_at', 'updated_at')


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'wallet',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'created_at'
    )
    list_filter = ('transaction_type', 'reference_type', 'created_at')
    search_fields = ('wallet__user__username', 'description', 'reference_id', 'idempotency_key')
    readonly_fields = (
        'wallet',
        'transaction_type',
        'amount',
        'balance_before',
        'balance_after',
        'reference_type',
        'reference_id',
        'idempotency_key',
        'description',
        'metadata',
        'created_at'
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CoinTopUpSetting)
class CoinTopUpSettingAdmin(admin.ModelAdmin):
    list_display = ('enabled', 'npr_to_coin_rate', 'min_topup_npr', 'max_topup_npr', 'bonus_percentage', 'updated_at')



@admin.register(XPConversionSetting)
class XPConversionSettingAdmin(admin.ModelAdmin):
    list_display = (
        'enabled',
        'xp_required',
        'coins_awarded',
        'conversion_mode',
        'daily_conversion_limit',
        'minimum_xp',
        'maximum_xp'
    )


@admin.register(XPConversionLog)
class XPConversionLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'xp_converted', 'coins_awarded', 'conversion_rate_snapshot', 'created_at')
    search_fields = ('user__username', 'idempotency_key')
    list_filter = ('created_at',)
    readonly_fields = ('user', 'xp_converted', 'coins_awarded', 'conversion_rate_snapshot', 'wallet_transaction', 'idempotency_key', 'created_at')


@admin.register(CoinRewardRule)
class CoinRewardRuleAdmin(admin.ModelAdmin):
    list_display = ('activity_type', 'coin_reward', 'xp_reward', 'daily_limit', 'is_enabled', 'updated_at')
    list_filter = ('is_enabled', 'activity_type')


@admin.register(CoinRewardClaim)
class CoinRewardClaimAdmin(admin.ModelAdmin):
    list_display = ('user', 'rule', 'activity_reference', 'coins_awarded', 'xp_awarded', 'claimed_at')
    search_fields = ('user__username', 'activity_reference')
    list_filter = ('rule__activity_type', 'claimed_at')
    readonly_fields = ('user', 'rule', 'activity_reference', 'coins_awarded', 'xp_awarded', 'wallet_transaction', 'claimed_at')


@admin.register(CoinTopUp)
class CoinTopUpAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'amount_npr',
        'coins_expected',
        'bonus_coins',
        'payment_method_name',
        'payment_reference',
        'status',
        'created_at'
    )
    list_filter = ('status', 'payment_method_name', 'created_at')
    search_fields = ('user__username', 'payment_reference', 'idempotency_key')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ContentCoinPricing)
class ContentCoinPricingAdmin(admin.ModelAdmin):
    list_display = ('content_type', 'content_id', 'coin_price', 'access_duration_days', 'is_enabled', 'updated_at')
    list_filter = ('content_type', 'is_enabled')
    search_fields = ('content_id',)


@admin.register(ContentEntitlement)
class ContentEntitlementAdmin(admin.ModelAdmin):
    list_display = ('user', 'content_type', 'content_id', 'coins_spent', 'status', 'purchased_at', 'expires_at')
    list_filter = ('content_type', 'status', 'purchased_at')
    search_fields = ('user__username', 'content_id')
    readonly_fields = ('user', 'content_type', 'content_id', 'wallet_transaction', 'coins_spent', 'purchased_at')

