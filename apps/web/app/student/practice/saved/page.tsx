"use client";

import { useState, useEffect } from "react";
import { practiceApi, SavedQuestion } from "@/lib/api/practice";
import { Loader2, Star, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SavedQuestionsPage() {
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<SavedQuestion[]>([]);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [removing, setRemoving] = useState<Record<number, boolean>>({});

  useEffect(() => {
    practiceApi.listSavedQuestions()
      .then(setSaved)
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (item: SavedQuestion) => {
    setRemoving(prev => ({ ...prev, [item.id]: true }));
    try {
      await practiceApi.toggleBookmark(item.question);
      setSaved(prev => prev.filter(s => s.id !== item.id));
    } catch (e) {
      console.error(e);
      setRemoving(prev => ({ ...prev, [item.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary dark:text-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto space-y-8 animate-in fade-in-50 duration-500">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-primary dark:text-foreground flex items-center gap-3">
          <Star className="w-7 h-7 text-[#D4A72C]" fill="currentColor" /> Saved Questions
        </h1>
        <p className="text-muted-foreground mt-1 text-[15px]">
          Questions you set aside for a second look — even ones you already got right. Saving a question here never affects your weak-topic detection.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="bg-card rounded-[16px] border border-border shadow-sm p-10 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold text-primary dark:text-foreground">Nothing saved yet</p>
          <p className="text-muted-foreground text-[14px] mt-1">
            While practicing, tap <strong>Save for Later</strong> on any question to add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {saved.map(item => {
            const q = item.question_detail;
            const isRevealed = revealed[item.id];
            return (
              <div key={item.id} className="bg-card rounded-[16px] border border-border shadow-sm p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-[16px] font-medium text-primary dark:text-foreground leading-relaxed">
                    {q.text}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(item)}
                    disabled={removing[item.id]}
                    className="shrink-0 text-muted-foreground hover:text-red-500"
                  >
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {(['a', 'b', 'c', 'd'] as const).map(opt => {
                    const optionText = q[`option_${opt}`];
                    // correct_option comes back uppercase from the API.
                    const isCorrect = isRevealed && q.correct_option?.toLowerCase() === opt;
                    return (
                      <div
                        key={opt}
                        className={`flex items-center p-3 rounded-[10px] border text-[14px] font-medium ${
                          isCorrect
                            ? "border-green-300 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300"
                            : "border-border bg-muted/40 text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold mr-2">{opt.toUpperCase()}.</span> {optionText as string}
                      </div>
                    );
                  })}
                </div>

                {isRevealed ? (
                  q.explanation ? (
                    <p className="text-[13.5px] text-muted-foreground bg-muted/40 rounded-[10px] p-3">
                      <strong className="text-primary dark:text-foreground">Explanation: </strong>{q.explanation}
                    </p>
                  ) : null
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRevealed(prev => ({ ...prev, [item.id]: true }))}
                  >
                    Show Answer
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
