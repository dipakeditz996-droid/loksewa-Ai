from django.urls import path
from .views import (
    StudentWalletView,
    StudentWalletSummaryView,
    StudentWalletTransactionsView,
    StudentWalletTransactionDetailView,
    TopUpConfigView,
    TopUpRequestCreateView,
    TopUpSubmitPaymentView,
    TopUpStatusView,
    StudentTopUpHistoryView,
    XPConversionEligibilityView,
    XPConversionPreviewView,
    XPConversionSubmitView,
    XPConversionHistoryView,
    AdminWalletStatsView,
    AdminWalletListView,
    AdminWalletDetailView,
    AdminWalletLockView,
    AdminWalletAdjustView,
    AdminTopUpListView,
    AdminTopUpDetailView,
    AdminTopUpActionView,
    AdminXPSettingsView,
    AdminTopUpSettingsView,
    ContentAccessCheckView,
    ContentPurchaseView,
    StudentPurchasedContentView,
    AdminContentPricingView,
    AdminContentPricingBulkView,
    AdminMonetizationAnalyticsView,
)

urlpatterns = [
    # Student Wallet
    path('', StudentWalletView.as_view(), name='student-wallet'),
    path('summary/', StudentWalletSummaryView.as_view(), name='student-wallet-summary'),
    path('transactions/', StudentWalletTransactionsView.as_view(), name='student-wallet-transactions'),
    path('transactions/<int:pk>/', StudentWalletTransactionDetailView.as_view(), name='student-wallet-transaction-detail'),

    # Content Monetization & Purchase (Phase G)
    path('content/access-check/', ContentAccessCheckView.as_view(), name='wallet-content-access-check'),
    path('content/purchase/', ContentPurchaseView.as_view(), name='wallet-content-purchase'),
    path('content/purchased/', StudentPurchasedContentView.as_view(), name='wallet-content-purchased'),

    # Student Top-ups
    path('topup/config/', TopUpConfigView.as_view(), name='topup-config'),
    path('topup/request/', TopUpRequestCreateView.as_view(), name='topup-request-create'),
    path('topup/<int:pk>/submit/', TopUpSubmitPaymentView.as_view(), name='topup-submit-payment'),
    path('topup/<int:pk>/status/', TopUpStatusView.as_view(), name='topup-status'),
    path('topups/', StudentTopUpHistoryView.as_view(), name='student-topup-history'),

    # XP Conversion
    path('xp-conversion/eligibility/', XPConversionEligibilityView.as_view(), name='xp-conversion-eligibility'),
    path('xp-conversion/preview/', XPConversionPreviewView.as_view(), name='xp-conversion-preview'),
    path('xp-conversion/submit/', XPConversionSubmitView.as_view(), name='xp-conversion-submit'),
    path('xp-conversion/history/', XPConversionHistoryView.as_view(), name='xp-conversion-history'),

    # Admin Wallet & Top-up Management
    path('admin/stats/', AdminWalletStatsView.as_view(), name='admin-wallet-stats'),
    path('admin/wallets/', AdminWalletListView.as_view(), name='admin-wallet-list'),
    path('admin/wallets/<int:pk>/', AdminWalletDetailView.as_view(), name='admin-wallet-detail'),
    path('admin/wallets/<int:pk>/lock/', AdminWalletLockView.as_view(), name='admin-wallet-lock'),
    path('admin/wallets/<int:pk>/adjust/', AdminWalletAdjustView.as_view(), name='admin-wallet-adjust'),
    path('admin/topups/', AdminTopUpListView.as_view(), name='admin-topup-list'),
    path('admin/topups/<int:pk>/', AdminTopUpDetailView.as_view(), name='admin-topup-detail'),
    path('admin/topups/<int:pk>/action/', AdminTopUpActionView.as_view(), name='admin-topup-action'),
    path('admin/xp-settings/', AdminXPSettingsView.as_view(), name='admin-xp-settings'),
    path('admin/topup-settings/', AdminTopUpSettingsView.as_view(), name='admin-topup-settings'),

    # Admin Content Pricing & Monetization (Phase G)
    path('admin/content-pricing/', AdminContentPricingView.as_view(), name='wallet-admin-content-pricing'),
    path('admin/content-pricing/bulk-update/', AdminContentPricingBulkView.as_view(), name='wallet-admin-content-pricing-bulk'),
    path('admin/monetization-analytics/', AdminMonetizationAnalyticsView.as_view(), name='wallet-admin-monetization-analytics'),
]
