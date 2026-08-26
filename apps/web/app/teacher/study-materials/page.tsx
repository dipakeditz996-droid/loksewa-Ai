"use client";

import { useState, useEffect } from "react";
import { getTeacherMaterials, StudyMaterial } from "@/lib/api/teacher-materials";
import { PageHeader, StatCard, StatusPill } from "@/components/teacher/portal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  Search,
  PlusCircle,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";

export default function TeacherStudyMaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await getTeacherMaterials({ search });
      // Depending on pagination, data could be an array or an object with results
      setMaterials(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error("Failed to load study materials:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMaterials();
  };

  const getKPIs = () => {
    return {
      total: materials.length,
      published: materials.filter((m) => m.status === "published").length,
      pending: materials.filter((m) => m.status === "pending_review").length,
      drafts: materials.filter((m) => m.status === "draft").length,
    };
  };
  const kpis = getKPIs();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <PageHeader
        title="Study Materials"
        description="View and manage the study materials you have authored."
        action={
          <Button
            disabled
            className="gap-2 rounded-[9px] bg-[#0B2545] opacity-60 shadow-sm cursor-not-allowed"
            title="Study material submission isn't available yet"
          >
            <PlusCircle className="h-4 w-4" />
            Upload Material (Coming Soon)
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Bookmark} label="Total Materials" value={loading ? "-" : kpis.total} />
        <StatCard icon={CheckCircle2} label="Published" value={loading ? "-" : kpis.published} tone="success" />
        <StatCard icon={Clock} label="Pending Review" value={loading ? "-" : kpis.pending} tone="pending" />
        <StatCard icon={AlertCircle} label="Drafts" value={loading ? "-" : kpis.drafts} />
      </div>

      {/* Toolbar */}
      <div className="overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex flex-col gap-4 border-b border-[#EEF1F6] bg-[#F7F9FC] p-4 sm:flex-row">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98AE]" />
            <Input
              placeholder="Search materials by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border-[#D9E1EA] bg-white pl-9"
            />
          </form>
        </div>
      </div>

      {/* Material List */}
      {loading ? (
        <div className="py-12 text-center text-[#667085]">Loading materials...</div>
      ) : materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9E1EA] bg-white p-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF2F8]">
            <FileText className="h-10 w-10 text-[#0B2545]" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-[#101828]">No study materials found.</h3>
          <p className="mx-auto mb-6 max-w-md text-[13px] text-[#667085]">
            You have not uploaded any study materials yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {materials.map((material) => (
            <div key={material.id} className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-md">
              <div className="mb-3.5 flex items-center justify-between">
                <StatusPill status={material.status} />
              </div>
              <h3 className="text-[15px] font-bold text-[#101828]">{material.title}</h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#8A98AE]">
                <span className="rounded bg-[#EEF1F6] px-1.5 py-0.5 font-medium text-[#667085]">{material.material_type}</span>
                {material.subject_name && <span>{material.subject_name}</span>}
              </div>
              <p className="mt-2.5 line-clamp-2 text-[12px] text-[#667085]">
                {material.description || "No description provided."}
              </p>
              
              <div className="mt-4 flex items-center justify-between border-t border-[#F2F4F8] pt-3.5 text-[11.5px] text-[#8A98AE]">
                <span>{material.estimated_reading_time} min read</span>
                <span>{new Date(material.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
