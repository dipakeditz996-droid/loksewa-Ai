import os
import shutil
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import HomepageBanner
from django.conf import settings

def seed():
    if HomepageBanner.objects.exists():
        print(f"Banners already exist: {HomepageBanner.objects.count()} banners found.")
        return

    media_banners_dir = os.path.join(settings.MEDIA_ROOT, 'banners', 'default')
    os.makedirs(media_banners_dir, exist_ok=True)

    # Source images from apps/web/public/media or public/images
    base_dir = settings.BASE_DIR.parent
    web_media = base_dir / 'web' / 'public' / 'media'
    web_images = base_dir / 'web' / 'public' / 'images'

    hero_src = web_media / 'hero_background.webp'
    course_src = web_media / 'course.webp'
    admin_src = web_images / 'admin_bg.jpg'

    # Copy to media folder if available
    hero_dst = os.path.join(media_banners_dir, 'hero_banner.webp')
    course_dst = os.path.join(media_banners_dir, 'course_banner.webp')
    admin_dst = os.path.join(media_banners_dir, 'exam_banner.jpg')

    if os.path.exists(hero_src):
        shutil.copyfile(hero_src, hero_dst)
    if os.path.exists(course_src):
        shutil.copyfile(course_src, course_dst)
    if os.path.exists(admin_src):
        shutil.copyfile(admin_src, admin_dst)

    banners_data = [
        {
            'title': "Master IOE Entrance & NEC License Examinations",
            'subtitle': "Nepal's premier engineering platform with verified question banks, real-time mock tests, and smart analytics.",
            'badge_text': "IOE Entrance & NEC License 2081/82",
            'cta_text': "Start Preparing Now",
            'cta_url': "/register",
            'cta_secondary_text': "Explore Courses",
            'cta_secondary_url': "/courses",
            'image': 'banners/default/hero_banner.webp',
            'display_order': 0,
            'is_active': True,
        },
        {
            'title': "Curated Engineering Syllabus. Zero Fluff.",
            'subtitle': "Topic-wise weightage and official curriculum breakdowns for PSC Civil, Electrical, and License exams.",
            'badge_text': "Official Syllabus",
            'cta_text': "Browse Syllabus",
            'cta_url': "/syllabus",
            'cta_secondary_text': "Practice Question Sets",
            'cta_secondary_url': "/practice",
            'image': 'banners/default/course_banner.webp',
            'display_order': 1,
            'is_active': True,
        },
        {
            'title': "Real Exam Simulations & Instant Scoring",
            'subtitle': "Experience timed computer-based tests with negative marking, percentile rankings, and full explanations.",
            'badge_text': "Live Mock Tests",
            'cta_text': "Take Mock Test",
            'cta_url': "/exams",
            'cta_secondary_text': "Explore All Exams",
            'cta_secondary_url': "/exams",
            'image': 'banners/default/exam_banner.jpg',
            'display_order': 2,
            'is_active': True,
        },
    ]

    for b in banners_data:
        HomepageBanner.objects.create(**b)
        print(f"Created banner: {b['title']}")

    print("Successfully seeded homepage banners!")

if __name__ == '__main__':
    seed()
