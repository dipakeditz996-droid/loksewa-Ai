"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Trophy,
  Users,
  Search,
  Filter,
  MoreVertical,
  Eye,
  User,
  Settings2,
  TrendingUp,
  Award,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { rankingService } from "@/lib/api/student-results";

export default function AdminRankingsPage() {
  const [rankings, setRankings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await rankingService.getAdminRankings();
        setRankings(data);
      } catch (error) {
        console.error("Failed to load rankings", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredRankings = rankings.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.examName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0B2545] border-t-[#D4A72C]"></div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2545]">Rankings & Leaderboards</h1>
          <p className="text-slate-500 mt-1">Manage exam results, student rankings and leaderboard rules.</p>
        </div>
        <Button className="bg-[#0B2545] text-white hover:bg-[#163E6B]">
          <Settings2 className="w-4 h-4 mr-2" /> Ranking Rules
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Leaderboards", value: 12, icon: Trophy, color: "text-[#D4A72C]", bg: "bg-[#D4A72C]/10" },
          { label: "Total Participants", value: 4850, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Highest Score", value: "98%", icon: TrendingUp, color: "text-green-500", bg: "bg-green-50" },
          { label: "Average Score", value: "64%", icon: Award, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0B2545] leading-none mb-1">{stat.value}</p>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Ranking Rules Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start sm:items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-700 rounded-full shrink-0">
          <Settings2 className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Current Ranking Rules (Applied Server-Side)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-1 text-xs text-blue-700">
            <span><strong className="font-bold">Primary:</strong> Total Score</span>
            <span><strong className="font-bold">Tie-Breaker 1:</strong> Percentage</span>
            <span><strong className="font-bold">Tie-Breaker 2:</strong> Least Time Taken</span>
            <span><strong className="font-bold">Tie-Breaker 3:</strong> Earlier Submission Time</span>
          </div>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex-1 w-full flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student or exam..."
                className="pl-9 h-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="w-full sm:w-auto gap-2">
              <Filter className="w-4 h-4" /> Filters
            </Button>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Select defaultValue="all_exams">
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="Exam" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_exams">All Exams</SelectItem>
                <SelectItem value="exam1">Loksewa Mock Test #12</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="published">
              <SelectTrigger className="w-[140px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Exam</th>
                <th className="px-6 py-4 text-center">Score</th>
                <th className="px-6 py-4 text-center">Time</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    No ranking data found.
                  </td>
                </tr>
              ) : (
                filteredRankings.map((row) => (
                  <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#0B2545]">
                      #{row.rank}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border border-slate-200">
                          <AvatarImage src={row.photo} className="object-cover" />
                          <AvatarFallback className="bg-[#0B2545] text-white text-[10px]">
                            {row.studentName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[#0B2545]">{row.studentName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {row.examName}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-bold text-[#0B2545]">{row.score}</div>
                      <div className="text-[11px] text-slate-500">{row.percentage}%</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {formatTime(row.timeTaken)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {format(new Date(row.submissionTime), "MMM d, HH:mm")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3" /> {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2 text-slate-500" /> View Result
                          </DropdownMenuItem>
                          <DropdownMenuItem className="cursor-pointer">
                            <User className="w-4 h-4 mr-2 text-slate-500" /> View Student
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
          <div>Showing 1 to {filteredRankings.length} of {filteredRankings.length} entries</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
