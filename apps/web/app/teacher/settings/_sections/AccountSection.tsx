import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TeacherProfile, changeTeacherPassword } from "@/lib/api/teacher-settings";

export function AccountSection({ profile }: { profile: TeacherProfile }) {
  const [isChanging, setIsChanging] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setIsChanging(true);
      const res = await changeTeacherPassword(passwordData);
      
      // Update local storage with new tokens
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", res.access);
        localStorage.setItem("refresh_token", res.refresh);
      }
      
      toast.success(res.detail || "Password updated successfully.");
      setPasswordData({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error: any) {
      toast.error(error?.message || "Failed to change password");
    } finally {
      setIsChanging(false);
    }
  };

  const joinDate = new Date(profile.date_joined).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="space-y-6">
      
      {/* Account Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7EBF3] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-[#E7EBF3] pb-5 mb-5">
          <h3 className="text-lg font-semibold text-[#101828]">Account Information</h3>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-[#667085] mb-1">Email Address</p>
            <p className="text-[#101828] font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-[#667085] mb-1">Account Role</p>
            <Badge variant="outline" className="bg-[#EEF2F8] text-[#0B2545] border-[#E3E9F2] capitalize">
              {profile.role.replace('-', ' ')}
            </Badge>
          </div>
          <div>
            <p className="text-sm font-medium text-[#667085] mb-1">Status</p>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${profile.is_active ? 'bg-[#159A82]' : 'bg-[#DC5A5A]'}`} />
              <span className="text-[#101828] font-medium">
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#667085] mb-1">Member Since</p>
            <p className="text-[#101828] font-medium">{joinDate}</p>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white p-6 rounded-2xl border border-[#E7EBF3] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-[#E7EBF3] pb-5 mb-5">
          <h3 className="text-lg font-semibold text-[#101828]">Change Password</h3>
          <p className="text-sm text-[#667085]">
            Ensure your account is using a long, random password to stay secure.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#344054]">Current Password</label>
            <Input 
              type="password" 
              name="current_password" 
              required
              value={passwordData.current_password} 
              onChange={handleChange} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#344054]">New Password</label>
            <Input 
              type="password" 
              name="new_password"
              required 
              value={passwordData.new_password} 
              onChange={handleChange} 
            />
          </div>
          <div className="space-y-2 pb-2">
            <label className="text-sm font-medium text-[#344054]">Confirm New Password</label>
            <Input 
              type="password" 
              name="confirm_password" 
              required
              value={passwordData.confirm_password} 
              onChange={handleChange} 
            />
          </div>

          <Button type="submit" disabled={isChanging || !passwordData.current_password || !passwordData.new_password} className="bg-[#0B2545] hover:bg-[#163E6C] text-white w-full sm:w-auto">
            {isChanging && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </div>

    </div>
  );
}
