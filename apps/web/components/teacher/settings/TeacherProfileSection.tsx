"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeacherProfile, updateTeacherProfile, uploadTeacherAvatar, TeacherProfile } from "@/lib/api/teacher-settings";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { preloadImage } from "@/lib/preload-image";
import { Camera, Save, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

export function TeacherProfileSection() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["teacher-profile"],
    queryFn: getTeacherProfile,
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    bio: "",
    specialization: "",
    designation: "",
  });
  const [dirty, setDirty] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        phone_number: profile.phone_number || "",
        bio: profile.bio || "",
        specialization: profile.specialization || "",
        designation: profile.designation || "",
      });
    }
  }, [profile]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<TeacherProfile>) => updateTeacherProfile(data),
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      refreshUser();
    },
    onError: () => toast.error("Failed to save profile. Please try again."),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => uploadTeacherAvatar(file),
    onSuccess: async ({ avatar_url }) => {
      toast.success("Photo updated!");
      // Keep showing the local preview until the real Drive-hosted URL is
      // confirmed loadable, so the user never sees a broken-image flash.
      await preloadImage(avatar_url);
      setPhotoPreview(null);
      queryClient.invalidateQueries({ queryKey: ["teacher-profile"] });
      refreshUser();
    },
    onError: () => toast.error("Failed to upload photo."),
  });

  const handleChange = (field: string, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Max 5 MB.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, WebP allowed.");
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
    photoMutation.mutate(file);
  };

  const handleSave = () => {
    updateMutation.mutate(form as any);
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm p-8 space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="flex items-center gap-6">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#0B2545] to-[#163E6B] px-8 py-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-[3px] border-white/30 shadow-lg">
                <AvatarImage src={photoPreview || profile?.avatar || "/images/profile.png"} />
                <AvatarFallback className="bg-[#D4A72C] text-white text-2xl font-bold">
                  {profile?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {photoMutation.isPending ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{profile?.name}</h2>
              <p className="text-white/70 text-sm">@{profile?.username}</p>
              <p className="text-white/50 text-xs mt-1">
                Member since {profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <h3 className="text-lg font-semibold text-primary mb-6">Personal Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">First Name</Label>
              <Input
                value={form.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">Last Name</Label>
              <Input
                value={form.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">Email</Label>
              <Input
                value={profile?.email || ""}
                disabled
                className="bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">Phone</Label>
              <Input
                value={form.phone_number}
                onChange={(e) => handleChange("phone_number", e.target.value)}
                placeholder="+977-XXXXXXXXXX"
                className="bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">Designation</Label>
              <Input
                value={form.designation}
                onChange={(e) => handleChange("designation", e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-semibold text-slate-700">Specialization</Label>
              <Input
                value={form.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                className="bg-slate-50/50 border-slate-200 focus:border-[#D4A72C] focus:ring-[#D4A72C]/20"
              />
            </div>
          </div>

          <div className="flex justify-end mt-8 pt-6 border-t border-slate-100">
            {dirty && (
              <span className="text-[12px] text-amber-600 flex items-center mr-4">
                You have unsaved changes
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || !dirty}
              className="bg-[#0B2545] hover:bg-[#163E6B] text-white px-6"
            >
              {updateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
