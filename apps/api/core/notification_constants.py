"""Centralized notification taxonomy and constants for LoksewaAI.
Defines supported event types, categories, channels, and mandatory constraints
for both student-facing and administrative preferences.
"""

# Events that can NEVER be disabled by students (guaranteed security & transactional receipts)
MANDATORY_STUDENT_EVENTS = {
    'security_alerts',
    'account_security',
    'otp',
    'password_reset',
}

# Student notification categories and event taxonomy
STUDENT_NOTIFICATION_TAXONOMY = {
    'learning_exams': {
        'id': 'learning_exams',
        'title': 'Learning & Exams',
        'icon': '📝',
        'description': 'Updates regarding your exam schedules, mock tests, results, and study materials',
        'events': [
            {
                'key': 'exam_announcements',
                'label': 'New Exam / Mock Test Announcements',
                'description': 'Alerts when new mock exams or PSC test series are announced',
                'mandatory': False,
            },
            {
                'key': 'study_material_updates',
                'label': 'New Syllabus & Study Materials',
                'description': 'Notifications when new notes, question sets, or syllabus revisions are added',
                'mandatory': False,
            },
            {
                'key': 'exam_reminders',
                'label': 'Exam Reminders & Deadlines',
                'description': 'Reminders for scheduled exams and approaching application deadlines',
                'mandatory': False,
            },
            {
                'key': 'result_published',
                'label': 'Results & Performance Updates',
                'description': 'Instant updates when exam results, scorecards, or rankings are published',
                'mandatory': False,
            },
            {
                'key': 'learning_resources',
                'label': 'New Learning Resources',
                'description': 'Suggestions and announcements for practice sets and daily learning tasks',
                'mandatory': False,
            },
        ],
    },
    'subscription_payments': {
        'id': 'subscription_payments',
        'title': 'Subscription & Payments',
        'icon': '💳',
        'description': 'Billing, plan expirations, payment verifications, and special package offers',
        'events': [
            {
                'key': 'subscription_expiry',
                'label': 'Subscription Expiry Reminders',
                'description': 'Advance notices when your package or preparation plan is approaching expiry',
                'mandatory': False,
            },
            {
                'key': 'payment_submission',
                'label': 'Payment Submission Confirmations',
                'description': 'Confirmation when your manual payment proof or deposit is received',
                'mandatory': False,
            },
            {
                'key': 'payment_status',
                'label': 'Payment Verification Status',
                'description': 'Notifications when your payment is approved or requires changes',
                'mandatory': False,
            },
            {
                'key': 'subscription_status',
                'label': 'Subscription Status Updates',
                'description': 'Activation, upgrade, or renewal updates for course packages',
                'mandatory': False,
            },
            {
                'key': 'plan_offers',
                'label': 'Relevant Plan & Offer Announcements',
                'description': 'Early access to discounts, renewal offers, and exam package bundles',
                'mandatory': False,
            },
        ],
    },
    'marketplace': {
        'id': 'marketplace',
        'title': 'Marketplace & Books',
        'icon': '🛒',
        'description': 'Physical books, study kit orders, shipping tracking, and COD updates',
        'events': [
            {
                'key': 'order_confirmation',
                'label': 'Order Confirmation',
                'description': 'Receipts and confirmations when a book or study kit order is placed',
                'mandatory': False,
            },
            {
                'key': 'order_payment_status',
                'label': 'Payment & COD Advance Status',
                'description': 'Updates on cash-on-delivery advance verifications and order payments',
                'mandatory': False,
            },
            {
                'key': 'order_delivery_updates',
                'label': 'Order Processing & Delivery Updates',
                'description': 'Tracking notices when your package is packaged, dispatched, and delivered',
                'mandatory': False,
            },
            {
                'key': 'order_cancellation',
                'label': 'Order Cancellation & Refund Status',
                'description': 'Notices regarding order cancellations, returns, and refund resolutions',
                'mandatory': False,
            },
        ],
    },
    'account_platform': {
        'id': 'account_platform',
        'title': 'Account & Platform',
        'icon': '🛡️',
        'description': 'Account security, platform notices, system updates, and maintenance',
        'events': [
            {
                'key': 'security_alerts',
                'label': 'Account Security Alerts',
                'description': 'Critical login notifications, password modifications, and security events (Mandatory)',
                'mandatory': True,
            },
            {
                'key': 'platform_announcements',
                'label': 'Platform Announcements',
                'description': 'General updates and notices from the LoksewaAI administration',
                'mandatory': False,
            },
            {
                'key': 'feature_announcements',
                'label': 'New Feature Announcements',
                'description': 'Notices about new platform features, AI tools, and test formats',
                'mandatory': False,
            },
            {
                'key': 'maintenance_alerts',
                'label': 'Planned Maintenance Notifications',
                'description': 'Advance notifications before scheduled system updates and downtime',
                'mandatory': False,
            },
        ],
    },
}

# Administrative notification categories and supported event taxonomy
ADMIN_NOTIFICATION_TAXONOMY = {
    'registration': {
        'id': 'registration',
        'label': 'Registration & Accounts',
        'description': 'New student accounts and verification events',
        'events': [
            {'key': 'new_student_registration', 'label': 'New Student Registration'},
            {'key': 'new_teacher_registration', 'label': 'New Teacher Account Created'},
        ],
    },
    'payment': {
        'id': 'payment',
        'label': 'Subscription & Payments',
        'description': 'Subscription grants, payment submissions, and manual verification alerts',
        'events': [
            {'key': 'payment_submitted', 'label': 'Payment Proof Submitted (Awaiting Verification)'},
            {'key': 'payment_approved', 'label': 'Payment Approved / Enrolled'},
            {'key': 'payment_rejected', 'label': 'Payment Rejected'},
            {'key': 'subscription_expiry_alert', 'label': 'High-Volume Expiry Digest'},
        ],
    },
    'marketplace': {
        'id': 'marketplace',
        'label': 'Marketplace & Orders',
        'description': 'Physical books, stationery orders, and delivery lifecycle events',
        'events': [
            {'key': 'new_order_placed', 'label': 'New Order Placed'},
            {'key': 'cod_advance_submitted', 'label': 'COD Advance Submitted'},
            {'key': 'order_cancellation_requested', 'label': 'Order Cancellation Requested'},
        ],
    },
    'security': {
        'id': 'security',
        'label': 'Security & Compliance',
        'description': 'Password changes, multiple session conflicts, and access audits',
        'events': [
            {'key': 'admin_security_alert', 'label': 'Security & Login Anomalies'},
            {'key': 'admin_password_change', 'label': 'Staff Password Changes'},
        ],
    },
    'system': {
        'id': 'system',
        'label': 'System & Error Alerts',
        'description': 'Infrastructure status, provider failures, and health alerts',
        'events': [
            {'key': 'system_error_alert', 'label': 'Delivery & System Error Alerts'},
            {'key': 'provider_health_alert', 'label': 'Email / Storage Provider Alerts'},
            {'key': 'maintenance_notice', 'label': 'Maintenance Window Alerts'},
        ],
    },
}

