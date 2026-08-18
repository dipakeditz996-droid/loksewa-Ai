"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, Search, Filter, ShieldCheck, Clock, RefreshCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminPracticeSetsApi } from "@/lib/api/admin-practice-sets";
import { PracticeSet } from "@/lib/api/teacher-practice-sets";
import { toast } from "react-hot-toast";

export default function PracticeSetReviewQueuePage() {
  const router = useRouter();
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchSets = async () => {
    try {
      setLoading(true);
      const data = await adminPracticeSetsApi.getReviewQueue({ search });
      setSets(Array.isArray(data) ? data : (data as any).results || []);
    } catch (error) {
      toast.error("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, [search]);

  const filteredSets = sets.filter(s => {
    if (filterStatus === "all") return true;
    return s.status === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending_review': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'approved': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'changes_requested': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'published': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending_review': return <Clock className="h-3 w-3 mr-1" />;
      case 'approved': 
      case 'published': return <CheckCircle2 className="h-3 w-3 mr-1" />;
      case 'changes_requested': return <RefreshCcw className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-purple-600" />
            Practice Set Moderation
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve practice sets submitted by teachers.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/20 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by title..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {['all', 'pending_review', 'approved', 'changes_requested', 'rejected', 'published'].map(status => (
              <Button 
                key={status}
                variant={filterStatus === status ? "default" : "outline"} 
                className={filterStatus === status ? "bg-purple-600 hover:bg-purple-700" : ""}
                onClick={() => setFilterStatus(status)}
              >
                {status.replace('_', ' ').toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
              <ShieldCheck className="h-12 w-12 mb-4 opacity-20" />
              <p>No practice sets found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredSets.map((set) => (
                <div 
                  key={set.id} 
                  className="p-4 md:p-6 flex flex-col md:flex-row gap-4 items-start md:items-center hover:bg-muted/30 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/admin-dashboard/practice-sets/review/${set.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold truncate group-hover:text-purple-600 transition-colors">{set.name}</h3>
                      <Badge variant="outline" className={`${getStatusColor(set.status)}`}>
                        {getStatusIcon(set.status)}
                        {set.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{set.description || "No description provided."}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="font-medium px-2 py-1 bg-muted rounded-md border">
                        {set.total_questions} Qs | {set.time_limit} mins
                      </span>
                      <span>Type: <strong className="uppercase">{set.set_type.replace('_', ' ')}</strong></span>
                      {set.submitted_at && (
                        <span>Submitted: {new Date(set.submitted_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <Button className="shrink-0" variant="outline">Review</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
