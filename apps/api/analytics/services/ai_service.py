import os
import json
import urllib.request
import urllib.error

class AIService:
    @staticmethod
    def get_api_key():
        return os.environ.get("AI_API_KEY", "")

    @staticmethod
    def get_api_url():
        return os.environ.get("AI_API_URL", "https://api.openai.com/v1/chat/completions")

    @staticmethod
    def generate_study_plan(context):
        """
        Generates a concise study plan based on student analytics.
        Uses OpenAI-compatible Chat Completions API.
        If no API key is provided, returns a deterministic fallback.
        """
        api_key = AIService.get_api_key()
        
        # Fallback if no API key is configured
        if not api_key:
            return AIService._get_fallback_plan(context)
            
        url = AIService.get_api_url()
        
        system_prompt = (
            "You are an AI study assistant for Loksewa (Public Service Commission) exams. "
            "Analyze the student's analytics and provide a concise 'AI Study Recommendation' "
            "and a 'Today's Recommended Plan' (list of practical tasks). "
            "Do NOT use emojis, sparkle effects, or overly enthusiastic language. "
            "Keep it professional, academic, and extremely concise. "
            "Respond in JSON format with two keys: 'recommendation' (string) and 'daily_plan' (list of strings)."
        )
        
        user_prompt = f"Student Analytics Context:\n{json.dumps(context, indent=2)}"
        
        data = {
            "model": os.environ.get("AI_MODEL", "gpt-4o-mini"), # or gpt-3.5-turbo
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3
        }
        
        req = urllib.request.Request(
            url, 
            data=json.dumps(data).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode('utf-8'))
                content = result['choices'][0]['message']['content']
                return json.loads(content)
        except Exception as e:
            print(f"AI Service Error: {e}")
            return AIService._get_fallback_plan(context)
            
    @staticmethod
    def _get_fallback_plan(context):
        """Deterministic fallback when AI is unavailable"""
        weak_topics = context.get('weak_topics', [])
        
        if not weak_topics:
            rec = "Your performance is stable across the board. Continue taking full-length Model Exams to maintain your edge."
            plan = ["Attempt one full-length Model Exam", "Review current affairs for 30 mins"]
        else:
            worst = weak_topics[0]
            rec = f"Focus on {worst.get('subject')} today. Your accuracy in {worst.get('topic')} is low, requiring immediate revision."
            plan = [
                f"Review {worst.get('topic')} theoretical notes (45 min)",
                f"Practice 20 objective questions for {worst.get('subject')}",
                "Review any recent incorrect answers"
            ]
            
        return {
            "recommendation": rec,
            "daily_plan": plan
        }
