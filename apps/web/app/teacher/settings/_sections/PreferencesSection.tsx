import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TeacherProfile, updateTeacherPreferences } from "@/lib/api/teacher-settings";

export function PreferencesSection({
  profile,
  setProfile,
}: {
  profile: TeacherProfile;
  setProfile: (p: TeacherProfile) => void;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [prefs, setPrefs] = useState({
    preferred_difficulty: profile.preferred_difficulty || "medium",
    preferred_question_type: profile.preferred_question_type || "mcq",
  });

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPrefs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateTeacherPreferences(prefs);
      setProfile({ ...profile, ...updated });
      toast.success("Preferences updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const selectClass = "flex h-10 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="border-b border-border pb-5">
        <h3 className="text-lg font-semibold text-foreground">Teaching Preferences</h3>
        <p className="text-sm text-muted-foreground">
          Set default values to speed up your content creation workflow.
        </p>
      </div>

      <div className="grid gap-6 pt-2 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Default Question Difficulty</label>
          <p className="mb-2 text-xs text-muted-foreground">The default difficulty selected when creating new questions.</p>
          <select
            name="preferred_difficulty"
            value={prefs.preferred_difficulty}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Default Question Type</label>
          <p className="mb-2 text-xs text-muted-foreground">The default format selected when creating new questions.</p>
          <select
            name="preferred_question_type"
            value={prefs.preferred_question_type}
            onChange={handleChange}
            className={selectClass}
          >
            <option value="mcq">Multiple Choice (MCQ)</option>
            <option value="true_false">True / False</option>
            <option value="short_answer">Short Answer</option>
            <option value="subjective">Subjective / Essay</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex justify-end border-t border-border pt-6">
        <Button onClick={handleSave} disabled={isSaving} className="rounded-[9px] bg-[#0B2545] dark:bg-[#D4A72C] text-white dark:text-[#0A1118] font-bold hover:bg-[#163E6C] dark:hover:bg-[#bfa228]">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preferences
        </Button>
      </div>
    </div>
  );
}
