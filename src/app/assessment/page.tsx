"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GeneratedQuestion = {
  question: string;
  concept: string;
};

type AssessmentStats = {
  correct: number;
  total: number;
  timeTaken: number;
};

const MILESTONES = [
  { number: 1, title: "Understanding PC Components", concepts: ["CPU", "GPU", "RAM", "Motherboard", "Power Supply"] },
  { number: 2, title: "Choosing the Right Parts", concepts: ["Budget", "Compatibility", "Performance", "Brand", "Warranty"] },
  { number: 3, title: "Assembly Basics", concepts: ["Safety", "Motherboard Install", "CPU Install", "RAM Install", "Cable Management"] },
  { number: 4, title: "Software & OS Setup", concepts: ["BIOS", "OS Install", "Drivers", "Updates", "Optimization"] },
  { number: 5, title: "Troubleshooting & Optimization", concepts: ["Diagnostics", "Overheating", "Performance", "Updates", "Backup"] },
] as const;

export default function AssessmentPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [milestoneNumber, setMilestoneNumber] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:currentMilestone")
        : null;
    const num = saved ? parseInt(saved, 10) : 1;
    setMilestoneNumber(Number.isFinite(num) && num >= 1 && num <= 5 ? num : 1);
  }, []);

  const activeMilestone =
    milestoneNumber >= 1 ? MILESTONES[milestoneNumber - 1] ?? MILESTONES[0] : MILESTONES[0];

  const currentQuestion = questions[currentIndex];
  const totalQuestions = 3;

  useEffect(() => {
    if (typeof window !== "undefined") {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (milestoneNumber === 0) return;

    const active = MILESTONES[milestoneNumber - 1] ?? MILESTONES[0];

    const fetchQuestions = async () => {
      const conceptsList = active.concepts.join(", ");

      setIsLoadingQuestion(true);
      try {
        const profileRaw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("pathwise:learningProfile")
            : null;
        const nameRaw =
          typeof window !== "undefined"
            ? window.localStorage.getItem("pathwise:name")
            : null;

        const learningProfile = profileRaw ? JSON.parse(profileRaw) : undefined;
        const userName = nameRaw?.trim() || "there";

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: `Generate exactly 3 short assessment questions about ${active.title} covering these concepts: ${conceptsList}. Questions should test understanding of what was just taught. Return ONLY a JSON array like: [{question: '...', concept: '...'}]. No other text.`,
            learningProfile,
            userName,
            conversationHistory: [],
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to generate questions");
        }

        const data = (await res.json()) as { reply?: string };
        const raw = data.reply ?? "[]";
        let parsed: unknown = [];
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = [];
        }

        if (
          Array.isArray(parsed) &&
          parsed.length >= 1 &&
          typeof parsed[0]?.question === "string"
        ) {
          setQuestions(
            (parsed as GeneratedQuestion[]).slice(0, totalQuestions),
          );
        } else {
          setQuestions([
            {
              question: "In simple terms, what does a CPU do inside a PC?",
              concept: "CPU Architecture",
            },
            {
              question:
                "Why is having enough RAM important for running modern applications?",
              concept: "RAM Types",
            },
            {
              question:
                "What role does a GPU play when you are gaming or editing video?",
              concept: "GPU Basics",
            },
          ]);
        }
      } catch (error) {
        console.error("[PathWise] assessment question error", error);
        setQuestions([
          {
            question: "In simple terms, what does a CPU do inside a PC?",
            concept: "CPU Architecture",
          },
          {
            question:
              "Why is having enough RAM important for running modern applications?",
            concept: "RAM Types",
          },
          {
            question:
              "What role does a GPU play when you are gaming or editing video?",
            concept: "GPU Basics",
          },
        ]);
      } finally {
        setIsLoadingQuestion(false);
      }
    };

    fetchQuestions().catch((error) => {
      console.error(error);
    });
  }, [milestoneNumber]);

  const isAnswerMarkedCorrect = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("incorrect") || lower.includes("not quite right")) {
      return false;
    }
    if (lower.includes("not correct") || lower.includes("not quite correct")) {
      return false;
    }
    return lower.includes("correct") || lower.includes("right");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentQuestion || !answer.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const profileRaw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("pathwise:learningProfile")
          : null;
      const nameRaw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("pathwise:name")
          : null;

      const learningProfile = profileRaw ? JSON.parse(profileRaw) : undefined;
      const userName = nameRaw?.trim() || "there";

      const evalMessage = `The student was asked: "${currentQuestion.question}". They answered: "${answer}". Give brief encouraging feedback in 1-2 sentences and say if they got it right. Be warm and supportive.`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: evalMessage,
          learningProfile,
          userName,
          conversationHistory: [],
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to evaluate answer");
      }

      const data = (await res.json()) as { reply?: string };
      const reply = data.reply?.trim() || "";
      setFeedback(reply || "Great effort. Let's keep going!");

      if (isAnswerMarkedCorrect(reply)) {
        setCorrectCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("[PathWise] assessment evaluation error", error);
      setFeedback(
        "Thanks for your answer — I couldn't quite evaluate it just now, but you're on the right track. Let's continue.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const goToNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
      setAnswer("");
      setFeedback(null);
    } else {
      const end = typeof window !== "undefined" ? Date.now() : 0;
      const start = startTimeRef.current ?? end;
      const timeTakenSeconds = Math.max(0, Math.round((end - start) / 1000));

      const stats: AssessmentStats = {
        correct: correctCount,
        total: totalQuestions,
        timeTaken: timeTakenSeconds,
      };

      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "pathwise:assessmentStats",
            JSON.stringify(stats),
          );
        }
      } catch {
        // ignore storage issues
      }

      router.push("/complete");
    }
  };

  const progressPercent =
    ((currentIndex + (feedback ? 1 : 0)) / totalQuestions) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-[#0d1117] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[#2d2d26] bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400 text-gray-900 text-sm font-bold">
              PW
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white">
                PathWise <span className="text-amber-400">AI</span>
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Quick Check — Milestone {milestoneNumber}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 lg:px-10">
        <div className="mb-8 w-full">
          <nav className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="hover:text-[#fbbf24] transition-colors">
              Milestone {milestoneNumber}
            </span>
            <span className="text-[14px]" aria-hidden>→</span>
            <span className="text-slate-100">Quick Check</span>
          </nav>

          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-100 md:text-3xl">
                Quick Check — Milestone {milestoneNumber}
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Quick Check — {activeMilestone.title}
              </p>
            </div>
            <div className="min-w-[220px] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-[#fbbf24] font-medium">
                  {Math.round(((currentIndex + 1) / totalQuestions) * 100)}%
                  Complete
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full border border-[#2d2d26] bg-[#161b22]">
                <div
                  className="h-full rounded-full bg-[#fbbf24]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <section className="grid w-full grid-cols-1 gap-8">
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[#fbbf24] text-[#0d1117] text-3xl shadow-[0_0_20px_rgba(242,185,13,0.3)]" aria-hidden>
                🤖
              </div>
              <div className="relative max-w-2xl">
                <div className="rounded-2xl rounded-tl-none border border-[#2d2d26] bg-[#161b22] p-6 shadow-xl">
                  <div className="mb-2 flex items-center gap-2 text-xs">
                    <span className="text-[#fbbf24] font-bold uppercase tracking-[0.2em]">
                      AI Tutor
                    </span>
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    <span className="text-slate-500 font-medium">
                      Warm &amp; encouraging
                    </span>
                  </div>
                  <p className="text-lg font-medium leading-relaxed text-slate-100">
                    {isLoadingQuestion || !currentQuestion
                      ? "Loading your first assessment question..."
                      : `"${currentQuestion.question}"`}
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-slate-500">
                  <span className="text-xs" aria-hidden>ℹ️</span>
                  <span>
                    Answer in your own words — there&apos;s no single perfect
                    phrasing.
                  </span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="ml-14 flex flex-col items-end gap-4"
            >
              <div className="relative w-full">
                <textarea
                  rows={6}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  disabled={isLoadingQuestion}
                  placeholder="Type your response here..."
                  className="w-full resize-none rounded-2xl border border-[#2d2d26] bg-[#161b22] p-5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-transparent focus:ring-2 focus:ring-[#fbbf24]"
                />
                <div className="pointer-events-none absolute bottom-4 right-4 hidden items-center gap-3 text-[0.7rem] text-slate-500 sm:flex">
                  <span>Press Cmd + Enter to submit</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  isLoadingQuestion || !answer.trim() || isSubmitting
                }
                className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-6 py-2.5 text-sm font-bold text-gray-900 shadow-lg transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
              >
                <span>{isSubmitting ? "Checking..." : "Submit Answer"}</span>
                <span aria-hidden>→</span>
              </button>
            </form>

            {feedback && (
              <div className="mt-2 rounded-2xl border-t border-[#2d2d26] bg-[#0d1117]/60 px-4 py-4 text-sm text-slate-200">
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Feedback
                </p>
                <p>{feedback}</p>
                <button
                  type="button"
                  onClick={goToNext}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#fbbf24] hover:text-[#facc15]"
                >
                  <span>
                    {currentIndex + 1 < totalQuestions
                      ? "Next question"
                      : "Finish assessment"}
                  </span>
                  <span aria-hidden>→</span>
                </button>
              </div>
            )}

            {!feedback && !isLoadingQuestion && currentQuestion && (
              <div className="mt-2 border-t border-[#2d2d26] pt-6">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                  Related Concepts
                </h3>
                <div className="flex flex-wrap gap-3 text-xs">
                  {activeMilestone.concepts.map((label) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-full border border-[#2d2d26] bg-[#161b22] px-4 py-2 text-slate-300"
                    >
                      <span className="text-base" aria-hidden>💾</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

