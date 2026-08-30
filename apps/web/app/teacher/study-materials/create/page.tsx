'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, File as FileIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createTeacherMaterial } from '@/lib/api/teacher-materials';
import { apiClient } from '@/lib/api/client';

export default function CreateStudyMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    material_type: 'notes',
    difficulty: 'beginner',
    exam: '',
    subject: '',
    topic: '',
    external_url: '',
    content: '',
    estimated_reading_time: 10
  });

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    // Fetch exams
    apiClient<any>('/admin/syllabus/exams/').then(res => {
      setExams(res || []);
    }).catch(err => {
      // fallback if teacher doesn't have admin syllabus permission
      apiClient<any>('/exams/').then(res => setExams(res.results || res)).catch(() => setExams([]));
    });
  }, []);

  useEffect(() => {
    if (formData.exam) {
      // Depending on actual API structure, fetch subjects for exam
      apiClient<any>(`/subjects/?exam=${formData.exam}`).then(res => {
        setSubjects(res.results || res);
      }).catch(() => setSubjects([]));
    }
  }, [formData.exam]);

  useEffect(() => {
    if (formData.subject) {
      apiClient<any>(`/topics/?subject=${formData.subject}`).then(res => {
        setTopics(res.results || res);
      }).catch(() => setTopics([]));
    }
  }, [formData.subject]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleSubmit = async (submitType: 'draft' | 'submit') => {
    if (!formData.title || !formData.exam || !formData.subject || !formData.material_type) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      const submitData = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key as keyof typeof formData]) {
          submitData.append(key, formData[key as keyof typeof formData].toString());
        }
      });

      if (file) {
        submitData.append('file', file);
      }

      const res = await createTeacherMaterial(submitData);

      if (submitType === 'submit') {
        // Needs a separate endpoint call to submit for review, since creation is draft by default
        await apiClient(`/notes/teacher/materials/${res.id}/submit/`, { method: 'POST' });
        toast.success('Material created and submitted for review!');
      } else {
        toast.success('Draft saved successfully!');
      }

      router.push('/teacher/study-materials');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.detail || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const needsFileUpload = ['pdf', 'document', 'presentation'].includes(formData.material_type);
  const needsUrl = ['video', 'external_link'].includes(formData.material_type);

  const selectClass = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20";
  const labelClass = "mb-1 block text-sm font-medium text-foreground";

  return (
    <div className="mx-auto max-w-4xl p-4 pb-12 md:p-8">
      <Link href="/teacher/study-materials" className="mb-6 flex items-center text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Study Materials
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="border-b border-border p-6">
          <h1 className="font-heading text-2xl font-extrabold text-primary">Create Study Material</h1>
          <p className="mt-1 text-muted-foreground">Add a new educational resource for your students.</p>
        </div>

        <div className="space-y-8 p-6">
          {/* Basic Info */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">1. Basic Information</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="col-span-2">
                <label className={labelClass}>Material Title *</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="rounded-lg border-border"
                  placeholder="e.g. Constitutional Development Chapter 1 Notes"
                />
              </div>

              <div className="col-span-2">
                <label className={labelClass}>Short Description</label>
                <Textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="rounded-lg border-border"
                  placeholder="Provide a brief overview of this material..."
                  rows={3}
                />
              </div>

              <div>
                <label className={labelClass}>Material Type *</label>
                <select
                  name="material_type"
                  value={formData.material_type}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="notes">Notes</option>
                  <option value="pdf">PDF</option>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="presentation">Presentation</option>
                  <option value="external_link">External Link</option>
                  <option value="study_guide">Study Guide</option>
                  <option value="reference">Reference Material</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Difficulty</label>
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </section>

          {/* Placement */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">2. Placement & Organization</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className={labelClass}>Course / Exam *</label>
                <select
                  name="exam"
                  value={formData.exam}
                  onChange={handleChange}
                  className={selectClass}
                >
                  <option value="">Select Course</option>
                  {exams.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>{ex.title || ex.name || ex.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Subject *</label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className={selectClass}
                  disabled={!formData.exam}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>{sub.title || sub.name || sub.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Topic (Optional)</label>
                <select
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className={selectClass}
                  disabled={!formData.subject}
                >
                  <option value="">Select Topic</option>
                  {topics.map((top: any) => (
                    <option key={top.id} value={top.id}>{top.title || top.name || top.id}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Content */}
          <section>
            <h2 className="mb-4 text-lg font-semibold text-foreground">3. Resource Content</h2>

            {needsFileUpload && (
              <div className="relative rounded-xl border-2 border-dashed border-border bg-muted p-8 text-center transition-colors hover:bg-primary/10">
                {file ? (
                  <div className="flex flex-col items-center justify-center">
                    <FileIcon className="mb-2 h-12 w-12 text-primary" />
                    <span className="font-medium text-foreground">{file.name}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button
                      onClick={() => setFile(null)}
                      className="mt-4 flex items-center rounded-md bg-destructive/10 px-3 py-1 text-sm text-destructive transition-colors hover:bg-[#f5d3d3]"
                    >
                      <X className="mr-1 h-4 w-4" /> Remove File
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                    <p className="mb-1 font-medium text-foreground">Drag & drop your file here</p>
                    <p className="mb-4 text-sm text-muted-foreground">or click to browse from your computer</p>
                    <Input
                      type="file"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={handleFileChange}
                      accept={formData.material_type === 'pdf' ? '.pdf' : '*/*'}
                    />
                    <Button variant="outline" className="rounded-[9px] border-border">Browse Files</Button>
                  </>
                )}
              </div>
            )}

            {needsUrl && (
              <div className="rounded-xl border border-border bg-muted p-6">
                <label className={labelClass}>
                  {formData.material_type === 'video' ? 'YouTube / Video URL' : 'External Resource URL'} *
                </label>
                <Input
                  name="external_url"
                  type="url"
                  value={formData.external_url}
                  onChange={handleChange}
                  placeholder="https://"
                  className="mb-2 rounded-lg border-border bg-card"
                />
                {formData.external_url && formData.external_url.includes('youtube.com') && (
                  <div className="mt-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-black text-white">
                    Video Preview Available
                  </div>
                )}
              </div>
            )}

            {!needsFileUpload && !needsUrl && (
              <div>
                <label className={labelClass}>Notes Content</label>
                <Textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  className="rounded-lg border-border"
                  placeholder="Write your notes here..."
                  rows={8}
                />
              </div>
            )}
          </section>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted p-6">
          <p className="text-sm text-muted-foreground">Drafts are not visible to students.</p>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-[9px] border-border" onClick={() => handleSubmit('draft')} disabled={loading}>
              Save Draft
            </Button>
            <Button className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white" onClick={() => handleSubmit('submit')} disabled={loading}>
              {loading ? 'Saving...' : 'Submit for Review'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
