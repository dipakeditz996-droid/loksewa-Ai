"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutTemplate, Search, Plus, Filter, MoreHorizontal,
  Edit, Copy, Eye, Archive, Trash2, Calendar, AlertCircle, Play, Pause, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminStudyPlanApi, AdminStudyPlanTemplate } from "@/lib/api/admin-study-plan";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TemplateFormModal } from "./components/TemplateFormModal";
import { AssignModal } from "./components/AssignModal";

export default function StudyPlanTemplatesPage() {
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<AdminStudyPlanTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminStudyPlanTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setIsLoading(true);
      const data = await adminStudyPlanApi.getTemplates();
      setTemplates(data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load study plan templates");
    } finally {
      setIsLoading(false);
    }
  }

  const handleDuplicate = async (id: number) => {
    try {
      await adminStudyPlanApi.duplicateTemplate(id);
      toast.success("Template duplicated successfully");
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate template");
    }
  };

  const handleToggleActive = async (template: AdminStudyPlanTemplate) => {
    try {
      if (template.is_active) {
        await adminStudyPlanApi.deactivateTemplate(template.id);
        toast.success("Template deactivated");
      } else {
        await adminStudyPlanApi.activateTemplate(template.id);
        toast.success("Template activated");
      }
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminStudyPlanApi.deleteTemplate(id);
      toast.success("Template deleted");
      loadTemplates();
    } catch (err: any) {
      toast.error(err.message || "Deletion failed");
    }
  };

  const openEdit = (template: AdminStudyPlanTemplate) => {
    setSelectedTemplate(template);
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setSelectedTemplate(null);
    setIsFormOpen(true);
  };

  const openAssign = (template: AdminStudyPlanTemplate) => {
    if (!template.is_active) {
      toast.error("Template must be active to assign.");
      return;
    }
    setSelectedTemplate(template);
    setIsAssignOpen(true);
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    (t.description || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Plan Templates</h2>
          <p className="text-sm text-slate-500">Reusable study plan structures.</p>
        </div>
        <div className="w-full sm:w-auto">
          <Button onClick={openCreate} className="w-full sm:w-auto bg-[#D4A72C] text-[#0B2545] hover:bg-[#D4A72C]/90 font-semibold gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50/30 min-h-[400px]">
          {isLoading ? (
            <div className="col-span-full py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B2545]"></div>
            </div>
          ) : error ? (
            <div className="col-span-full py-12 text-center text-red-600 bg-red-50 rounded-xl border border-red-200">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <LayoutTemplate className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-700">No templates found</h3>
              <p className="text-slate-500 text-sm mt-1">
                {search ? "Try a different search." : "No templates have been configured."}
              </p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className={`bg-white border ${template.is_active ? 'border-slate-200' : 'border-dashed border-slate-300 opacity-80'} rounded-xl p-5 hover:shadow-md transition-all group flex flex-col h-full relative`}>
                
                <div className="absolute top-4 right-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(template)}>
                        <Edit className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(template.id)}>
                        <Copy className="w-4 h-4 mr-2" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                        {template.is_active ? <><Pause className="w-4 h-4 mr-2" /> Deactivate</> : <><Play className="w-4 h-4 mr-2" /> Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleDelete(template.id)} className="text-red-600 focus:text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex justify-between items-start mb-3">
                  <div className={`p-2 rounded-lg ${template.is_active ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    template.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  } mr-8`}>
                    {template.is_active ? 'Active' : 'Draft'}
                  </span>
                </div>
                
                <h3 className="font-bold text-[#0B2545] text-lg mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-1">{template.description}</p>
                
                <div className="space-y-2 text-sm text-slate-600 mb-6 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Course:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{template.course_details?.title || "All"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {template.duration_days} Days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tasks:</span>
                    <span className="font-medium text-slate-700">{template.tasks?.length || 0}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                    <span className="text-slate-400">Assigned:</span>
                    <span className="font-medium text-blue-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {template.assigned_count} Students
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-auto">
                  <Button 
                    onClick={() => openAssign(template)} 
                    disabled={!template.is_active}
                    className="w-full bg-[#0B2545] text-white hover:bg-[#0B2545]/90 disabled:opacity-50"
                  >
                    Assign to Students
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TemplateFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        template={selectedTemplate} 
        onSaveSuccess={loadTemplates} 
      />

      <AssignModal 
        isOpen={isAssignOpen} 
        onClose={() => setIsAssignOpen(false)} 
        template={selectedTemplate} 
        onAssignSuccess={loadTemplates} 
      />
    </div>
  );
}
