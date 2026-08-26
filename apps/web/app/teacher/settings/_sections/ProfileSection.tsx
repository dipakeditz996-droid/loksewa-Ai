import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Loader2, Camera, Upload } from "lucide-react";
import { TeacherProfile, updateTeacherProfile, uploadTeacherAvatar } from "@/lib/api/teacher-settings";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileSection({
  profile,
  setProfile,
}: {
  profile: TeacherProfile;
  setProfile: (p: TeacherProfile) => void;
}) {
  const { refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    first_name: profile.first_name || "",
    last_name: profile.last_name || "",
    phone_number: profile.phone_number || "",
    designation: profile.designation || "",
    specialization: profile.specialization || "",
    experience_years: profile.experience_years || 0,
    bio: profile.bio || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "experience_years" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updated = await updateTeacherProfile(formData);
      setProfile(updated);
      await refreshUser(); // Update global auth context
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    try {
      setIsUploading(true);
      const res = await uploadTeacherAvatar(file);
      setProfile({ ...profile, avatar: res.avatar_url });
      await refreshUser(); // Update sidebar avatar
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-2xl border border-[#E7EBF3] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="border-b border-[#E7EBF3] pb-5">
        <h3 className="text-lg font-semibold text-[#101828]">Public Profile</h3>
        <p className="text-sm text-[#667085]">
          This information will be displayed to your students.
        </p>
      </div>

      {/* Avatar Upload */}
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-2 border-[#E7EBF3]">
            <AvatarImage src={profile.avatar || ""} />
            <AvatarFallback className="text-2xl bg-[#EEF2F8] text-[#0B2545]">
              {profile.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-6 w-6 text-white" />
          </div>
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/80">
              <Loader2 className="h-6 w-6 animate-spin text-[#0B2545]" />
            </div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-[#101828] mb-1">Profile Picture</h4>
          <p className="text-xs text-[#667085] mb-3">
            JPG, PNG or GIF. 5MB max.
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload New
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 pt-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">First Name</label>
          <Input name="first_name" value={formData.first_name} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">Last Name</label>
          <Input name="last_name" value={formData.last_name} onChange={handleChange} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[#344054]">Email Address</label>
          <Input value={profile.email} disabled className="bg-[#F7F9FC]" />
          <p className="text-xs text-[#667085]">Email addresses cannot be changed directly.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">Phone Number</label>
          <Input name="phone_number" value={formData.phone_number} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">Designation (e.g. Senior Instructor)</label>
          <Input name="designation" value={formData.designation} onChange={handleChange} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">Specialization</label>
          <Input name="specialization" value={formData.specialization} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#344054]">Years of Experience</label>
          <Input type="number" name="experience_years" value={formData.experience_years} onChange={handleChange} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-[#344054]">Professional Bio</label>
          <Textarea 
            name="bio" 
            value={formData.bio} 
            onChange={handleChange} 
            rows={4}
            className="resize-none"
            placeholder="Write a brief introduction about your teaching experience and methodology..."
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-[#E7EBF3]">
        <Button onClick={handleSave} disabled={isSaving} className="bg-[#0B2545] hover:bg-[#163E6C]">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
