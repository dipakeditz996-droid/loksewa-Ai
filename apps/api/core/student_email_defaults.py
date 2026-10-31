"""Default templates and metadata for student email notifications in LoksewaAI.
Contains full copy, placeholders, sample contexts, and category classifications
for all 21 configurable student notification events across Account, Payments,
Marketplace, and Learning.
"""

STUDENT_EMAIL_NOTIFICATION_DEFAULTS = [
    # -------------------------------------------------------------------------
    # Category 1: Account
    # -------------------------------------------------------------------------
    {
        'event_key': 'welcome_email',
        'category': 'account',
        'name': 'Welcome email',
        'description': 'Sent to newly registered students upon account creation and verification.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Welcome to LoksewaAI! Your account is verified',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Welcome to <strong>LoksewaAI</strong>! Your account has been verified and your preparation workspace is ready.</p>'
            '<p>Explore comprehensive PSC mock exams, syllabus guides, curated notes, and interactive practice sets crafted specifically for civil service aspirants across Nepal.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Welcome to LoksewaAI! Your account has been verified and your preparation workspace is ready.\n\n'
            'Explore comprehensive PSC mock exams, syllabus guides, curated notes, and interactive practice sets.\n\n'
            'Login at: {{login_url}}'
        ),
        'available_placeholders': ['student_name', 'email', 'login_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'email': 'ramesh.sharma@example.com',
            'login_url': 'https://www.hemrajkc.com.np/auth/login',
        },
    },
    {
        'event_key': 'email_verification',
        'category': 'account',
        'name': 'Email verification',
        'description': 'Verification code sent to students during registration or email change (Mandatory).',
        'is_enabled': True,
        'is_mandatory': True,
        'subject': 'Verify your LoksewaAI account',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Thank you for signing up for LoksewaAI. Use the verification code below to confirm your email address and activate your account:</p>'
            '<div style="text-align: center; margin: 24px 0;">'
            '<span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; background: #eef2ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #6366f1;">{{otp_code}}</span>'
            '</div>'
            '<p style="font-size: 13px; color: #64748b;">This code will expire in {{ttl_minutes}} minutes. If you did not create an account, please disregard this email.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your LoksewaAI verification code is: {{otp_code}}\n\n'
            'This code will expire in {{ttl_minutes}} minutes.\n'
            'If you did not request this, you can safely ignore this email.'
        ),
        'available_placeholders': ['student_name', 'otp_code', 'ttl_minutes'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'otp_code': '849201',
            'ttl_minutes': '10',
        },
    },
    {
        'event_key': 'password_reset',
        'category': 'account',
        'name': 'Password reset',
        'description': 'Security verification code sent when a student initiates password recovery (Mandatory).',
        'is_enabled': True,
        'is_mandatory': True,
        'subject': 'Reset your LoksewaAI password',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>We received a request to reset the password for your LoksewaAI account. Use the one-time code below to proceed:</p>'
            '<div style="text-align: center; margin: 24px 0;">'
            '<span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #dc2626; background: #fef2f2; padding: 12px 24px; border-radius: 8px; border: 1px dashed #ef4444;">{{otp_code}}</span>'
            '</div>'
            '<p style="font-size: 13px; color: #64748b;">This code will expire in {{ttl_minutes}} minutes. If you did not request a password reset, your password remains unchanged and you can safely disregard this message.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your password reset code is: {{otp_code}}\n\n'
            'This code expires in {{ttl_minutes}} minutes.\n'
            'If you did not request this, you can ignore this email.'
        ),
        'available_placeholders': ['student_name', 'otp_code', 'ttl_minutes'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'otp_code': '512930',
            'ttl_minutes': '10',
        },
    },
    {
        'event_key': 'password_change_confirmation',
        'category': 'account',
        'name': 'Password change confirmation',
        'description': 'Security alert notifying the student when their account password has been changed (Mandatory).',
        'is_enabled': True,
        'is_mandatory': True,
        'subject': 'Your LoksewaAI password has been changed',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>This is a confirmation that your LoksewaAI account password was recently changed. If you performed this change, no further action is required.</p>'
            '<p style="color: #b91c1c; font-size: 13px;">If you did not authorize this change, please contact LoksewaAI support immediately to secure your account.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your LoksewaAI password was successfully updated. If you did this, you can ignore this email.\n'
            'If you did not make this change, please contact support immediately at {{support_url}}'
        ),
        'available_placeholders': ['student_name', 'support_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'support_url': 'https://www.hemrajkc.com.np/contact',
        },
    },

    # -------------------------------------------------------------------------
    # Category 2: Payments and subscriptions
    # -------------------------------------------------------------------------
    {
        'event_key': 'payment_submitted',
        'category': 'payment',
        'name': 'Payment submitted',
        'description': 'Receipt acknowledging that payment proof has been submitted and is under verification.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Payment Received - Verification in Progress',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Thank you for submitting your payment of <strong>Rs. {{amount}}</strong> for <strong>{{title_ref}}</strong> (Transaction Reference: <code>{{transaction_id}}</code>).</p>'
            '<p>Our accounts team is reviewing your transaction slip. Once approved, your package access will be activated immediately.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Thank you for submitting your payment of Rs. {{amount}} for {{title_ref}} (Reference: {{transaction_id}}).\n\n'
            'Our accounts team is reviewing your transaction slip. You will be notified as soon as it is approved.'
        ),
        'available_placeholders': ['student_name', 'amount', 'title_ref', 'transaction_id'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'amount': '1,500',
            'title_ref': 'Kharidar Complete Package',
            'transaction_id': 'TXN-98412',
        },
    },
    {
        'event_key': 'payment_approved',
        'category': 'payment',
        'name': 'Payment approved',
        'description': 'Notification sent when student payment is verified and enrolled in the package.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Payment Approved - Access Activated!',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Great news! Your payment of <strong>Rs. {{amount}}</strong> for <strong>{{title_ref}}</strong> has been verified and approved.</p>'
            '<p>Your full access has been activated. You can now access all included mock exams, study notes, and syllabus materials.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your payment of Rs. {{amount}} for {{title_ref}} has been approved!\n'
            'Receipt: {{receipt_number}}\n\n'
            'Your access is now active. Start practicing at {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'amount', 'title_ref', 'receipt_number', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'amount': '1,500',
            'title_ref': 'Kharidar Complete Package',
            'action_url': 'https://www.hemrajkc.com.np/student/dashboard',
        },
    },
    {
        'event_key': 'payment_rejected',
        'category': 'payment',
        'name': 'Payment rejected',
        'description': 'Notification sent when a submitted payment proof is rejected with a reason.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Payment Verification Update - Action Required',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>We were unable to verify your submitted payment for <strong>{{title_ref}}</strong>.</p>'
            '<p><strong>Reason provided by accounts:</strong> {{reason}}</p>'
            '<p>Please re-check your payment slip or upload a clear screenshot of the transaction reference to complete verification.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'We were unable to verify your submitted payment for {{title_ref}}.\n\n'
            'Reason: {{reason}}\n\n'
            'Please re-upload a clear receipt at {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'title_ref', 'reason', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'title_ref': 'Kharidar Complete Package',
            'reason': 'Transaction reference number did not match bank statement.',
            'action_url': 'https://www.hemrajkc.com.np/student/purchases',
        },
    },
    {
        'event_key': 'subscription_activated',
        'category': 'payment',
        'name': 'Subscription activated',
        'description': 'Notification when a plan subscription is activated or upgraded.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Your Subscription is Now Active',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your subscription for <strong>{{plan_name}}</strong> has been activated successfully! Your plan is valid until <strong>{{expiry_date}}</strong>.</p>'
            '<p>Start practicing now with unlimited mock tests, timed exams, and AI-assisted answer reviews.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your subscription for {{plan_name}} is now active until {{expiry_date}}.\n\n'
            'Access your dashboard at {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'plan_name', 'expiry_date', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'plan_name': 'Loksewa Officer All-Access',
            'expiry_date': 'December 31, 2026',
            'action_url': 'https://www.hemrajkc.com.np/student/exams',
        },
    },
    {
        'event_key': 'subscription_expiry_reminder',
        'category': 'payment',
        'name': 'Subscription expiry reminder',
        'description': 'Advance notice sent when a package or subscription is approaching its expiry date.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Your Subscription Expires Soon',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>This is a reminder that your access to <strong>{{plan_name}}</strong> will expire on <strong>{{expiry_date}}</strong> (in {{days_left}} days).</p>'
            '<p>Renew your plan now to retain uninterrupted access to mock examinations, progress reports, and bookmarks.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your subscription for {{plan_name}} expires in {{days_left}} days on {{expiry_date}}.\n\n'
            'Renew your plan to maintain access: {{renewal_url}}'
        ),
        'available_placeholders': ['student_name', 'plan_name', 'days_left', 'expiry_date', 'renewal_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'plan_name': 'Loksewa Officer All-Access',
            'days_left': '7',
            'expiry_date': 'November 07, 2026',
            'renewal_url': 'https://www.hemrajkc.com.np/student/pricing',
        },
    },
    {
        'event_key': 'subscription_expired',
        'category': 'payment',
        'name': 'Subscription expired',
        'description': 'Notification sent when a subscription reaches its expiry date.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Your LoksewaAI Subscription Has Expired',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your subscription to <strong>{{plan_name}}</strong> has expired. Access to premium mock tests and full question sets is currently paused.</p>'
            '<p>You can renew your subscription anytime to immediately restore access and pick up right where you left off.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your subscription to {{plan_name}} has expired.\n\n'
            'Renew anytime at {{renewal_url}} to restore complete access.'
        ),
        'available_placeholders': ['student_name', 'plan_name', 'renewal_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'plan_name': 'Loksewa Officer All-Access',
            'renewal_url': 'https://www.hemrajkc.com.np/student/pricing',
        },
    },

    # -------------------------------------------------------------------------
    # Category 3: Marketplace
    # -------------------------------------------------------------------------
    {
        'event_key': 'order_confirmation',
        'category': 'marketplace',
        'name': 'Order confirmation',
        'description': 'Order receipt sent immediately after placing a book or stationery order.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Order Confirmed - #{{order_id}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Thank you for your order! We have received order <strong>#{{order_id}}</strong> for a total of <strong>Rs. {{total_amount}}</strong>.</p>'
            '<p><strong>Order Items:</strong> {{items_summary}}</p>'
            '<p>We will notify you as soon as your package is dispatched.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Thank you for your order #{{order_id}} (Total: Rs. {{total_amount}}).\n'
            'Items: {{items_summary}}\n\n'
            'Track your order at: {{tracking_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'total_amount', 'items_summary', 'tracking_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'total_amount': '2,450',
            'items_summary': '1x Loksewa General Knowledge Vol. 1, 1x Nepal Constitution Handbook',
            'tracking_url': 'https://www.hemrajkc.com.np/student/orders/1092',
        },
    },
    {
        'event_key': 'order_processing',
        'category': 'marketplace',
        'name': 'Order processing',
        'description': 'Notification when the marketplace order has been accepted and is being prepared.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Order #{{order_id}} is Being Prepared',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your marketplace order <strong>#{{order_id}}</strong> has been accepted and is currently being packed by our dispatch team.</p>'
            '<p>You will receive a dispatch notification with courier details as soon as it ships.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your order #{{order_id}} is currently being prepared for dispatch.\n\n'
            'Track status at: {{tracking_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'tracking_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'tracking_url': 'https://www.hemrajkc.com.np/student/orders/1092',
        },
    },
    {
        'event_key': 'order_dispatched',
        'category': 'marketplace',
        'name': 'Order dispatched',
        'description': 'Shipping notification when the package is handed over to the courier partner.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Order #{{order_id}} Has Been Dispatched',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your order <strong>#{{order_id}}</strong> is on its way!</p>'
            '<p><strong>Courier Partner:</strong> {{carrier_name}}<br/><strong>Tracking Reference:</strong> {{tracking_number}}</p>'
            '<p>Our courier partner will contact you upon arrival in your area.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your order #{{order_id}} has been dispatched via {{carrier_name}} (Tracking: {{tracking_number}}).\n\n'
            'Track your package: {{tracking_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'carrier_name', 'tracking_number', 'tracking_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'carrier_name': 'Sundar Courier',
            'tracking_number': 'TRK-902341',
            'tracking_url': 'https://www.hemrajkc.com.np/student/orders/1092',
        },
    },
    {
        'event_key': 'delivery_status_update',
        'category': 'marketplace',
        'name': 'Delivery status update',
        'description': 'Tracking updates (e.g. out for delivery, delayed, or transit checkpoint).',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Delivery Update for Order #{{order_id}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Here is an update on your shipment for order <strong>#{{order_id}}</strong>:</p>'
            '<p style="padding: 12px 16px; background: #f1f5f9; border-left: 4px solid #3b82f6; border-radius: 4px;">{{status_message}}</p>'
            '<p>Please ensure you are reachable at your registered contact number.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Delivery update for order #{{order_id}}:\n'
            '{{status_message}}\n\n'
            'Track details at: {{tracking_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'status_message', 'tracking_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'status_message': 'Package is out for delivery with courier agent.',
            'tracking_url': 'https://www.hemrajkc.com.np/student/orders/1092',
        },
    },
    {
        'event_key': 'order_delivered',
        'category': 'marketplace',
        'name': 'Order delivered',
        'description': 'Delivery confirmation email sent when the courier marks the package delivered.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Order #{{order_id}} Delivered Successfully',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your order <strong>#{{order_id}}</strong> has been delivered. We hope your study materials serve you well in your preparation journey!</p>'
            '<p>If you have any questions or feedback regarding your books, please reach out to our support team.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your order #{{order_id}} has been delivered successfully!\n\n'
            'Need help? Contact support at: {{support_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'support_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'support_url': 'https://www.hemrajkc.com.np/support',
        },
    },
    {
        'event_key': 'order_cancelled',
        'category': 'marketplace',
        'name': 'Order cancelled',
        'description': 'Cancellation notice sent when an order is cancelled or refunded.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Order #{{order_id}} Has Been Cancelled',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Your order <strong>#{{order_id}}</strong> has been cancelled.</p>'
            '<p><strong>Reason:</strong> {{reason}}</p>'
            '<p>If you made an advance deposit or have questions regarding refunds, please contact our support desk.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Your order #{{order_id}} has been cancelled.\n'
            'Reason: {{reason}}\n\n'
            'Contact support at: {{support_url}}'
        ),
        'available_placeholders': ['student_name', 'order_id', 'reason', 'support_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'order_id': 'ORD-1092',
            'reason': 'Requested by customer before dispatch.',
            'support_url': 'https://www.hemrajkc.com.np/support',
        },
    },

    # -------------------------------------------------------------------------
    # Category 4: Learning
    # -------------------------------------------------------------------------
    {
        'event_key': 'course_access',
        'category': 'learning',
        'name': 'New learning/course access',
        'description': 'Notification when access to a new course, syllabus pack, or curriculum is granted.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Access Granted: {{course_title}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>You have been enrolled in <strong>{{course_title}}</strong>! Your course dashboard has been updated with full access to video lectures, syllabus modules, and revision sheets.</p>'
            '<p>Start learning today at your own pace.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'You now have access to {{course_title}}!\n\n'
            'Open your course: {{course_url}}'
        ),
        'available_placeholders': ['student_name', 'course_title', 'course_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'course_title': 'Section Officer Second Paper Preparation',
            'course_url': 'https://www.hemrajkc.com.np/student/courses/section-officer',
        },
    },
    {
        'event_key': 'exam_announcement',
        'category': 'learning',
        'name': 'Exam announcement',
        'description': 'Notification when a new public mock test or scheduled exam is announced.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'New Exam Available: {{exam_title}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>A new examination, <strong>{{exam_title}}</strong>, has been published on LoksewaAI.</p>'
            '<p><strong>Scheduled Date:</strong> {{exam_date}}</p>'
            '<p>Test your knowledge under real exam timing conditions and get instant percentile rankings.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'New exam announced: {{exam_title}}\n'
            'Scheduled Date: {{exam_date}}\n\n'
            'View details and enroll: {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'exam_title', 'exam_date', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'exam_title': 'PSC All-Nepal Mock Exam Series #4',
            'exam_date': 'Saturday, Nov 07, 2026 at 11:00 AM',
            'action_url': 'https://www.hemrajkc.com.np/student/exams/series-4',
        },
    },
    {
        'event_key': 'exam_reminder',
        'category': 'learning',
        'name': 'Exam reminder',
        'description': 'Reminder sent before an enrolled or scheduled exam is set to start.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Reminder: {{exam_title}} Starts Soon',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>This is a quick reminder that <strong>{{exam_title}}</strong> starts in <strong>{{start_time}}</strong>.</p>'
            '<p>Please make sure you have a stable internet connection and are ready to begin on time.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Reminder: {{exam_title}} starts in {{start_time}}.\n\n'
            'Go to exam hall: {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'exam_title', 'start_time', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'exam_title': 'PSC All-Nepal Mock Exam Series #4',
            'start_time': '30 minutes (11:00 AM)',
            'action_url': 'https://www.hemrajkc.com.np/student/exams/series-4',
        },
    },
    {
        'event_key': 'result_published',
        'category': 'learning',
        'name': 'Result published',
        'description': 'Notification when results, scorecards, or rankings for an exam are published.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Results Published: {{exam_title}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>Results for <strong>{{exam_title}}</strong> are now available!</p>'
            '<p><strong>Your Score:</strong> {{score}}<br/><strong>Rank:</strong> {{rank}}</p>'
            '<p>Review detailed answer explanations, question-by-question breakdown, and performance analytics now.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Results published for {{exam_title}}!\n'
            'Score: {{score}}\n'
            'Rank: {{rank}}\n\n'
            'View full result scorecard: {{result_url}}'
        ),
        'available_placeholders': ['student_name', 'exam_title', 'score', 'rank', 'result_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'exam_title': 'PSC All-Nepal Mock Exam Series #4',
            'score': '78 / 100',
            'rank': '14th out of 1,240 participants',
            'result_url': 'https://www.hemrajkc.com.np/student/results/mock-4',
        },
    },
    {
        'event_key': 'student_announcement',
        'category': 'learning',
        'name': 'Important student announcement',
        'description': 'Platform-wide or course-wide announcement broadcast from LoksewaAI administration.',
        'is_enabled': True,
        'is_mandatory': False,
        'subject': 'Announcement: {{announcement_title}}',
        'body_html': (
            '<p>Hello {{student_name}},</p>'
            '<p>There is an important announcement from the LoksewaAI Academic Team:</p>'
            '<div style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 16px 0;">{{announcement_content}}</div>'
            '<p>Please stay tuned to your student dashboard for further updates.</p>'
        ),
        'body_text': (
            'Hello {{student_name}},\n\n'
            'Announcement: {{announcement_title}}\n\n'
            '{{announcement_content}}\n\n'
            'Read more on your dashboard: {{action_url}}'
        ),
        'available_placeholders': ['student_name', 'announcement_title', 'announcement_content', 'action_url'],
        'sample_context': {
            'student_name': 'Ramesh Sharma',
            'announcement_title': 'Revised Public Service Commission Syllabus 2026',
            'announcement_content': 'The syllabus for Kharidar Paper II has been updated with new administrative procedure questions.',
            'action_url': 'https://www.hemrajkc.com.np/student/announcements',
        },
    },
]
