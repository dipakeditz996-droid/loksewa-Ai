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
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

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
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
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
        notesData
      ] = await Promise.all([
        teacherStudentsApi.getStudentDetail(studentId),
        teacherStudentsApi.getStudentCourses(studentId),
        teacherStudentsApi.getStudentAnalytics(studentId),
        teacherStudentsApi.getStudentPerformance(studentId),
        teacherStudentsApi.getStudentActivity(studentId),
        teacherStudentsApi.getStudentNotes(studentId)
      ]);

      setProfile(profileData);
      setCourses(coursesData);
      setAnalytics(analyticsData);
      setPerformance(performanceData);
      setActivity(activityData);
      setNotes(notesData);
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
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500">Loading student profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Profile</h1>
        </div>
      </div>

      {/* Top Section: Profile & Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-slate-200 dark:border-slate-700">
            {profile.avatar ? (
              <img src={profile.avatar} alt={profile.first_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-slate-400" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {profile.first_name} {profile.last_name}
            </h2>
            <p className="text-slate-500 mb-2">{profile.email}</p>
            <div className="flex gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Joined {new Date(profile.joined_date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {Math.round(profile.total_study_time / 60)} hrs total study
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setIsNoteModalOpen(true)}>
            <FileText className="w-4 h-4" /> Add Note
          </Button>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsMessageModalOpen(true)}>
            <MessageSquare className="w-4 h-4" /> Send Message
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-slate-500 text-sm font-medium mb-1">Enrolled Courses</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {profile.enrolled_courses_count} <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-slate-500 text-sm font-medium mb-1">Average Score</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {profile.average_score.toFixed(1)}% <Target className="w-5 h-5 text-amber-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-slate-500 text-sm font-medium mb-1">Best Score</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {profile.best_score.toFixed(1)}% <Award className="w-5 h-5 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <div className="text-slate-500 text-sm font-medium mb-1">Practice Accuracy</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {profile.practice_accuracy.toFixed(1)}% <Brain className="w-5 h-5 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) */}
        <div className="col-span-1 lg:col-span-2 space-y-6">
          
          {/* Exam Performance Chart */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Exam Performance Over Time</h3>
            {analytics?.exam_timeline && analytics.exam_timeline.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.exam_timeline}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                No exam history available yet
              </div>
            )}
          </div>

          {/* Enrolled Courses */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Course Progress</h3>
            <div className="space-y-4">
              {courses.length > 0 ? courses.map((course: any) => (
                <div key={course.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">{course.name}</h4>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="w-32">
                    <div className="flex justify-between text-xs mb-1 font-medium">
                      <span className="text-slate-700 dark:text-slate-300">Progress</span>
                      <span className="text-blue-600 dark:text-blue-400">{course.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full" 
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-slate-500">No courses assigned from you.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) */}
        <div className="col-span-1 space-y-6">
          
          {/* Topic Performance */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Topic Performance</h3>
            
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Strongest Topics
              </h4>
              <div className="space-y-3">
                {performance?.strong_topics?.length > 0 ? performance.strong_topics.map((topic: any) => (
                  <div key={topic.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{topic.name}</span>
                    <span className="text-sm font-medium text-emerald-600">{topic.accuracy.toFixed(0)}%</span>
                  </div>
                )) : <span className="text-sm text-slate-500">Not enough data</span>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 transform rotate-180" /> Weakest Topics
              </h4>
              <div className="space-y-3">
                {performance?.weak_topics?.length > 0 ? performance.weak_topics.map((topic: any) => (
                  <div key={topic.id} className="flex items-center justify-between">
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate pr-2">{topic.name}</span>
                    <span className="text-sm font-medium text-rose-600">{topic.accuracy.toFixed(0)}%</span>
                  </div>
                )) : <span className="text-sm text-slate-500">Not enough data</span>}
              </div>
            </div>
          </div>

          {/* Private Notes */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Teacher Notes</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsNoteModalOpen(true)}>
                <FileText className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              {notes.length > 0 ? notes.map((note: any) => (
                <div key={note.id} className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">{note.note_text}</p>
                  <p className="text-xs text-slate-500 flex justify-between">
                    <span>{note.teacher_name}</span>
                    <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
              )) : (
                <p className="text-sm text-slate-500 italic">No notes added yet.</p>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-slate-800 before:to-transparent">
              {activity.length > 0 ? activity.map((act: any, i: number) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    {act.type === 'exam' ? <Target className="w-4 h-4 text-blue-500" /> : <Brain className="w-4 h-4 text-purple-500" />}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-slate-900 dark:text-white text-sm">{act.title}</div>
                    </div>
                    <div className="text-xs text-slate-500 flex justify-between">
                      <span>{new Date(act.date).toLocaleDateString()}</span>
                      <span className={cn(
                        "font-medium",
                        act.score >= 80 ? "text-emerald-500" : act.score >= 50 ? "text-amber-500" : "text-slate-500"
                      )}>Score: {act.score}%</span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No recent activity.</p>
              )}
            </div>
          </div>
          
        </div>
      </div>

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add Private Note</h3>
            <p className="text-sm text-slate-500 mb-4">This note will only be visible to you and other authorized teachers.</p>
            <Textarea 
              placeholder="e.g. Needs more practice with Constitutional Law..."
              className="mb-4 min-h-[120px]"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsNoteModalOpen(false)}>Cancel</Button>
              <Button onClick={handleAddNote}>Save Note</Button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Send Message</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Subject</label>
                <Input 
                  placeholder="Message subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-1">Message</label>
                <Textarea 
                  placeholder="Write your message here..."
                  className="min-h-[120px]"
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsMessageModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700">Send</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
