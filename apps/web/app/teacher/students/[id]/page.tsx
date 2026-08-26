"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { teacherStudentsApi } from "@/lib/api/teacher-students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  BookOpen,
  Award,
  Target,
  User,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Brain,
  FileText,
  Pencil,
  Trash2,
  AlertTriangle,
  Activity
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { StatCard } from "@/components/teacher/portal";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    try {
      setIsLoading(true);
      const [
        profileData,
        coursesData,
        analyticsData,
        performanceData,
        activityData,
        notesData,
        attemptsData
      ] = await Promise.all([
        teacherStudentsApi.getStudentDetail(studentId),
        teacherStudentsApi.getStudentCourses(studentId),
        teacherStudentsApi.getStudentAnalytics(studentId),
        teacherStudentsApi.getStudentPerformance(studentId),
        teacherStudentsApi.getStudentActivity(studentId),
        teacherStudentsApi.getStudentNotes(studentId),
        teacherStudentsApi.getStudentAttempts(studentId)
      ]);

      setProfile(profileData);
      setCourses(coursesData);
      setAnalytics(analyticsData);
      setPerformance(performanceData);
      setActivity(activityData);
      setNotes(notesData);
      setAttempts(attemptsData);
    } catch (error) {
      toast.error("Failed to load student profile");
      router.push("/teacher/students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await teacherStudentsApi.addStudentNote(studentId, newNote);
      toast.success("Note added successfully");
      setNewNote("");
      setIsNoteModalOpen(false);
      // Reload notes
      const notesData = await teacherStudentsApi.getStudentNotes(studentId);
      setNotes(notesData);
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Are you sure you want to delete this note?")) return;
    try {
      await teacherStudentsApi.deleteStudentNote(studentId, noteId);
      toast.success("Note deleted successfully");
      const notesData = await teacherStudentsApi.getStudentNotes(studentId);
      setNotes(notesData);
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleUpdateNote = async () => {
    if (!editingNoteId || !editingNoteText.trim()) return;
    try {
      await teacherStudentsApi.updateStudentNote(studentId, editingNoteId, editingNoteText);
      toast.success("Note updated successfully");
      setEditingNoteId(null);
      const notesData = await teacherStudentsApi.getStudentNotes(studentId);
      setNotes(notesData);
    } catch (error) {
      toast.error("Failed to update note");
    }
  };

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) return;
    try {
      await teacherStudentsApi.sendMessage(studentId, messageSubject, messageBody);
      toast.success("Message sent successfully");
      setMessageSubject("");
      setMessageBody("");
      setIsMessageModalOpen(false);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-transparent"></div>
        <p className="text-[#667085]">Loading student profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'history', label: 'Practice & Exam History' },
    { id: 'analytics', label: 'Detailed Analytics' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-20 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#101828]">Student Profile</h1>
        </div>
      </div>

      {/* Top Section: Profile & Actions */}
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)] md:flex-row md:items-center">
        <div className="flex items-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#E7EBF3] bg-[#EEF2F8]">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.first_name} className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-[#0B2545]/50" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-[#101828]">
                {profile.first_name} {profile.last_name}
              </h2>
              {profile.average_score > 0 && profile.average_score < 40 && (
                <span className="flex items-center gap-1 rounded-full bg-[#FBEAEA] px-2.5 py-1 text-xs font-bold uppercase text-[#B23A3A]">
                  <AlertTriangle className="h-3 w-3" /> Needs Attention
                </span>
              )}
            </div>
            <p className="mb-2 text-[#667085]">{profile.email}</p>
            <div className="flex gap-4 text-sm text-[#667085]">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Joined {new Date(profile.joined_date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {Math.round(profile.total_study_time / 60)} hrs total study
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2 rounded-[9px] border-[#D9E1EA] text-[#344054]" onClick={() => setIsNoteModalOpen(true)}>
            <FileText className="h-4 w-4" /> Add Note
          </Button>
          <Button className="gap-2 rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C]" onClick={() => setIsMessageModalOpen(true)}>
            <MessageSquare className="h-4 w-4" /> Send Message
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={BookOpen} label="Enrolled Courses" value={profile.enrolled_courses_count} />
        <StatCard icon={Target} label="Average Score" value={`${profile.average_score.toFixed(1)}%`} />
        <StatCard icon={Award} label="Best Score" value={`${profile.best_score.toFixed(1)}%`} tone="success" />
        <StatCard icon={Brain} label="Practice Accuracy" value={`${profile.practice_accuracy.toFixed(1)}%`} />
      </div>

      {/* Tabs */}
      <div className="mb-6 flex border-b border-[#E7EBF3]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-[#0B2545] text-[#0B2545]"
                : "border-transparent text-[#667085] hover:text-[#344054]"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && (
        <div className="overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h3 className="mb-6 text-lg font-bold text-[#101828]">Advanced Analytics</h3>
          <p className="text-[#667085]">Student performance analytics are being tracked. Advanced charts will appear here as more data is collected.</p>
        </div>
      )}

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left Column (2/3 width) */}
          <div className="col-span-1 space-y-6 lg:col-span-2">

            {/* Exam Performance Chart */}
            <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="mb-6 text-lg font-bold text-[#101828]">Exam Performance Over Time</h3>
              {analytics?.exam_timeline && analytics.exam_timeline.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics.exam_timeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF1F6" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#8A98AE', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A98AE', fontSize: 12 }} domain={[0, 100]} />
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #E7EBF3', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Line type="monotone" dataKey="score" stroke="#0B2545" strokeWidth={3} dot={{ r: 4, fill: '#D4A72C', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-[#D9E1EA] bg-[#F7F9FC] text-[#667085]">
                  No exam history available yet
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="mb-4 text-lg font-bold text-[#101828]">Course Progress</h3>
              <div className="space-y-4">
                {courses.length > 0 ? courses.map((course: any) => (
                  <div key={course.id} className="flex items-center justify-between rounded-lg border border-[#EEF1F6] p-4">
                    <div>
                      <h4 className="font-medium text-[#101828]">{course.name}</h4>
                      <p className="mt-1 flex items-center gap-1 text-sm text-[#667085]">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="w-32">
                      <div className="mb-1 flex justify-between text-xs font-medium">
                        <span className="text-[#344054]">Progress</span>
                        <span className="text-[#0B2545]">{course.progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#EEF1F6]">
                        <div
                          className="h-full rounded-full bg-[#D4A72C]"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-[#667085]">No courses assigned from you.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (1/3 width) */}
          <div className="col-span-1 space-y-6">

            {/* Topic Performance */}
            <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="mb-4 text-lg font-bold text-[#101828]">Topic Performance</h3>

              <div className="mb-6">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#0F7A69]">
                  <TrendingUp className="h-4 w-4" /> Strongest Topics
                </h4>
                <div className="space-y-3">
                  {performance?.strong_topics?.length > 0 ? performance.strong_topics.map((topic: any) => (
                    <div key={topic.id} className="flex items-center justify-between">
                      <span className="truncate pr-2 text-sm text-[#344054]">{topic.name}</span>
                      <span className="text-sm font-medium text-[#0F7A69]">{topic.accuracy.toFixed(0)}%</span>
                    </div>
                  )) : <span className="text-sm text-[#8A98AE]">Not enough data</span>}
                </div>
              </div>

              <div>
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#B23A3A]">
                  <TrendingUp className="h-4 w-4 rotate-180 transform" /> Weakest Topics
                </h4>
                <div className="space-y-3">
                  {performance?.weak_topics?.length > 0 ? performance.weak_topics.map((topic: any) => (
                    <div key={topic.id} className="flex items-center justify-between">
                      <span className="truncate pr-2 text-sm text-[#344054]">{topic.name}</span>
                      <span className="text-sm font-medium text-[#B23A3A]">{topic.accuracy.toFixed(0)}%</span>
                    </div>
                  )) : <span className="text-sm text-[#8A98AE]">Not enough data</span>}
                </div>
              </div>
            </div>

            {/* Private Notes */}
            <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#101828]">Teacher Notes</h3>
                <Button variant="ghost" size="sm" className="text-[#0B2545]" onClick={() => setIsNoteModalOpen(true)}>
                  <FileText className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <div className="max-h-60 space-y-4 overflow-y-auto pr-2">
                {notes.length > 0 ? notes.map((note: any) => (
                  <div key={note.id} className="group rounded-lg border border-[#F0DFAF] bg-[#FBF2DC] p-3">
                    {editingNoteId === note.id ? (
                      <div className="mb-2">
                        <Textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          className="mb-2 bg-white"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(null)}>Cancel</Button>
                          <Button size="sm" className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C]" onClick={handleUpdateNote}>Save</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="mb-2 flex items-start justify-between">
                          <p className="whitespace-pre-wrap text-sm text-[#5C4300]">{note.note_text}</p>
                          <div className="flex gap-1 rounded bg-white/60 p-1 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100">
                            <button onClick={() => { setEditingNoteId(note.id); setEditingNoteText(note.note_text); }} className="rounded p-1 text-[#0B2545] hover:bg-white"><Pencil className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDeleteNote(note.id)} className="rounded p-1 text-[#B23A3A] hover:bg-white"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                        <p className="flex justify-between text-xs text-[#8A6E1F]">
                          <span>{note.teacher_name}</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </p>
                      </>
                    )}
                  </div>
                )) : (
                  <p className="text-sm italic text-[#8A98AE]">No notes added yet.</p>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <h3 className="mb-4 text-lg font-bold text-[#101828]">Recent Activity</h3>
              <div className="space-y-4">
                {activity.length > 0 ? activity.map((act: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF2F8]">
                      {act.type === 'exam' ? <Target className="h-4 w-4 text-[#0B2545]" /> : <Brain className="h-4 w-4 text-[#946B00]" />}
                    </div>
                    <div className="min-w-0 flex-1 rounded-lg border border-[#EEF1F6] bg-white p-3 shadow-sm">
                      <div className="text-sm font-medium text-[#101828]">{act.title}</div>
                      <div className="mt-1 flex justify-between text-xs text-[#8A98AE]">
                        <span>{new Date(act.date).toLocaleDateString()}</span>
                        <span className={cn(
                          "font-semibold",
                          act.score >= 80 ? "text-[#0F7A69]" : act.score >= 50 ? "text-[#946B00]" : "text-[#B23A3A]"
                        )}>Score: {act.score}%</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-[#667085]">No recent activity.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-center justify-between border-b border-[#EEF1F6] p-6">
            <h3 className="text-lg font-bold text-[#101828]">All Attempts History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Date</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Type</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Title</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Status</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Score / Accuracy</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {attempts?.all_attempts?.map((attempt: any) => (
                  <tr key={attempt.id} className="hover:bg-[#F7F9FC]">
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-[13px] text-[#344054]">
                      <div>{new Date(attempt.started_at).toLocaleDateString()}</div>
                      <div className="text-xs text-[#8A98AE]">{new Date(attempt.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <span className={cn(
                        "rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase",
                        attempt.type === 'exam' ? "bg-[#EEF2F8] text-[#0B2545]" : "bg-[#FBF2DC] text-[#946B00]"
                      )}>
                        {attempt.type}
                      </span>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 font-medium text-[#101828]">
                      {attempt.title}
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <span className="text-sm capitalize text-[#667085]">{attempt.status}</span>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <span className={cn(
                        "font-semibold",
                        attempt.score >= 80 ? "text-[#0F7A69]" : attempt.score >= 50 ? "text-[#946B00]" : "text-[#B23A3A]"
                      )}>{attempt.score?.toFixed(1) || 0}%</span>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-sm text-[#667085]">
                      {attempt.time_taken ? `${Math.floor(attempt.time_taken / 60)}m ${attempt.time_taken % 60}s` : '-'}
                    </td>
                  </tr>
                ))}
                {!attempts?.all_attempts?.length && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#667085]">
                      <div className="mb-3 flex justify-center">
                        <Activity className="h-8 w-8 text-[#D9E1EA]" />
                      </div>
                      <p>No attempts recorded yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[#101828]">Add Private Note</h3>
            <p className="mb-4 text-sm text-[#667085]">This note will only be visible to you and other authorized teachers.</p>
            <Textarea
              placeholder="e.g. Needs more practice with Constitutional Law..."
              className="mb-4 min-h-[120px]"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" className="rounded-[9px] border-[#D9E1EA]" onClick={() => setIsNoteModalOpen(false)}>Cancel</Button>
              <Button className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C]" onClick={handleAddNote}>Save Note</Button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E7EBF3] bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-[#101828]">Send Message</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#344054]">Subject</label>
                <Input
                  placeholder="Message subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#344054]">Message</label>
                <Textarea
                  placeholder="Write your message here..."
                  className="min-h-[120px]"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" className="rounded-[9px] border-[#D9E1EA]" onClick={() => setIsMessageModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage} className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C]">Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
