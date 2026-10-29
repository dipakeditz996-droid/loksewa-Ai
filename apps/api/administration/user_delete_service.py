import logging
from django.db import connection, transaction

logger = logging.getLogger(__name__)

# Complete dependency SQL to execute in a single database roundtrip on PostgreSQL.
# Updates SET_NULL relations and cascades child records in dependency order,
# avoiding Django's 70+ sequential ORM Collector queries over remote poolers.
FAST_USER_DELETE_SQL = """
-- 1. SET NULL updates for models referencing User
UPDATE exams_evaluation SET evaluator_id = NULL WHERE evaluator_id = %(uid)s;
UPDATE exams_annotation SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE exams_subjectivesubmission SET evaluator_id = NULL WHERE evaluator_id = %(uid)s;
UPDATE exams_subjectivecheckingrequest SET assigned_evaluator_id = NULL WHERE assigned_evaluator_id = %(uid)s;
UPDATE exams_subjectivecheckingrequest SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_calmsessionlog SET student_id = NULL WHERE student_id = %(uid)s;
UPDATE exams_examinationrequest SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_examination SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE exams_examination SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_questionset SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE exams_questionset SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_questioncollection SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE exams_question SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE exams_question SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_questionissuereport SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE exams_subjectivequestionset SET created_by_id = NULL WHERE created_by_id = %(uid)s;

UPDATE marketplace_product SET seller_id = NULL WHERE seller_id = %(uid)s;
UPDATE marketplace_paymentsubmission SET verified_by_id = NULL WHERE verified_by_id = %(uid)s;
UPDATE marketplace_orderstatushistory SET changed_by_id = NULL WHERE changed_by_id = %(uid)s;
UPDATE marketplace_marketplacelistingreport SET resolved_by_id = NULL WHERE resolved_by_id = %(uid)s;
UPDATE marketplace_dispute SET resolved_by_id = NULL WHERE resolved_by_id = %(uid)s;
UPDATE marketplace_sellerpayout SET processed_by_id = NULL WHERE processed_by_id = %(uid)s;

UPDATE games_gamematch SET player2_id = NULL WHERE player2_id = %(uid)s;
UPDATE games_gamematch SET winner_id = NULL WHERE winner_id = %(uid)s;

UPDATE notes_materialcollection SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE notes_studymaterial SET teacher_id = NULL WHERE teacher_id = %(uid)s;

UPDATE administration_auditlog SET actor_id = NULL WHERE actor_id = %(uid)s;
UPDATE administration_csvimport SET admin_id = NULL WHERE admin_id = %(uid)s;
UPDATE administration_exportjob SET requested_by_id = NULL WHERE requested_by_id = %(uid)s;
UPDATE administration_trashitem SET deleted_by_id = NULL WHERE deleted_by_id = %(uid)s;
UPDATE administration_trashitem SET restored_by_id = NULL WHERE restored_by_id = %(uid)s;
UPDATE administration_trashitem SET permanent_deleted_by_id = NULL WHERE permanent_deleted_by_id = %(uid)s;
UPDATE administration_databasebackup SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE administration_pdfbrandingsetting SET updated_by_id = NULL WHERE updated_by_id = %(uid)s;
UPDATE administration_pdfbrandingbatchjob SET created_by_id = NULL WHERE created_by_id = %(uid)s;

UPDATE ai_tutor_prompttemplate SET updated_by_id = NULL WHERE updated_by_id = %(uid)s;
UPDATE support_studentprofile SET admin_granted_by_id = NULL WHERE admin_granted_by_id = %(uid)s;

UPDATE subscriptions_subscription SET granted_by_id = NULL WHERE granted_by_id = %(uid)s;
UPDATE subscriptions_usageledger SET admin_user_id = NULL WHERE admin_user_id = %(uid)s;
UPDATE subscriptions_subscriptionpayment SET verified_by_id = NULL WHERE verified_by_id = %(uid)s;

UPDATE courses_courseapplication SET reviewed_by_id = NULL WHERE reviewed_by_id = %(uid)s;
UPDATE community_communityreport SET resolved_by_id = NULL WHERE resolved_by_id = %(uid)s;

UPDATE core_emailotp SET generated_by_id = NULL WHERE generated_by_id = %(uid)s;
UPDATE core_studentfeedback SET given_by_id = NULL WHERE given_by_id = %(uid)s;
UPDATE core_testimonial SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE core_websitepage SET updated_by_id = NULL WHERE updated_by_id = %(uid)s;
UPDATE core_adminnotification SET created_by_id = NULL WHERE created_by_id = %(uid)s;
UPDATE core_adminsettings SET updated_by_id = NULL WHERE updated_by_id = %(uid)s;
UPDATE token_blacklist_outstandingtoken SET user_id = NULL WHERE user_id = %(uid)s;

-- 2. CASCADE deletes from deepest child upward
-- Exams:
DELETE FROM exams_subjectivesubmissionpage WHERE submission_id IN (
    SELECT s.id FROM exams_subjectivesubmission s
    JOIN exams_examinationattempt a ON s.attempt_id = a.id
    WHERE a.student_id = %(uid)s
);
DELETE FROM exams_subjectivesubmission WHERE attempt_id IN (
    SELECT id FROM exams_examinationattempt WHERE student_id = %(uid)s
);
DELETE FROM exams_studentanswer WHERE attempt_id IN (
    SELECT id FROM exams_examinationattempt WHERE student_id = %(uid)s
);
DELETE FROM exams_questionissuereport WHERE examination_attempt_id IN (
    SELECT id FROM exams_examinationattempt WHERE student_id = %(uid)s
) OR practice_session_id IN (
    SELECT id FROM exams_practicesession WHERE user_id = %(uid)s
) OR student_id = %(uid)s;

DELETE FROM exams_examinationrequest WHERE student_id = %(uid)s;
DELETE FROM exams_examinationattempt WHERE student_id = %(uid)s;

DELETE FROM exams_subjectiveanswer WHERE attempt_id IN (
    SELECT id FROM exams_subjectiveattempt WHERE student_id = %(uid)s
);
DELETE FROM exams_subjectiveattempt WHERE student_id = %(uid)s;
DELETE FROM exams_subjectivecheckingrequest WHERE student_id = %(uid)s;

DELETE FROM exams_questionattempt WHERE session_id IN (
    SELECT id FROM exams_practicesession WHERE user_id = %(uid)s
);
DELETE FROM exams_practicesession WHERE user_id = %(uid)s;

DELETE FROM exams_usertopicprogress WHERE user_id = %(uid)s;
DELETE FROM exams_questionmastery WHERE user_id = %(uid)s;
DELETE FROM exams_bookmark WHERE user_id = %(uid)s;

-- Marketplace:
DELETE FROM marketplace_orderitem WHERE order_id IN (
    SELECT id FROM marketplace_order WHERE student_id = %(uid)s
);
DELETE FROM marketplace_orderstatushistory WHERE order_id IN (
    SELECT id FROM marketplace_order WHERE student_id = %(uid)s
);
DELETE FROM marketplace_paymentsubmission WHERE student_id = %(uid)s OR order_id IN (
    SELECT id FROM marketplace_order WHERE student_id = %(uid)s
);
DELETE FROM marketplace_purchase WHERE student_id = %(uid)s;
DELETE FROM marketplace_deliveryaddress WHERE student_id = %(uid)s;
DELETE FROM marketplace_cartitem WHERE cart_id IN (
    SELECT id FROM marketplace_cart WHERE student_id = %(uid)s
);
DELETE FROM marketplace_cart WHERE student_id = %(uid)s;
DELETE FROM marketplace_order WHERE student_id = %(uid)s;
DELETE FROM marketplace_marketplacelistingreport WHERE reporter_id = %(uid)s;
DELETE FROM marketplace_review WHERE buyer_id = %(uid)s OR seller_id = %(uid)s;
DELETE FROM marketplace_disputeevidence WHERE uploaded_by_id = %(uid)s;
DELETE FROM marketplace_dispute WHERE buyer_id = %(uid)s OR seller_id = %(uid)s;
DELETE FROM marketplace_payoutaccount WHERE seller_id = %(uid)s;
DELETE FROM marketplace_sellerpayout WHERE seller_id = %(uid)s;

-- Subscriptions:
DELETE FROM subscriptions_subscriptioncourseselection WHERE subscription_id IN (
    SELECT id FROM subscriptions_subscription WHERE student_id = %(uid)s
);
DELETE FROM subscriptions_usageledger WHERE student_id = %(uid)s;
DELETE FROM subscriptions_studententitlement WHERE student_id = %(uid)s;
DELETE FROM subscriptions_invoice WHERE student_id = %(uid)s;
DELETE FROM subscriptions_subscriptionpayment WHERE student_id = %(uid)s;
DELETE FROM subscriptions_subscription WHERE student_id = %(uid)s;

-- Courses:
DELETE FROM courses_teachermessage WHERE sender_id = %(uid)s OR recipient_id = %(uid)s;
DELETE FROM courses_teacherstudentnote WHERE student_id = %(uid)s OR teacher_id = %(uid)s;
DELETE FROM courses_courseapplication WHERE student_id = %(uid)s;
DELETE FROM courses_teachercourseassignment WHERE teacher_id = %(uid)s;
DELETE FROM courses_enrollment WHERE student_id = %(uid)s;

-- Gamification & games:
DELETE FROM gamification_studentachievement WHERE user_id = %(uid)s;
DELETE FROM gamification_xptransaction WHERE user_id = %(uid)s;
DELETE FROM gamification_referral WHERE referrer_id = %(uid)s OR referred_user_id = %(uid)s;
DELETE FROM gamification_gamificationprofile WHERE user_id = %(uid)s;

DELETE FROM games_gameanswer WHERE player_id = %(uid)s;
DELETE FROM games_weeklyquizattempt WHERE student_id = %(uid)s;
DELETE FROM games_dailydrillsession WHERE student_id = %(uid)s;
DELETE FROM games_survivalgame WHERE player_id = %(uid)s;
DELETE FROM games_gamematch WHERE player1_id = %(uid)s;
DELETE FROM games_gameprofile WHERE user_id = %(uid)s;

-- Notes & study plan:
DELETE FROM notes_studentmaterialbookmark WHERE student_id = %(uid)s;
DELETE FROM notes_studentmaterialprogress WHERE student_id = %(uid)s;
DELETE FROM study_plan_studyplan WHERE student_id = %(uid)s;

-- AI Tutor:
DELETE FROM ai_tutor_message WHERE conversation_id IN (
    SELECT id FROM ai_tutor_conversation WHERE student_id = %(uid)s
);
DELETE FROM ai_tutor_conversation WHERE student_id = %(uid)s;
DELETE FROM ai_tutor_tutorusage WHERE student_id = %(uid)s;

-- Support:
DELETE FROM support_supportmessage WHERE sender_id = %(uid)s OR ticket_id IN (
    SELECT id FROM support_supportticket WHERE student_id = %(uid)s
);
DELETE FROM support_supportticket WHERE student_id = %(uid)s;
DELETE FROM support_notificationpreference WHERE user_id = %(uid)s;
DELETE FROM support_faqfeedback WHERE user_id = %(uid)s;
DELETE FROM support_studentprofile WHERE user_id = %(uid)s;

-- Core:
DELETE FROM core_socialaccount WHERE user_id = %(uid)s;
DELETE FROM core_teacherprofile WHERE user_id = %(uid)s;
DELETE FROM core_notification WHERE recipient_id = %(uid)s;
DELETE FROM core_studentfeedback WHERE student_id = %(uid)s;
DELETE FROM core_twofactorbackupcode WHERE user_id = %(uid)s;
DELETE FROM django_admin_log WHERE user_id = %(uid)s;
DELETE FROM core_user_groups WHERE user_id = %(uid)s;
DELETE FROM core_user_user_permissions WHERE user_id = %(uid)s;

-- Community:
DELETE FROM community_communityhelpfulvote WHERE reply_id IN (
    SELECT id FROM community_communityreply WHERE post_id IN (
        SELECT id FROM community_communitypost WHERE author_id = %(uid)s
    ) OR author_id = %(uid)s
) OR user_id = %(uid)s;
DELETE FROM community_communityreport WHERE post_id IN (
    SELECT id FROM community_communitypost WHERE author_id = %(uid)s
) OR reply_id IN (
    SELECT id FROM community_communityreply WHERE post_id IN (
        SELECT id FROM community_communitypost WHERE author_id = %(uid)s
    ) OR author_id = %(uid)s
) OR reporter_id = %(uid)s;
DELETE FROM community_communitybookmark WHERE post_id IN (
    SELECT id FROM community_communitypost WHERE author_id = %(uid)s
) OR user_id = %(uid)s;
DELETE FROM community_communityreply WHERE post_id IN (
    SELECT id FROM community_communitypost WHERE author_id = %(uid)s
) OR author_id = %(uid)s;
DELETE FROM community_communitypost WHERE author_id = %(uid)s;

-- Finally delete user row
DELETE FROM core_user WHERE id = %(uid)s;
"""


def fast_delete_user(user):
    """
    Performs fast, dependency-safe deletion of a user and all cascade data.

    In production/remote PostgreSQL, this sends a single multi-statement transaction
    to PostgreSQL, finishing in ~1-2s instead of 40-50s over remote poolers.
    Falls back gracefully to standard Django ORM delete() for SQLite or on error.
    """
    user_id = user.id
    if connection.vendor == 'postgresql':
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute(FAST_USER_DELETE_SQL, {'uid': user_id})
            user.id = None
            user.pk = None
            return
        except Exception as exc:
            logger.warning(
                "fast_delete_user raw execution failed for user %s (%s); falling back to ORM: %s",
                user_id, getattr(user, 'username', ''), exc
            )

    # Fallback to standard Django ORM delete (e.g., SQLite under unit tests)
    user.delete()
