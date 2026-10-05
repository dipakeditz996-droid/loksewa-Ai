"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, Check, Copy, Loader2, Swords, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { gamesApi, GameMatch } from "@/lib/api/games";

export default function DuelWaitingRoomPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const matchId = Number(params.id);

  const [match, setMatch] = useState<GameMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchMatch = useCallback(async () => {
    if (!Number.isInteger(matchId) || matchId <= 0) {
      setError("This waiting-room link is invalid.");
      return;
    }

    try {
      const currentMatch = await gamesApi.getMatchState(matchId);
      setMatch(currentMatch);
      setError(null);

      if (currentMatch.status === "MATCHED" || currentMatch.status === "IN_PROGRESS") {
        router.replace(`/student/games/duel/${matchId}`);
      } else if (currentMatch.status === "COMPLETED") {
        router.replace(`/student/games/duel/${matchId}`);
      } else if (currentMatch.status === "CANCELLED") {
        setError("This challenge was cancelled. Return to 1 vs 1 to create another invite.");
      }
    } catch (fetchError) {
      console.error("Failed to load duel waiting room", fetchError);
      setError("Could not load this challenge. It may have expired, or you may not have access.");
    }
  }, [matchId, router]);

  useEffect(() => {
    void fetchMatch();
    const interval = window.setInterval(() => void fetchMatch(), 2000);
    return () => window.clearInterval(interval);
  }, [fetchMatch]);

  const copyInviteCode = async () => {
    if (!match?.invite_code) return;
    try {
      await navigator.clipboard.writeText(match.invite_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      console.error("Failed to copy duel invite code", copyError);
      setError("Could not copy the invite code. Please select and copy it manually.");
    }
  };

  const cancelInvite = async () => {
    setIsCancelling(true);
    try {
      await gamesApi.cancelMatch(matchId);
      router.push("/student/games/duel");
    } catch (cancelError) {
      console.error("Failed to cancel duel invite", cancelError);
      setError("Could not cancel this challenge. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (error && !match) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-xl flex-col items-center justify-center gap-5 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold text-foreground">Waiting room unavailable</h1>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => router.push("/student/games/duel")}>Back to 1 vs 1</Button>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center p-6">
        {error ? (
          <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>
        ) : null}
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your challenge room...</p>
      </main>
    );
  }

  if (match.status === "CANCELLED") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-xl flex-col items-center justify-center gap-5 p-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold text-foreground">Challenge cancelled</h1>
        <p className="text-muted-foreground">
          This invite is no longer active. Create a new challenge to play 1 vs 1.
        </p>
        <Button onClick={() => router.push("/student/games/duel")}>Back to 1 vs 1</Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-muted/40 p-4 md:p-8">
      <section className="w-full max-w-xl space-y-6 rounded-2xl border border-border bg-card p-7 text-center shadow-lg md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Swords className="h-8 w-8 text-primary" />
        </div>
        <div>
          <Badge variant="secondary">Private 1 vs 1 challenge</Badge>
          <h1 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Waiting for your opponent</h1>
          <p className="mt-2 text-muted-foreground">
            Share the invite code below. This room will start automatically when your friend joins.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/50 p-5">
          <p className="text-sm text-muted-foreground">Invite code</p>
          <p className="my-2 font-mono text-3xl font-bold tracking-widest text-foreground">
            {match.invite_code || "Unavailable"}
          </p>
          {match.invite_code ? (
            <Button variant="outline" onClick={copyInviteCode}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking for opponent...
        </div>
        {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

        <Button
          variant="outline"
          onClick={cancelInvite}
          disabled={isCancelling || match.status !== "SEARCHING"}
          className="border-red-200 text-red-600 hover:bg-red-50"
        >
          {isCancelling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <XCircle className="mr-2 h-4 w-4" />
          )}
          Cancel challenge
        </Button>
      </section>
    </main>
  );
}
