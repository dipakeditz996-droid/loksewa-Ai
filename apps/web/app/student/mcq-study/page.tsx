import Link from "next/link";
import { BookOpen, Target, Settings2, PlayCircle, Trophy, ListChecks } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function McqStudyPage() {
  const subjects = [
    { id: 1, name: "Nepal Constitution & Governance", total: 450, completed: 120, topics: 8 },
    { id: 2, name: "Geography of Nepal", total: 320, completed: 200, topics: 5 },
    { id: 3, name: "History & Culture", total: 500, completed: 50, topics: 12 },
    { id: 4, name: "Economic Development", total: 280, completed: 0, topics: 6 },
    { id: 5, name: "Current Affairs", total: 600, completed: 450, topics: 4 },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">MCQ Practice</h1>
          <p className="text-muted-foreground mt-1">Master topics with targeted multiple choice questions.</p>
        </div>
        <Link href="/student/mcq-study/session">
          <Button size="lg" className="gap-2">
            <PlayCircle className="h-5 w-5" /> Quick Mix Session
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Mastered</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">820 <span className="text-sm font-normal text-muted-foreground">/ 2,150</span></div>
            <Progress value={38} className="mt-3" />
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">76%</div>
            <p className="text-xs text-muted-foreground mt-1">+2% from last week</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Topics Completed</CardTitle>
            <ListChecks className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">14 <span className="text-sm font-normal text-muted-foreground">/ 35</span></div>
            <p className="text-xs text-muted-foreground mt-1">4 pending revision</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subject-wise" className="w-full">
        <div className="flex justify-between items-center mb-6">
          <TabsList>
            <TabsTrigger value="subject-wise">Subject Wise</TabsTrigger>
            <TabsTrigger value="topic-wise">Topic Wise</TabsTrigger>
            <TabsTrigger value="bookmarks">Bookmarked</TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
            <Settings2 className="h-4 w-4" /> Practice Settings
          </Button>
        </div>
        
        <TabsContent value="subject-wise" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subjects.map((subject) => {
              const percentage = Math.round((subject.completed / subject.total) * 100);
              
              return (
                <Card key={subject.id} className="border-border/60 flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <div className="bg-primary/10 p-2 rounded-lg">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <Badge variant="outline" className={percentage > 80 ? "bg-green-500/10 text-green-500 border-green-500/20" : ""}>
                        {percentage}% Mastery
                      </Badge>
                    </div>
                    <CardTitle className="text-lg line-clamp-1">{subject.name}</CardTitle>
                    <CardDescription>{subject.topics} Topics</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{subject.completed} / {subject.total} Qs</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                    <Link href="/student/mcq-study/session" className="w-full">
                      <Button className="w-full gap-2" variant={percentage === 0 ? "default" : "secondary"}>
                        {percentage === 0 ? "Start Practicing" : "Continue Practice"}
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        
        <TabsContent value="topic-wise">
          <Card className="border-border/60 p-12 flex flex-col items-center justify-center text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Topic-wise Practice</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Select specific topics within subjects to focus your preparation on weak areas.
            </p>
            <Button className="mt-6">Select Topics</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
