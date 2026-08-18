import { Users, BookOpen, GraduationCap, DollarSign, Activity, MoreHorizontal, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">System Overview</h1>
          <p className="text-muted-foreground mt-1">Platform-wide metrics and administrative controls.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-border">Generate Report</Button>
          <Button className="bg-primary text-primary-foreground">Platform Settings</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric Cards */}
        <div className="border border-border bg-card p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Users className="h-4 w-4" /> Total Users
          </div>
          <div className="text-2xl font-bold text-foreground">12,450</div>
          <div className="text-xs text-green-600 mt-1">+12% this month</div>
        </div>
        
        <div className="border border-border bg-card p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" /> Active Students
          </div>
          <div className="text-2xl font-bold text-foreground">8,230</div>
          <div className="text-xs text-green-600 mt-1">+5% this month</div>
        </div>
        
        <div className="border border-border bg-card p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Course Enrollments
          </div>
          <div className="text-2xl font-bold text-foreground">24,512</div>
          <div className="text-xs text-muted-foreground mt-1">Avg 2.9 per student</div>
        </div>

        <div className="border border-border bg-card p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Monthly Revenue
          </div>
          <div className="text-2xl font-bold text-foreground">Rs. 8.4M</div>
          <div className="text-xs text-green-600 mt-1">+18% this month</div>
        </div>
        
        <div className="border border-border bg-card p-4 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1 flex items-center gap-2">
            <Activity className="h-4 w-4" /> System Health
          </div>
          <div className="text-2xl font-bold text-foreground">99.9%</div>
          <div className="text-xs text-green-600 mt-1">All systems operational</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Registrations Table (High Density) */}
        <section className="lg:col-span-2 border border-border bg-card rounded-lg overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Recent Registrations</h2>
            <Button variant="ghost" size="sm" className="h-8"><Filter className="h-4 w-4 mr-2" /> Filter</Button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/30 border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">Hari Bahadur</td>
                  <td className="px-6 py-3 text-muted-foreground">hari.b@example.com</td>
                  <td className="px-6 py-3">Student</td>
                  <td className="px-6 py-3 text-muted-foreground">Just now</td>
                  <td className="px-6 py-3"><Badge variant="outline" className="border-green-500/30 text-green-600 text-[10px] px-2 py-0">Active</Badge></td>
                  <td className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">Sunita Sharma</td>
                  <td className="px-6 py-3 text-muted-foreground">sunita.s@example.com</td>
                  <td className="px-6 py-3">Teacher</td>
                  <td className="px-6 py-3 text-muted-foreground">2 hours ago</td>
                  <td className="px-6 py-3"><Badge variant="outline" className="border-green-500/30 text-green-600 text-[10px] px-2 py-0">Active</Badge></td>
                  <td className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">Binod Thapa</td>
                  <td className="px-6 py-3 text-muted-foreground">binod.t@example.com</td>
                  <td className="px-6 py-3">Student</td>
                  <td className="px-6 py-3 text-muted-foreground">5 hours ago</td>
                  <td className="px-6 py-3"><Badge variant="outline" className="border-amber-500/30 text-amber-600 text-[10px] px-2 py-0">Unverified</Badge></td>
                  <td className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">Anita Magar</td>
                  <td className="px-6 py-3 text-muted-foreground">anita.m@example.com</td>
                  <td className="px-6 py-3">Student</td>
                  <td className="px-6 py-3 text-muted-foreground">1 day ago</td>
                  <td className="px-6 py-3"><Badge variant="outline" className="border-green-500/30 text-green-600 text-[10px] px-2 py-0">Active</Badge></td>
                  <td className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
                <tr className="hover:bg-muted/10 transition-colors">
                  <td className="px-6 py-3 font-medium text-foreground">Rajan KC</td>
                  <td className="px-6 py-3 text-muted-foreground">rajan.kc@example.com</td>
                  <td className="px-6 py-3">Student</td>
                  <td className="px-6 py-3 text-muted-foreground">1 day ago</td>
                  <td className="px-6 py-3"><Badge variant="outline" className="border-red-500/30 text-red-600 text-[10px] px-2 py-0">Suspended</Badge></td>
                  <td className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="h-4 w-4" /></Button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-border bg-muted/5 text-center">
            <Button variant="ghost" size="sm" className="w-full text-xs">View All Users</Button>
          </div>
        </section>

        {/* Platform Alerts */}
        <section className="space-y-6">
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Alerts</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="p-4 flex gap-3 hover:bg-muted/10 transition-colors">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                <div>
                  <div className="text-sm font-medium text-foreground">High Database Load</div>
                  <div className="text-xs text-muted-foreground mt-1">CPU utilization peaked at 85% during mock exam window.</div>
                  <div className="text-[10px] text-muted-foreground mt-2">10 mins ago</div>
                </div>
              </div>
              <div className="p-4 flex gap-3 hover:bg-muted/10 transition-colors">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                <div>
                  <div className="text-sm font-medium text-foreground">Scheduled Maintenance</div>
                  <div className="text-xs text-muted-foreground mt-1">System update scheduled for tomorrow at 2:00 AM.</div>
                  <div className="text-[10px] text-muted-foreground mt-2">2 hours ago</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border border-border bg-card rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-muted/20">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm">Manage Courses</Button>
              <Button variant="outline" className="w-full justify-start text-sm">Review Flagged Questions</Button>
              <Button variant="outline" className="w-full justify-start text-sm">Broadcast Message</Button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
