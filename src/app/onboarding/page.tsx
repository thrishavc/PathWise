"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ExplanationStyle = "analogy" | "technical";
type StuckStrategy = "analogy" | "steps";
type Goal = "personal" | "deep" | "career";

type QuestionId = "q1" | "q2" | "q3";

type QuestionOption = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

type Question = {
  id: QuestionId;
  heading: (name?: string) => string;
  options: QuestionOption[];
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    heading: (name?: string) =>
      `Hi ${name && name.length > 0 ? name : "there"}! How do you usually understand something new?`,
    options: [
      {
        id: "analogy",
        icon: "💡",
        title: "Real-world Examples",
        description: "Through real-world examples and stories",
      },
      {
        id: "technical",
        icon: "⚙️",
        title: "Technical Details",
        description: "Through technical details and specifications",
      },
    ],
  },
  {
    id: "q2",
    heading: () => "When you get stuck, what helps you most?",
    options: [
      {
        id: "analogy",
        icon: "💡",
        title: "Analogies",
        description: "An analogy that connects it to something I know",
      },
      {
        id: "steps",
        icon: "🔧",
        title: "Technical Breakdown",
        description: "Breaking it down into smaller technical steps",
      },
    ],
  },
  {
    id: "q3",
    heading: () => "What's your goal with learning to build a PC?",
    options: [
      {
        id: "personal",
        icon: "👤",
        title: "Personal Build",
        description: "I want to build one for myself",
      },
      {
        id: "deep",
        icon: "🧠",
        title: "Deep Understanding",
        description: "I want to deeply understand the technology",
      },
      {
        id: "career",
        icon: "💼",
        title: "Career Focus",
        description: "I'm considering a career in hardware or IT",
      },
    ],
  },
];

type AnswersState = {
  q1?: ExplanationStyle;
  q2?: StuckStrategy;
  q3?: Goal;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersState>({});
  const [isVisible, setIsVisible] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const totalQuestions = QUESTIONS.length;
  const currentQuestion = QUESTIONS[currentIndex];

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedName =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:name")
        : null)?.trim() || "";

    if (storedName && storedName !== name) {
      // Defer state update to avoid synchronous setState inside effect body.
      window.setTimeout(() => {
        setName(storedName);
      }, 0);
    }
  }, [name]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setIsVisible(true);
    }, 40);

    return () => {
      window.clearTimeout(id);
      setIsVisible(false);
    };
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (optionId: string) => {
    if (isTransitioning) return;

    const questionId = currentQuestion.id;

    const nextAnswers: AnswersState = { ...answers };
    if (questionId === "q1") {
      nextAnswers.q1 = optionId as ExplanationStyle;
    } else if (questionId === "q2") {
      nextAnswers.q2 = optionId as StuckStrategy;
    } else if (questionId === "q3") {
      nextAnswers.q3 = optionId as Goal;
    }

    setAnswers(nextAnswers);
    setIsTransitioning(true);

    timeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);

      const isLast = currentIndex === totalQuestions - 1;
      if (isLast) {
        const profile = {
          explanationStyle: (nextAnswers.q1 ?? "analogy") satisfies ExplanationStyle,
          stuckStrategy: (nextAnswers.q2 ?? "steps") satisfies StuckStrategy,
          goal: (nextAnswers.q3 ?? "personal") satisfies Goal,
        };

        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(
              "pathwise:learningProfile",
              JSON.stringify(profile),
            );
          }
        } catch {
          // If localStorage fails, we still navigate.
        }

        router.push("/learn");
        return;
      }

      setCurrentIndex((prev) => prev + 1);
    }, 500);
  };

  const selectedForCurrent =
    currentQuestion.id === "q1"
      ? answers.q1
      : currentQuestion.id === "q2"
        ? answers.q2
        : answers.q3;

  const progressLabel = `Question ${currentIndex + 1} of ${totalQuestions}`;
  const progressPercent = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0d1117] px-4 py-10">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.15),transparent_65%)]" />
      <main className="relative z-10 w-full max-w-3xl">
        <header className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#fbbf24] text-[#0d1117] text-sm font-bold shadow-md shadow-[#fbbf24]/40">
              PW
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-100">
                PathWise <span className="text-[#fbbf24]">AI</span>
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Learning style onboarding
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-500">
              {progressLabel}
            </span>
            <span className="text-[#fbbf24] font-medium">
              {Math.round(progressPercent)}% Complete
            </span>
          </div>
        </header>

        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-[#161b22]">
          <div
            className="h-full rounded-full bg-[#fbbf24] shadow-[0_0_14px_rgba(251,191,36,0.6)] transition-[width] duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <section
          className={`space-y-8 rounded-2xl border border-slate-800 bg-[#161b22]/90 px-6 py-8 shadow-2xl shadow-black/60 backdrop-blur transition-all duration-300 ease-out ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          <div className="space-y-3 text-center sm:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              {currentQuestion.heading(name)}
            </h1>
            <p className="text-sm text-slate-400">
              Your answers help PathWise teach in a way that actually fits how
              your brain likes to learn.
            </p>
          </div>

          <div
            className={`grid gap-4 ${
              currentQuestion.id === "q3"
                ? "md:grid-cols-3"
                : "md:grid-cols-2"
            }`}
          >
            {currentQuestion.options.map((option) => {
              const isSelected = selectedForCurrent === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option.id)}
                  disabled={isTransitioning}
                  className={`group relative flex h-full flex-col items-start rounded-2xl border px-5 py-5 text-left transition-all duration-200 ${
                    isSelected
                      ? "border-2 border-[#fbbf24] bg-[#fbbf24]/10 ring-4 ring-[#fbbf24]/15 shadow-xl shadow-[#fbbf24]/25"
                      : "border border-slate-800 bg-black/20 hover:border-[#fbbf24]/60 hover:bg-black/40"
                  }`}
                >
                  {isSelected && (
                    <span className="absolute right-4 top-4 text-[#fbbf24] text-lg" aria-hidden>✓</span>
                  )}
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
                      isSelected
                        ? "bg-[#fbbf24] text-[#0d1117]"
                        : "bg-[#161b22] text-slate-300 group-hover:bg-[#fbbf24]/20 group-hover:text-[#fbbf24]"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{option.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{option.description}</p>
                </button>
              );
            })}
          </div>

          <footer className="mt-2 flex items-center justify-center text-xs text-slate-500">
            <span className="mr-2 text-sm" aria-hidden>ℹ️</span>
            <span>
              Selecting an option will automatically guide you to the next
              step.
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}
