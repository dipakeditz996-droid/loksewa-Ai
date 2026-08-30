import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface NotificationPreferences {
  question_reviews_inapp: boolean;
  question_reviews_email: boolean;
  study_material_reviews_inapp: boolean;
  study_material_reviews_email: boolean;
  student_activity_inapp: boolean;
  student_activity_email: boolean;
  teacher_system_email: boolean;
}

export function TeacherNotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrefs = async () => {
      try {
        const data = await apiClient<NotificationPreferences>('/notifications/preferences/teacher/');
        setPrefs(data);
      } catch (error) {
        console.error('Failed to fetch preferences', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrefs();
  }, []);

  const handleToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    if (prefs) {
      setPrefs({ ...prefs, [key]: checked });
    }
  };

  const handleSave = async () => {
    if (!prefs) return;
    setIsSaving(true);
    try {
      await apiClient('/notifications/preferences/teacher/', {
        method: 'PATCH',
        body: JSON.stringify(prefs)
      });
      toast.success("Notification preferences updated!");
    } catch (error) {
      toast.error("Failed to save preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!prefs) return null;

  const PreferenceRow = ({ 
    title, 
    description, 
    inAppKey, 
    emailKey, 
    requiredInApp = false 
  }: { 
    title: string; 
    description: string; 
    inAppKey?: keyof NotificationPreferences; 
    emailKey: keyof NotificationPreferences;
    requiredInApp?: boolean;
  }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-5 border-b border-slate-100 last:border-0 gap-4">
      <div className="flex-1 pr-4">
        <h4 className="font-semibold text-primary">{title}</h4>
        <p className="text-sm text-slate-500 mt-1">{description}</p>
      </div>
      <div className="flex items-center gap-6 sm:w-[240px] shrink-0">
        <div className="flex flex-col items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In-App</span>
          {requiredInApp ? (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Required</span>
          ) : inAppKey ? (
            <Switch 
              checked={prefs[inAppKey]} 
              onCheckedChange={(c) => handleToggle(inAppKey, c)}
              className="data-[state=checked]:bg-[#0B2545]"
            />
          ) : null}
        </div>
        <div className="flex flex-col items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</span>
          <Switch 
            checked={prefs[emailKey]} 
            onCheckedChange={(c) => handleToggle(emailKey, c)}
            className="data-[state=checked]:bg-[#0B2545]"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-card border-slate-200/80 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-primary">Notification Preferences</CardTitle>
          <CardDescription>Choose how LoksewaAI keeps you informed about your teaching activity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-6">
            <PreferenceRow 
              title="Student Activity" 
              description="Stay informed about important student activities, performance changes, and flagged students."
              inAppKey="student_activity_inapp"
              emailKey="student_activity_email"
            />
            
            <PreferenceRow 
              title="Question Reviews" 
              description="Know when Admin approves, rejects, or requests changes to your submitted questions."
              inAppKey="question_reviews_inapp"
              emailKey="question_reviews_email"
            />
            
            <PreferenceRow 
              title="Study Materials" 
              description="Get updates when your PDF notes and study materials are reviewed."
              inAppKey="study_material_reviews_inapp"
              emailKey="study_material_reviews_email"
            />
            
            <PreferenceRow 
              title="System & Account Alerts" 
              description="Critical security alerts, account status, and important platform announcements."
              emailKey="teacher_system_email"
              requiredInApp={true}
            />
          </div>
          
          <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <p className="text-xs text-slate-500">Unsaved changes will be lost if you leave this page.</p>
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="bg-[#D4A72C] hover:bg-[#b88c1c] text-white shadow-sm"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
