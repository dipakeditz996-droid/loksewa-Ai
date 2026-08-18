"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Trophy, Plus, Search, Filter,
  MoreVertical, Edit, Copy, Trash2,
  CheckCircle2, Clock, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { teacherPracticeSetsApi, PracticeSet } from "@/lib/api/teacher-practice-sets";
import { useAuth } from "@/contexts/AuthContext";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";

export default function PracticeSetsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sets, setSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSets = async () => {
    try {
      setLoading(true);
      const data = await teacherPracticeSetsApi.getPracticeSets({
        search: search
      });
      setSets(data);
    } catch (error) {
      toast.error("Failed to load practice sets");
    } finally {
      setLoading(false);
    }
  };

  const getKPIs = () => {
    return {
      total: sets.length,
      published: sets.filter(s => s.status === 'published').length,
      drafts: sets.filter(s => s.status === 'draft').length,
      pending: sets.filter(s => s.status === 'pending_review').length,
    }
  }
  const kpis = getKPIs();

  useEffect(() => {
    fetchSets();
  }, [search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSets();
  };

  const handleDuplicate = async (id: number) => {
    try {
      await teacherPracticeSetsApi.duplicatePracticeSet(id);
      toast.success("Practice set duplicated successfully");
      fetchSets();
    } catch (error) {
      toast.error("Failed to duplicate practice set");
    }
  };

  const handleArchive = async (id: number) => {
    if (!window.confirm("Are you sure you want to archive this practice set?")) return;
    try {
      await teacherPracticeSetsApi.deletePracticeSet(id);
      toast.success("Practice set archived successfully");
      fetchSets();
    } catch (error: any) {
      toast.error(error?.data?.detail || "Failed to archive practice set");
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'published': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case 'approved': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
      case 'draft': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'pending_review': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'changes_requested': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'archived': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Practice Sets
          </h1>
          <p className="text-muted-foreground mt-1">
            Build and manage question collections for student practice.
          </p>
        </div>
        <Button onClick={() => router.push("/teacher/practice-sets/new")} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 transition-all">
          <Plus className="mr-2 h-4 w-4" /> Create Practice Set
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sets", value: kpis.total, color: "text-blue-600" },
          { label: "Published", value: kpis.published, color: "text-emerald-600" },
          { label: "In Draft", value: kpis.drafts, color: "text-amber-600" },
          { label: "Pending Review", value: kpis.pending, color: "text-purple-600" },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex flex-col justify-center items-center text-center">
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>
                  {loading ? "-" : stat.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 bg-muted/20 border-b border-border/50 flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search practice sets by title or description..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background"
            />
          </form>
          <div className="flex gap-2">
            <Button variant="outline" className="shrink-0">
              <Filter className="mr-2 h-4 w-4" /> Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Practice Sets List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
            <Trophy className="h-8 w-8" />
          </div>
          <CardTitle className="mb-2">No practice sets yet</CardTitle>
          <CardDescription className="max-w-sm mb-6">
            Create a practice set by grouping questions from your Question Bank to share with your students.
          </CardDescription>
          <Button onClick={() => router.push("/teacher/practice-sets/new")} variant="default">
            Create Your First Practice Set
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sets.map((set) => (
            <Card key={set.id} className="flex flex-col overflow-hidden transition-all hover:shadow-md border-border/60 hover:border-blue-500/30 group">
              <CardContent className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary" className={`text-xs font-medium border-0 ${getStatusColor(set.status)}`}>
                    {set.status.toUpperCase()}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push(`/teacher/practice-sets/${set.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => set.id && handleDuplicate(set.id)}>
                        <Copy className="mr-2 h-4 w-4" /> Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => set.id && handleArchive(set.id)} className="text-red-600 dark:text-red-400">
                        <Trash2 className="mr-2 h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-lg font-semibold line-clamp-2 leading-tight mb-1">
                  {set.name}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {set.description || "No description provided."}
                </p>
                
                <div className="mt-auto pt-4 border-t border-border/50 flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center">
                       <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                       {set.total_questions} Questions
                    </span>
                    <span className="flex items-center">
                       <Clock className="mr-1.5 h-3.5 w-3.5" />
                       {set.time_limit} mins
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-md mt-1">
                    <span className="font-medium text-foreground">Type:</span> {set.set_type.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
