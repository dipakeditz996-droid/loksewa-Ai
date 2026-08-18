"use client";

import { useState, useEffect } from "react";
import { teacherStudentsApi, TeacherStudentList } from "@/lib/api/teacher-students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Download, 
  Users, 
  Activity, 
  TrendingUp, 
  Award, 
  AlertTriangle,
  BookOpen,
  Filter,
  MoreVertical,
  ChevronRight,
  User
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudentList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setIsLoading(true);
      const data = await teacherStudentsApi.getStudents();
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
    
    if (statusFilter !== "all") {
      return matchesSearch && student.status.toLowerCase() === statusFilter.toLowerCase();
    }
    return matchesSearch;
  });

  // Calculate KPIs
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const avgScore = students.length ? students.reduce((acc, curr) => acc + curr.average_score, 0) / students.length : 0;
  const atRiskCount = students.filter(s => s.status === 'At Risk').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitor your students, track their progress, and understand their learning performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" /> Export Students
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Students" 
          value={totalStudents} 
          icon={<Users className="w-5 h-5 text-blue-600" />} 
          trend="+12% this month"
          trendUp={true}
        />
        <KPICard 
          title="Active Students" 
          value={activeStudents} 
          icon={<Activity className="w-5 h-5 text-emerald-600" />} 
          trend="Currently active"
        />
        <KPICard 
          title="Average Score" 
          value={`${avgScore.toFixed(1)}%`} 
          icon={<Award className="w-5 h-5 text-amber-600" />} 
          trend="+2.5% vs last month"
          trendUp={true}
        />
        <KPICard 
          title="At Risk" 
          value={atRiskCount} 
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />} 
          trend="Needs attention"
          trendUp={false}
          alert
        />
      </div>

      {/* Main Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search students by name or email..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" className="gap-2" onClick={() => setStatusFilter('all')}>
              <Filter className="w-4 h-4" /> 
              {statusFilter === 'all' ? 'All Status' : statusFilter}
            </Button>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <EmptyState 
              hasSearch={searchQuery.length > 0} 
              onClearSearch={() => setSearchQuery("")} 
            />
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Courses</th>
                  <th className="px-6 py-4">Performance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                          {student.avatar ? (
                            <img src={student.avatar} alt={student.first_name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{student.enrolled_courses}</span>
                        <span className="text-slate-400 text-sm">enrolled</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-300">Avg: {student.average_score.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-32 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              student.average_score >= 80 ? "bg-emerald-500" :
                              student.average_score >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${student.average_score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-full",
                        student.status === 'Active' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" :
                        student.status === 'Inactive' ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" :
                        "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      )}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/teacher/students/${student.id}`}>
                        <Button variant="ghost" size="sm" className="group-hover:bg-slate-100 dark:group-hover:bg-slate-800">
                          View Profile <ChevronRight className="w-4 h-4 ml-1 opacity-50" />
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

function KPICard({ title, value, icon, trend, trendUp, alert = false }: any) {
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-sm flex flex-col relative overflow-hidden",
      alert ? "border-rose-200 dark:border-rose-900/50" : "border-slate-200 dark:border-slate-800"
    )}>
      {alert && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-bl-full" />
      )}
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 inline-flex">
          {icon}
        </div>
      </div>
      <div>
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{value}</div>
        {trend && (
          <div className={cn(
            "text-xs font-medium flex items-center gap-1",
            trendUp === true ? "text-emerald-600 dark:text-emerald-400" :
            trendUp === false ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
          )}>
            {trendUp === true && <TrendingUp className="w-3 h-3" />}
            {trendUp === false && <TrendingUp className="w-3 h-3 transform rotate-180" />}
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasSearch, onClearSearch }: { hasSearch: boolean, onClearSearch: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
        <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {hasSearch ? "No students found" : "Your student workspace is ready"}
      </h3>
      <p className="text-slate-500 mb-6">
        {hasSearch 
          ? "We couldn't find any students matching your current filters. Try adjusting them."
          : "Students will appear here automatically once they are enrolled in the courses you are assigned to teach."
        }
      </p>
      {hasSearch && (
        <Button onClick={onClearSearch}>Clear Filters</Button>
      )}
    </div>
  );
}
