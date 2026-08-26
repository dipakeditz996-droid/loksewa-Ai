"use client";

import { useState, useEffect } from "react";
import { teacherStudentsApi, TeacherStudentList } from "@/lib/api/teacher-students";
import { teacherCourseService, Course } from "@/lib/api/teacher-courses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Download,
  Users,
  Activity,
  Award,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  User
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader, StatCard } from "@/components/teacher/portal";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudentList[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [perfFilter, setPerfFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [sortFilter, setSortFilter] = useState("name");

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    loadStudents();
  }, [statusFilter, courseFilter, perfFilter, activityFilter, sortFilter]);

  const loadCourses = async () => {
    try {
      const data = await teacherCourseService.getMyCourses();
      setCourses(data);
    } catch (error) {
      console.error("Failed to load courses", error);
    }
  };

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const data = await teacherStudentsApi.getStudents({
        status: statusFilter,
        course: courseFilter === 'all' ? '' : courseFilter,
        performance: perfFilter,
        activity: activityFilter,
        sort: sortFilter
      });
      setStudents(data);
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    window.open(teacherStudentsApi.exportStudentsUrl(), "_blank");
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Calculate KPIs
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const avgScore = students.length ? students.reduce((acc, curr) => acc + curr.average_score, 0) / students.length : 0;
  const atRiskCount = students.filter(s => s.status === 'At Risk').length;

  const selectClass = "h-9 rounded-lg border border-[#D9E1EA] bg-white px-3 text-[12.5px] font-medium text-[#344054] focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20";

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <PageHeader
        title="Students"
        description="Monitor your students, track their progress, and understand their learning performance."
        action={
          <Button variant="outline" onClick={handleExport} className="gap-2 rounded-[9px] border-[#D9E1EA] text-[#344054]">
            <Download className="h-4 w-4" /> Export Students
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={totalStudents} />
        <StatCard icon={Activity} label="Active Students" value={activeStudents} tone="success" />
        <StatCard icon={Award} label="Average Score" value={`${avgScore.toFixed(1)}%`} />
        <StatCard icon={AlertTriangle} label="At Risk" value={atRiskCount} tone={atRiskCount > 0 ? "error" : "neutral"} />
      </div>

      {/* Main Workspace */}
      <div className="overflow-hidden rounded-2xl border border-[#E7EBF3] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">

        {/* Toolbar */}
        <div className="flex flex-col gap-4 border-b border-[#EEF1F6] bg-[#F7F9FC] p-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A98AE]" />
            <Input
              placeholder="Search students by name or email..."
              className="rounded-lg border-[#D9E1EA] pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex w-full flex-wrap items-center gap-2">
            <select className={selectClass} value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="all">All Courses</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <select className={selectClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="At Risk">At Risk</option>
            </select>
            <select className={selectClass} value={perfFilter} onChange={(e) => setPerfFilter(e.target.value)}>
              <option value="all">All Performance</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Average">Average</option>
              <option value="Needs Attention">Needs Attention</option>
            </select>
            <select className={selectClass} value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}>
              <option value="all">All Activity</option>
              <option value="Active recently">Active recently</option>
              <option value="Low activity">Low activity</option>
              <option value="No activity">No activity</option>
            </select>
            <select className={cn(selectClass, "ml-auto")} value={sortFilter} onChange={(e) => setSortFilter(e.target.value)}>
              <option value="name">Sort by Name</option>
              <option value="recent">Recent Activity</option>
              <option value="highest_perf">Highest Score</option>
              <option value="lowest_perf">Lowest Score</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 text-[#667085]">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-transparent"></div>
              <p className="text-[13px]">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              hasSearch={searchQuery.length > 0}
              onClearSearch={() => setSearchQuery("")}
            />
          ) : (
            <table className="w-full min-w-[840px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Student</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Courses</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Performance</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Status & Activity</th>
                  <th className="border-b border-[#EEF1F6] px-5 py-3 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-[#8A98AE]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="group hover:bg-[#F7F9FC]">
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#E7EBF3] bg-[#EEF2F8]">
                          {student.avatar ? (
                            <img src={student.avatar} alt={student.first_name} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-[#0B2545]/50" />
                          )}
                        </div>
                        <div>
                          <div className="text-[13px] font-bold text-[#101828]">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-[12px] text-[#667085]">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <div className="flex items-center gap-2 text-[13px]">
                        <BookOpen className="h-4 w-4 text-[#8A98AE]" />
                        <span className="font-semibold text-[#344054]">{student.enrolled_courses}</span>
                        <span className="text-[#8A98AE]">enrolled</span>
                      </div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[13px] font-semibold text-[#344054]">Avg: {student.average_score.toFixed(1)}%</div>
                        <div className="flex justify-between gap-3 text-[11px] text-[#8A98AE]">
                          <span>Practice: {student.practice_accuracy?.toFixed(1) || 0}%</span>
                          <span>Mock: {student.mock_exam_performance?.toFixed(1) || 0}%</span>
                        </div>
                        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-[#EEF1F6]">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              student.average_score >= 80 ? "bg-[#159A82]" :
                              student.average_score >= 50 ? "bg-[#D4A72C]" : "bg-[#DC5A5A]"
                            )}
                            style={{ width: `${student.average_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        <span className={cn(
                          "w-fit rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase",
                          student.status === 'Active' ? "bg-[#E9F6F2] text-[#0F7A69]" :
                          student.status === 'Inactive' ? "bg-[#EEF1F6] text-[#667085]" :
                          "bg-[#FBEAEA] text-[#B23A3A]"
                        )}>
                          {student.status}
                        </span>
                        <span className="text-[11px] text-[#8A98AE]">
                          {student.last_active ? `Active: ${new Date(student.last_active).toLocaleDateString()}` : 'No activity'}
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-[#F2F4F8] px-5 py-4 text-right">
                      <Link href={`/teacher/students/${student.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#0B2545] group-hover:bg-[#EEF2F8]">
                          View Profile <ChevronRight className="ml-1 h-4 w-4 opacity-50" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch, onClearSearch }: { hasSearch: boolean, onClearSearch: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center p-12 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF2F8]">
        <Users className="h-10 w-10 text-[#0B2545]" />
      </div>
      <h3 className="mb-2 text-lg font-bold text-[#101828]">
        {hasSearch ? "No students found" : "Your student workspace is ready"}
      </h3>
      <p className="mb-6 text-[13px] text-[#667085]">
        {hasSearch
          ? "We couldn't find any students matching your current filters. Try adjusting them."
          : "Students will appear here automatically once they are enrolled in the courses you are assigned to teach."
        }
      </p>
      {hasSearch && (
        <Button onClick={onClearSearch} className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C]">Clear Filters</Button>
      )}
    </div>
  );
}
