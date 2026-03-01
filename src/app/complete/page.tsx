"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AssessmentStats = {
  correct: number;
  total: number;
  timeTaken: number;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export default function CompletePage() {
  const router = useRouter();
  const [name, setName] = useState<string>("there");
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [milestoneNumber, setMilestoneNumber] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const name =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:name")
        : null;
    const milestoneStr =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:currentMilestone")
        : null;
    const statsStr =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:assessmentStats")
        : null;

    const num = milestoneStr ? parseInt(milestoneStr, 10) : 1;
    const safeNum = Number.isFinite(num) && num >= 1 && num <= 5 ? num : 1;
    window.setTimeout(() => setMilestoneNumber(safeNum), 0);
    if (name?.trim()) {
      const firstName = name.includes(" ")
        ? name.trim().split(/\s+/)[0] || name.trim()
        : name.trim();
      window.setTimeout(() => setName(firstName || "there"), 0);
    }
    if (statsStr) {
      try {
        const parsed = JSON.parse(statsStr) as AssessmentStats;
        const safe: AssessmentStats =
          typeof parsed.correct === "number" &&
          typeof parsed.total === "number" &&
          typeof parsed.timeTaken === "number"
            ? parsed
            : { correct: 0, total: 3, timeTaken: 0 };
        window.setTimeout(() => setStats(safe), 0);
      } catch {
        window.setTimeout(() => setStats({ correct: 0, total: 3, timeTaken: 0 }), 0);
      }
    }
  }, []);

  const correct = stats?.correct ?? 0;
  const total = stats?.total ?? 3;
  const timeTaken = stats?.timeTaken ?? 0;
  const accuracy =
    total > 0 ? Math.round((correct / total) * 100) : 0;
  const xp = correct * 100;

  const handleContinue = () => {
    if (typeof window === "undefined") return;
    const nextMilestone = milestoneNumber + 1;
    window.localStorage.setItem(
      "pathwise:currentMilestone",
      String(nextMilestone),
    );
    router.push("/learn");
  };

  const allMilestonesComplete = milestoneNumber >= 5;

  return (
    <div className="flex min-h-screen flex-col bg-[#0f0f0f] text-slate-100">
      <header className="sticky top-0 z-30 flex items-center border-b border-amber-400/15 bg-[#0f0f0f]/90 px-6 py-4 backdrop-blur md:px-20">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400 text-gray-900 text-sm font-bold">
            PW
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white">
              PathWise <span className="text-amber-400">AI</span>
            </span>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
              Milestone {milestoneNumber} Complete
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(242,185,13,0.12),transparent_55%)] px-4 py-10">
        <div className="flex w-full max-w-2xl flex-col items-center rounded-xl border border-[#f2b90d]/25 bg-slate-900/40 px-8 py-10 text-center shadow-2xl shadow-black/70 md:px-12 md:py-12">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-amber-400 blur-3xl opacity-30" />
            <div className="relative flex size-24 items-center justify-center rounded-full bg-amber-400 text-4xl font-black text-gray-900 shadow-[0_0_40px_rgba(251,191,36,0.5)] md:size-32" aria-hidden>
              ✓
            </div>
          </div>

          <div className="mb-8 space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Milestone {milestoneNumber} complete, {name}.
            </h2>
            <p className="text-sm text-slate-300 md:text-base">
              You just wrapped up the fundamentals of PC components — and
              your explanations show you&apos;re really getting it.
            </p>
          </div>

          <div className="mb-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-xl border border-[#f2b90d]/25 bg-[#f2b90d]/10 p-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#f2b90d]/80">
                Points earned
              </p>
              <p className="text-2xl font-bold text-white">
                +{xp} XP
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#f2b90d]/25 bg-[#f2b90d]/10 p-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#f2b90d]/80">
                Accuracy
              </p>
              <p className="text-2xl font-bold text-white">
                {accuracy}%
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#f2b90d]/25 bg-[#f2b90d]/10 p-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#f2b90d]/80">
                Time taken
              </p>
              <p className="text-2xl font-bold text-white">
                {formatDuration(timeTaken)}
              </p>
            </div>
          </div>

          {allMilestonesComplete ? (
            <p className="text-lg font-semibold text-amber-400">
              You completed all milestones! 🎉
            </p>
          ) : (
            <button
              type="button"
              onClick={handleContinue}
              className="group relative flex h-14 w-full max-w-md items-center justify-center overflow-hidden rounded-full bg-[#f2b90d] text-sm font-bold text-[#0f0f0f] shadow-lg shadow-[#f2b90d]/40 transition hover:bg-amber-400"
            >
              <span className="flex items-center gap-2">
                Continue to Next Milestone
                <span className="transition-transform group-hover:translate-x-1" aria-hidden>→</span>
              </span>
            </button>
          )}

          <button
            type="button"
            className="mt-5 text-xs font-medium text-slate-400 underline-offset-4 hover:text-white hover:underline"
          >
            Review Assessment Answers
          </button>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 -z-10 h-64 bg-[radial-gradient(circle_at_bottom,rgba(242,185,13,0.16),transparent_55%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top,rgba(242,185,13,0.16),transparent_55%)]" />
    </div>
  );
}

