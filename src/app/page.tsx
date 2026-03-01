"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setIsShaking(true);
      return;
    }

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pathwise:name", trimmed);
      }
    } catch {
      // If localStorage is unavailable, just continue navigation.
    }

    router.push("/onboarding");
  };

  const handleAnimationEnd = () => {
    if (isShaking) {
      setIsShaking(false);
    }
  };

  const showShake = isShaking ? "pw-shake" : "";

  return (
    <div className="relative min-h-screen bg-[#0d1117] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.18),transparent_60%)] opacity-90" />

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center px-6 py-6 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#161b22] text-[#fbbf24] shadow-md shadow-[#fbbf24]/30">
            <span className="text-lg font-semibold">PW</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-sm font-semibold tracking-tight">
              PathWise
            </span>
            <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">
              Adaptive AI Learning
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-4xl flex-col items-center justify-center px-6 pb-16 pt-6 text-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#161b22] text-[#fbbf24] shadow-xl shadow-[#fbbf24]/25">
            <span className="text-3xl font-bold">★</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            PathWise
          </h1>
        </div>

        <p className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
          Our adaptive AI tutor personalizes your learning journey — teaching
          you the way your brain actually works.
        </p>

        <div className="mb-10 flex flex-wrap justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#161b22]/60 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 shadow-sm shadow-[#fbbf24]/10">
            <span className="text-[#fbbf24]">✦</span>
            <span>Adapts to you</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#161b22]/60 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 shadow-sm shadow-[#fbbf24]/10">
            <span className="text-[#fbbf24]">✦</span>
            <span>Industry context first</span>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#161b22]/60 px-4 py-2 text-xs font-semibold tracking-wide text-slate-200 shadow-sm shadow-[#fbbf24]/10">
            <span className="text-[#fbbf24]">✦</span>
            <span>Voice-ready experience</span>
          </div>
        </div>

        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#161b22]/95 px-6 py-7 shadow-2xl shadow-black/60 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div
              className={`rounded-xl border border-slate-700 bg-[#0d1117]/70 px-4 py-4 text-left transition-[border-color,box-shadow,transform] ${showShake}`}
              onAnimationEnd={handleAnimationEnd}
            >
              <label
                htmlFor="name"
                className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400"
              >
                What should we call you?
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name..."
                className="mt-1 w-full border-none bg-transparent text-sm text-slate-50 outline-none placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#fbbf24] px-4 py-3.5 text-sm font-bold text-[#0d1117] shadow-lg shadow-[#fbbf24]/30 transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Continue</span>
              <span aria-hidden="true" className="text-base">
                →
              </span>
            </button>

            <p className="mt-2 text-center text-[0.7rem] leading-relaxed text-slate-500">
              By continuing, you agree to our Terms of Service and Privacy
              Policy.
            </p>
          </form>
        </div>

        <footer className="mt-10 flex flex-col items-center gap-3 text-[0.7rem] text-slate-500">
          <div className="flex gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-700" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#fbbf24]" />
          </div>
          <p className="font-medium tracking-[0.22em] uppercase">
            © 2024 PathWise AI
          </p>
        </footer>
      </main>
    </div>
  );
}
