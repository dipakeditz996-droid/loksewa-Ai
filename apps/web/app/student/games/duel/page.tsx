"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { gamesApi } from "@/lib/api/games";
import { Swords, UserPlus, Loader2 } from "lucide-react";

export default function DuelSetupPage() {
  const router = useRouter();
  
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleRandomMatch = async () => {
    setIsSearching(true);
    try {
      const match = await gamesApi.randomMatch();
      router.push(`/student/games/duel/${match.id}`);
    } catch (err) {
      alert("Failed to join matchmaking");
      setIsSearching(false);
    }
  };

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    try {
      const match = await gamesApi.createInvite();
      setInviteCode(match.invite_code || "");
    } catch (err) {
      alert("Failed to create invite");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleJoinInvite = async () => {
    if (!joinCode) return;
    setIsJoining(true);
    try {
      const match = await gamesApi.joinInvite(joinCode);
      router.push(`/student/games/duel/${match.id}`);
    } catch (err) {
      alert("Invalid or expired code");
      setIsJoining(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-72px)] bg-muted/50">
      <div>
        <h1 className="text-3xl font-bold text-primary dark:text-foreground">1 vs 1 MCQ Challenge</h1>
        <p className="text-muted-foreground mt-2">
          Compete against another student in a real-time MCQ battle.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Random Match */}
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary text-primary-foreground/10 rounded-full flex items-center justify-center mb-6">
            <Swords className="w-8 h-8 text-primary dark:text-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-2">Random Match</h2>
          <p className="text-muted-foreground mb-8 flex-1">
            Play against a random student who is also looking for a match right now.
          </p>
          <Button 
            className="w-full bg-primary text-primary-foreground hover:bg-primary text-primary-foreground/90 py-6"
            onClick={handleRandomMatch}
            disabled={isSearching}
          >
            {isSearching ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Finding opponent...</>
            ) : "Find Opponent"}
          </Button>
        </div>

        {/* Invite Friend */}
        <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-[#D4A72C]/10 rounded-full flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-[#D4A72C]" />
          </div>
          <h2 className="text-2xl font-bold text-primary dark:text-foreground mb-2">Invite Friend</h2>
          <p className="text-muted-foreground mb-6 flex-1">
            Create a private challenge room or join an existing one using an invite code.
          </p>
          
          <div className="w-full space-y-4">
            {!inviteCode ? (
              <Button 
                variant="outline" 
                className="w-full py-6"
                onClick={handleCreateInvite}
                disabled={isCreatingInvite}
              >
                Create Challenge
              </Button>
            ) : (
              <div className="bg-muted p-4 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-2">Share this code with your friend:</p>
                <div className="text-2xl font-bold text-primary dark:text-foreground tracking-widest">{inviteCode}</div>
                <p className="text-xs text-muted-foreground mt-2">Waiting for them to join...</p>
                <Button 
                  className="w-full mt-4" 
                  onClick={() => router.push(`/student/games/duel/${inviteCode}/wait`)}
                >
                  Go to Waiting Room
                </Button>
              </div>
            )}
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or join</span></div>
            </div>
            
            <div className="flex space-x-2">
              <Input 
                placeholder="Enter invite code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
              <Button onClick={handleJoinInvite} disabled={!joinCode || isJoining}>
                Join
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
