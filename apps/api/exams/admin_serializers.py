from rest_framework import serializers
from .models import ExamCategory, Exam, Paper, Subject, Chapter, Topic

class AdminExamCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamCategory
        fields = '__all__'

class AdminExamSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = Exam
        fields = '__all__'

class AdminPaperSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    
    class Meta:
        model = Paper
        fields = '__all__'

class AdminSubjectSerializer(serializers.ModelSerializer):
    paper_name = serializers.CharField(source='paper.name', read_only=True)
    
    class Meta:
        model = Subject
        fields = '__all__'

class AdminChapterSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    
    class Meta:
        model = Chapter
        fields = '__all__'

class AdminTopicSerializer(serializers.ModelSerializer):
    chapter_name = serializers.CharField(source='chapter.title', read_only=True)
    
    class Meta:
        model = Topic
        fields = '__all__'
