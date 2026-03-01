"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ExplanationStyle = "analogy" | "technical";
type StuckStrategy = "analogy" | "steps";
type Goal = "personal" | "deep" | "career";

type LearningProfile = {
  explanationStyle: ExplanationStyle;
  stuckStrategy: StuckStrategy;
  goal: Goal;
};

type ChatMessageRole = "ai" | "user";

type ChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
};

const DEFAULT_PROFILE: LearningProfile = {
  explanationStyle: "analogy",
  stuckStrategy: "steps",
  goal: "personal",
};

type MilestoneData = {
  number: number;
  title: string;
  shortName: string;
  concepts: string[];
  systemContext: string;
};

const MILESTONES: MilestoneData[] = [
  {
    number: 1,
    title: "Understanding PC Components",
    shortName: "UNDERSTANDING",
    concepts: ["CPU", "GPU", "RAM", "Motherboard", "Power Supply"],
    systemContext: "Current milestone: Understanding PC Components",
  },
  {
    number: 2,
    title: "Choosing the Right Parts",
    shortName: "CHOOSING",
    concepts: ["Budget", "Compatibility", "Performance", "Brand", "Warranty"],
    systemContext: "Current milestone: Choosing the Right Parts",
  },
  {
    number: 3,
    title: "Assembly Basics",
    shortName: "ASSEMBLY",
    concepts: ["Safety", "Motherboard Install", "CPU Install", "RAM Install", "Cable Management"],
    systemContext: "Current milestone: Assembly Basics",
  },
  {
    number: 4,
    title: "Software & OS Setup",
    shortName: "SOFTWARE",
    concepts: ["BIOS", "OS Install", "Drivers", "Updates", "Optimization"],
    systemContext: "Current milestone: Software and OS Setup",
  },
  {
    number: 5,
    title: "Troubleshooting & Optimization",
    shortName: "TROUBLESHOOTING",
    concepts: ["Diagnostics", "Overheating", "Performance", "Updates", "Backup"],
    systemContext: "Current milestone: Troubleshooting and Optimization",
  },
];

function createId() {
  return Math.random().toString(36).slice(2);
}

function getPrimaryConcept(content: string, concepts: string[]): string | null {
  const lower = content.toLowerCase();
  let bestConcept: string | null = null;
  let bestCount = 0;
  for (const concept of concepts) {
    const count = lower.split(concept.toLowerCase()).length - 1;
    if (count > bestCount) {
      bestCount = count;
      bestConcept = concept;
    }
  }
  return bestConcept;
}

export default function LearnPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceState, setVoiceState] = useState<"speaking" | "listening" | "thinking">("listening");
  const [voiceTranscriptLines, setVoiceTranscriptLines] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [checkedConcepts, setCheckedConcepts] = useState<Set<string>>(new Set());
  const [currentMilestoneNumber, setCurrentMilestoneNumber] = useState(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<LearningProfile | null>(null);
  const nameRef = useRef<string>("");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);
  const hasStarted = useRef(false);
  const hasHydratedMilestone = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  const MAX_TEXTAREA_ROWS = 5;
  const LINE_HEIGHT_PX = 24;
  const MAX_TEXTAREA_HEIGHT_PX = MAX_TEXTAREA_ROWS * LINE_HEIGHT_PX;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:currentMilestone")
        : null;
    const num = saved ? parseInt(saved, 10) : 1;
    setCurrentMilestoneNumber(Number.isFinite(num) && num >= 1 && num <= 5 ? num : 1);

    try {
      const storedProfile =
        typeof window !== "undefined"
          ? window.localStorage.getItem("pathwise:learningProfile")
          : null;
      if (storedProfile) {
        const parsed = JSON.parse(storedProfile) as LearningProfile;
        profileRef.current = parsed;
      } else {
        profileRef.current = DEFAULT_PROFILE;
      }
    } catch {
      profileRef.current = DEFAULT_PROFILE;
    }

    const storedName =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("pathwise:name")
        : null)?.trim() || "";
    nameRef.current = storedName || "there";

    // Defer so the save effect runs first (with hasHydratedMilestone false) and skips; then we allow future saves
    window.setTimeout(() => {
      hasHydratedMilestone.current = true;
    }, 0);
  }, []);

  useEffect(() => {
    if (!hasHydratedMilestone.current) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "pathwise:currentMilestone",
        String(currentMilestoneNumber),
      );
    }
  }, [currentMilestoneNumber]);

  useEffect(() => {
    if (input === "" && textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  useEffect(() => {
    startConversation().catch((err) => console.error("[PathWise] startConversation error", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  useEffect(() => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading]);

  const addAiMessage = (content: string, concepts: string[]) => {
    setMessages((prev) => [...prev, { id: createId(), role: "ai", content }]);
    const primary = getPrimaryConcept(content, concepts);
    if (primary) {
      setCheckedConcepts((prev) => new Set(prev).add(primary));
    }
  };

  const addUserMessage = (content: string) => {
    setMessages((prev) => [...prev, { id: createId(), role: "user", content }]);
  };

  const buildConversationHistory = (list: ChatMessage[]) =>
    list.map((m) => ({
      role: m.role,
      content: m.content,
    }));

  const activeMilestone = MILESTONES.find((m) => m.number === currentMilestoneNumber) ?? MILESTONES[0];
  const keyConcepts = activeMilestone.concepts;

  const callChatApi = async (
    userMessage: string,
    history: ChatMessage[],
  ): Promise<void> => {
    if (typeof window === "undefined") return;

    const profile = profileRef.current ?? DEFAULT_PROFILE;
    const userName = nameRef.current || "there";

    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          learningProfile: profile,
          userName,
          conversationHistory: buildConversationHistory(history),
          milestoneContext: activeMilestone.title,
          milestoneConcepts: activeMilestone.concepts,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch AI response");
      }

      const data = (await response.json()) as { reply?: string };
      const reply = data.reply?.trim();
      if (reply) {
        addAiMessage(reply, keyConcepts);
      } else {
        addAiMessage(
          "I ran into a small issue generating a response. Try sending your message again.",
          keyConcepts,
        );
      }
    } catch (error) {
      console.error("[PathWise] chat error", error);
      addAiMessage(
        "I couldn't reach the learning engine just now. Check your connection and try again.",
        keyConcepts,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const opening =
      "Begin teaching the current milestone. Start with a compelling real-world hook.";
    await callChatApi(opening, []);
  };

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    addUserMessage(trimmed);
    setInput("");
    const updatedHistory: ChatMessage[] = [
      ...messages,
      { id: createId(), role: "user", content: trimmed },
    ];
    await callChatApi(trimmed, updatedHistory);
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(input);
  };

  const speakInVoiceMode = (text: string, onEnd: () => void) => {
    if (typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) {
      onEnd();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
    synth.speak(utterance);
  };

  useEffect(() => {
    if (!voiceModeActive) return;
    const Win = window as unknown as {
      SpeechRecognition?: new () => { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null; onend: (() => void) | null };
      webkitSpeechRecognition?: new () => { start: () => void; stop: () => void; continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null; onend: (() => void) | null };
    };
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) return;

    const lastAi = [...messages].reverse().find((m) => m.role === "ai");
    if (lastAi) {
      setVoiceState("speaking");
      lastSpokenMessageIdRef.current = lastAi.id;
      speakInVoiceMode(lastAi.content, () => {
        setVoiceState("listening");
      });
    } else {
      setVoiceState("listening");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only on voice mode activate
  }, [voiceModeActive]);

  useEffect(() => {
    if (!voiceModeActive || voiceState !== "listening") return;
    const Win = window as unknown as {
      SpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        start: () => void;
        stop: () => void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: ((e: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => void) | null;
        onend: (() => void) | null;
      };
    };
    const SR = Win.SpeechRecognition || Win.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";
    let silenceTimeout: ReturnType<typeof setTimeout> | null = null;

    const resetSilence = () => {
      if (silenceTimeout) clearTimeout(silenceTimeout);
      silenceTimeout = setTimeout(() => {
        const text = (finalTranscript || "").trim();
        if (text) {
          recognition.stop();
          setVoiceState("thinking");
          setVoiceTranscriptLines((prev) => [...prev.slice(-3), { role: "user" as const, text }].slice(-4));
          submitMessage(text).then(() => {});
        }
        silenceTimeout = null;
      }, 1500);
    };

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } } }) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += t;
        else interim += t;
      }
      const text = (finalTranscript + interim).trim();
      if (text) resetSilence();
    };

    recognition.onend = () => {
      recognitionRef.current = null;
    };

    recognition.start();
    resetSilence();
    return () => {
      recognition.stop();
      if (silenceTimeout) clearTimeout(silenceTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submitMessage is stable for voice flow
  }, [voiceModeActive, voiceState]);

  useEffect(() => {
    if (!voiceModeActive || voiceState !== "thinking" || isLoading) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "ai") return;
    if (lastSpokenMessageIdRef.current === lastMsg.id) return;

    setVoiceState("speaking");
    lastSpokenMessageIdRef.current = lastMsg.id;
    setVoiceTranscriptLines((prev) => [...prev.slice(-3), { role: "ai" as const, text: lastMsg.content.slice(0, 100) + (lastMsg.content.length > 100 ? "..." : "") }].slice(-4));
    speakInVoiceMode(lastMsg.content, () => {
      setVoiceState("listening");
    });
  }, [voiceModeActive, voiceState, isLoading, messages]);

  const handleVoiceModeExit = () => {
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setVoiceModeActive(false);
    setVoiceState("listening");
    setVoiceTranscriptLines([]);
  };

  const allConceptsChecked = keyConcepts.every((c) => checkedConcepts.has(c));

  const steps = MILESTONES.map((m) => ({
    id: m.number,
    label: m.title,
    state: m.number < currentMilestoneNumber ? ("complete" as const) : m.number === currentMilestoneNumber ? ("current" as const) : ("locked" as const),
  }));

  return (
    <div className="fixed inset-0 flex flex-col bg-[#0d1117] text-slate-100">
      {/* Voice Mode Overlay */}
      {voiceModeActive && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950" aria-modal="true" role="dialog" aria-label="Voice mode">
          <div className="absolute right-4 top-4">
            <button
              type="button"
              onClick={handleVoiceModeExit}
              className="rounded-lg border border-white/40 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
            >
              Exit voice mode
            </button>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center px-4">
            {/* Center circle */}
            <div className="flex flex-col items-center gap-4">
              {voiceState === "speaking" && (
                <div className="flex h-48 w-48 items-center justify-center rounded-full bg-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.5)] animate-pulse-speak" aria-hidden />
              )}
              {voiceState === "listening" && (
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-4 border-amber-400 bg-transparent animate-ripple-listen" aria-hidden />
              )}
              {voiceState === "thinking" && (
                <div className="flex h-48 w-48 items-center justify-center rounded-full border-4 border-slate-500 bg-transparent animate-spin-think" aria-hidden />
              )}
              <p className="text-sm text-slate-400">
                {voiceState === "speaking" && "PathWise AI is speaking..."}
                {voiceState === "listening" && "Listening... speak now"}
                {voiceState === "thinking" && "Thinking..."}
              </p>
            </div>
            {/* Transcript area */}
            <div className="mt-8 w-full max-w-md">
              <div
                className="max-h-[150px] space-y-2 overflow-y-auto rounded-lg border border-slate-800 bg-black/30 px-4 py-3"
                style={{
                  maskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                  WebkitMaskImage: "linear-gradient(to bottom, black 70%, transparent 100%)",
                }}
              >
                {voiceTranscriptLines.map((line, i) => (
                  <p
                    key={i}
                    className={`text-xs ${line.role === "user" ? "text-slate-400" : "text-amber-400"}`}
                  >
                    {line.role === "user" ? "You: " : "PathWise AI: "}
                    {line.text}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex-shrink-0 z-30 border-b border-white/5 bg-[#0d1117]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#fbbf24] text-[#0d1117] text-sm font-bold shadow-md shadow-[#fbbf24]/40">
              PW
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-100">
                PathWise <span className="text-[#fbbf24]">AI</span>
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Building a PC from scratch
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVoiceModeActive(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/60 bg-transparent px-3 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-400/10"
            aria-label="Voice mode"
          >
            <span aria-hidden>🎤</span>
            <span>Voice Mode</span>
          </button>
        </div>
      </header>

      {/* Top milestone tracker */}
      <section className="flex-shrink-0 border-b border-white/5 bg-[#0d1117] py-5">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-4 h-[2px] w-full bg-white/5" />
            <div className="absolute left-0 top-4 h-[2px] bg-[#fbbf24]/40" style={{ width: `${(currentMilestoneNumber / 5) * 100}%` }} />
            {steps.map((step) => {
              const isCurrent = step.state === "current";
              const isComplete = step.state === "complete";

              return (
                <div
                  key={step.id}
                  className={`relative z-10 flex w-1/5 flex-col items-center gap-2 ${
                    step.state === "locked" ? "opacity-40" : ""
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.7rem] font-semibold ${
                      isCurrent
                        ? "bg-[#fbbf24] text-[#0d1117] ring-4 ring-[#fbbf24]/25"
                        : isComplete
                          ? "bg-[#161b22] text-[#fbbf24] border border-[#fbbf24]/60"
                          : "bg-[#161b22] text-slate-500 border border-slate-700"
                    }`}
                  >
                    {isComplete ? "✓" : step.id}
                  </div>
                  <span
                    className={`text-[0.6rem] font-bold uppercase tracking-[0.18em] ${
                      isCurrent
                        ? "text-[#fbbf24]"
                        : isComplete
                          ? "text-slate-200"
                          : "text-slate-500"
                    }`}
                  >
                    {step.label.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Chat area */}
      <main className="flex flex-1 flex min-h-0 flex-col bg-transparent">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col min-h-0">
          {/* STICKY HEADER - never scrolls */}
          <div className="flex-shrink-0 border-b border-gray-800 bg-[#0d1117] px-6 py-3">
            <div className="mb-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Current milestone
              </p>
              <h1 className="text-sm font-semibold text-slate-100">
                {activeMilestone.title}
              </h1>
            </div>
            <div>
              <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-slate-500">
                Key Concepts
              </p>
                <div className="flex flex-wrap gap-2">
                {keyConcepts.map((concept) => {
                  const checked = checkedConcepts.has(concept);
                  return (
                    <span
                      key={concept}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        checked
                          ? "bg-amber-400/20 text-amber-400 border border-amber-400/40"
                          : "border border-slate-600 bg-transparent text-slate-400"
                      }`}
                    >
                      {checked && <span aria-hidden>✓</span>}
                      {concept}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SCROLLABLE CHAT - only this part scrolls */}
          <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-[#161b22]/50 px-4 py-4">
            {messages.map((message) => {
              const isAi = message.role === "ai";
              if (isAi) {
                return (
                  <div key={message.id} className="flex gap-3">
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-[#161b22] border border-slate-700 text-lg" aria-hidden>
                      🤖
                    </div>
                    <div className="flex flex-1 flex-col gap-1 min-w-0">
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber-400">
                        PathWise AI
                      </span>
                      <div className="rounded-xl rounded-tl-none border-l-4 border-amber-400 bg-[#161b22] p-4 text-sm leading-relaxed text-slate-200 shadow-lg">
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className="flex flex-col items-end gap-1 text-right"
                >
                  <span className="pr-2 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-slate-500">
                    You
                  </span>
                  <div className="max-w-[80%] rounded-xl rounded-tr-none border border-slate-700 bg-[#161b22] px-4 py-3 text-left text-sm text-slate-200 shadow-md">
                    {message.content}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-[#161b22] px-4 py-2.5 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:120ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400 [animation-delay:240ms]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* FIXED BOTTOM BAR - never scrolls */}
          <div className="flex-shrink-0 border-t border-gray-800 px-6 py-4">
            <div className="flex flex-row items-end gap-2">
              <form onSubmit={handleSend} className="flex-1 min-w-0">
                <div className="flex flex-row items-end gap-2">
                  <div className="flex-1 min-w-0 rounded-xl border border-slate-700 bg-[#161b22] px-3 py-2">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value);
                        e.target.style.height = "auto";
                        e.target.style.height = `${Math.min(e.target.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim()) {
                            (e.target as HTMLTextAreaElement).form?.requestSubmit();
                          }
                        }
                      }}
                      placeholder="Type your question or say what you'd like to understand next..."
                      className="w-full resize-none overflow-hidden border-none bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="inline-flex flex-shrink-0 items-center justify-center rounded-xl bg-[#fbbf24] px-4 py-2.5 text-sm font-bold text-[#0d1117] shadow-md shadow-[#fbbf24]/30 transition enabled:hover:bg-[#facc15] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-200"
                  >
                    {isLoading ? "Sending..." : "Send"}
                  </button>
                </div>
              </form>
              {allConceptsChecked && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem(
                        "pathwise:currentMilestone",
                        String(currentMilestoneNumber),
                      );
                    }
                    router.push("/assessment");
                  }}
                  className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-gray-900 shadow-lg shadow-amber-400/30 transition hover:bg-amber-300"
                >
                  <span>Ready to move on</span>
                  <span className="ml-1" aria-hidden>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

