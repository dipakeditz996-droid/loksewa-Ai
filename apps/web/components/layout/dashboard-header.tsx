"use client";

import { Menu, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  role?: "student" | "teacher" | "admin" | "super-admin";
}

export function DashboardHeader({ onMenuClick, role = "student" }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  
  if (!user) return null;

  const hour = new Date().getHours();
  let greeting = "Good Evening";
  let icon = "🌙";
  if (hour < 12) {
    greeting = "Good Morning";
    icon = "☀️";
  } else if (hour < 17) {
    greeting = "Good Afternoon";
    icon = "👋";
  } else if (hour < 20) {
    greeting = "Good Evening";
    icon = "🌙";
  } else {
    greeting = "Good Night";
    icon = "🌙";
  }

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 sm:px-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5 text-[#0B2545]" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
        <div className="hidden lg:flex flex-col">
          <span className="text-[16px] font-bold text-foreground flex items-center gap-1.5">
            {greeting}, {user.name.split(" ")[0]}! <span className="text-xl">{icon}</span>
          </span>
          <span className="text-[12px] font-medium text-muted-foreground">Welcome back! Keep up the excellent work.</span>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <div className="hidden md:flex relative w-64 lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search syllabus, notes..."
            className="w-full bg-muted/50 pl-9 focus-visible:ring-1 focus-visible:ring-primary rounded-full text-[13px] h-9"
          />
        </div>

        <ThemeToggle />

        <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:bg-accent rounded-full">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-background" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1">
              <Avatar className="h-9 w-9 border border-slate-200">
                <AvatarFallback className="bg-[#0B2545] text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]">Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-[13px]">Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-[13px] text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer"
              onClick={() => {
                logout();
                window.location.href = "/login";
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
