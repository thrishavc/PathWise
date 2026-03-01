import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

type ExplanationStyle = "analogy" | "technical";
type StuckStrategy = "analogy" | "steps";
type Goal = "personal" | "deep" | "career";

type LearningProfile = {
  explanationStyle: ExplanationStyle;
  stuckStrategy: StuckStrategy;
  goal: Goal;
};

type ConversationTurn = {
  role: "ai" | "user";
  content: string;
};

type ChatRequestBody = {
  message: string;
  learningProfile?: LearningProfile;
  userName?: string;
  conversationHistory?: ConversationTurn[];
  milestoneContext?: string;
  milestoneConcepts?: string[];
};

const DEFAULT_PROFILE: LearningProfile = {
  explanationStyle: "analogy",
  stuckStrategy: "steps",
  goal: "personal",
};

function mapExplanationStyle(style: ExplanationStyle | undefined): string {
  if (style === "technical") {
    return "technical details and specifications";
  }
  return "real-world analogies and stories";
}

function mapStuckStrategy(strategy: StuckStrategy | undefined): string {
  if (strategy === "steps") {
    return "breaking things into smaller technical steps";
  }
  return "analogies connecting to familiar concepts";
}

function mapGoal(goal: Goal | undefined): string {
  if (goal === "deep") {
    return "deeply understanding the technology";
  }
  if (goal === "career") {
    return "pursuing a career in hardware or IT";
  }
  return "building their own PC";
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const message = body.message?.trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const isAssessmentGeneration = body.message?.includes(
      "Generate exactly 3 short assessment questions",
    );
    if (isAssessmentGeneration) {
      const assessmentSystemPrompt = `You are an assessment question generator. The user will tell you a topic and concepts. Generate exactly 3 questions as a raw JSON array. Return ONLY valid JSON, no markdown fences, no explanation text before or after. Format exactly:
[{"question":"...","concept":"..."},
{"question":"...","concept":"..."},
{"question":"...","concept":"..."}]`;

      if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured.");
      }
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: assessmentSystemPrompt },
          { role: "user", content: body.message },
        ],
        model: "llama-3.3-70b-versatile",
      });
      const reply =
        completion.choices[0]?.message?.content?.trim() ?? "[]";
      return NextResponse.json({ reply }, { status: 200 });
    }

    const userName = (body.userName ?? "there").trim() || "there";
    const profile = body.learningProfile ?? DEFAULT_PROFILE;
    const history = body.conversationHistory ?? [];
    const conceptsList = (body.milestoneConcepts ?? ["CPU", "GPU", "RAM", "Motherboard", "Power Supply"]).join(", ");
    const milestoneTitle = (body.milestoneContext ?? "Understanding PC Components").trim();

    const explanationStyle = mapExplanationStyle(profile.explanationStyle);
    const stuckStrategy = mapStuckStrategy(profile.stuckStrategy);
    const goal = mapGoal(profile.goal);

    const milestoneSpecificContext =
      milestoneTitle === "Choosing the Right Parts"
        ? "Focus on how to choose PC parts wisely - budget planning, compatibility between parts, performance vs price tradeoffs, AMD vs Intel/Nvidia comparisons, and warranty considerations. Use real AMD Ryzen and Radeon product examples."
        : milestoneTitle === "Assembly Basics"
          ? "Focus on the physical process of building a PC - safety precautions like anti-static, installing the motherboard, CPU, RAM, and managing cables properly."
          : milestoneTitle === "Software & OS Setup"
            ? "Focus on setting up the software side - entering BIOS, installing Windows or Linux, installing AMD drivers, running updates, and basic optimization."
            : milestoneTitle === "Troubleshooting & Optimization"
              ? "Focus on diagnosing and fixing common PC problems - overheating issues, performance bottlenecks, keeping drivers updated, and backing up data."
              : "";

    const systemPrompt = `
You are PathWise, an expert AI learning companion. You are teaching ${userName} how to build a PC from scratch.

Their learning profile:
- They understand best through: ${explanationStyle}
- When stuck they prefer: ${stuckStrategy}
- Their goal: ${goal}

Current milestone: ${milestoneTitle}

CRITICAL TEACHING RULES:

SCOPE: You are currently teaching: ${milestoneTitle}

This milestone covers EXACTLY these concepts in this order: ${conceptsList}

Do NOT teach concepts from other milestones. Only teach what is listed above for this milestone.

CONCEPT PROGRESSION:
- Teach ONE concept per response
- Start with the FIRST concept in the list only
- Only introduce the next concept after the student has engaged with the current one
- When introducing a new concept say: 'Now let us talk about [CONCEPT]...'
- After covering ALL concepts in the list, tell the student: 'You have now covered all the key concepts for this milestone! Click Ready to move on to test your understanding.'
- Never go beyond the concepts listed above

${milestoneSpecificContext ? `MILESTONE SPECIFIC CONTEXT:\n${milestoneSpecificContext}\n\n` : ""}
RESPONSE LENGTH:
- Keep each response to maximum 150 words
- Be concise but engaging
- Ask ONE question at the end of each response
- Do not write walls of text
- If the user says 'next', 'skip', 'move on' or similar, briefly acknowledge and introduce the next concept in the list

STYLE:
- Use AMD Ryzen processors as CPU examples always
- Use AMD Radeon as GPU examples always
- This is an AMD-focused learning platform
- Be warm, encouraging, conversational
- No bullet points in responses - tell it as a story
`.trim();

    const isInitialWelcome =
      message === "Begin teaching the current milestone. Start with a compelling real-world hook.";
    const effectiveMessage = isInitialWelcome
      ? `Welcome ${userName} warmly and personally by name. Tell them you are excited to start this learning journey together. Briefly mention what milestone they are starting (${milestoneTitle}) and what they will be able to do by the end of it in one sentence. Then immediately dive into teaching the first concept with a compelling real-world AMD-focused hook. Keep the entire message under 150 words.`
      : message;

    const historyText =
      history.length === 0
        ? "No previous conversation yet."
        : history
            .map((turn) => {
              const speaker = turn.role === "user" ? userName : "PathWise";
              return `${speaker}: ${turn.content}`;
            })
            .join("\n");

    const userPrompt = `
Conversation so far:
${historyText}

New user message:
${effectiveMessage}
`.trim();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    if (!process.env.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured.");
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "llama-3.3-70b-versatile",
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "";

    if (!reply) {
      return NextResponse.json(
        {
          reply:
            "I ran into a small issue generating a response. Try asking your question again.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ reply }, { status: 200 });
  } catch (error: unknown) {
    console.error("[PathWise] Chat route error:", error);

    const err = error as { status?: number; message?: string };
    if (
      err?.status === 429 ||
      err?.message?.includes("429") ||
      err?.message?.includes("rate_limit")
    ) {
      return NextResponse.json(
        {
          reply:
            "I need a short break to recharge! The learning engine has been working hard. Please wait 1-2 minutes and try again.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        error:
          "PathWise could not generate a response. Check your GROQ_API_KEY configuration and try again.",
      },
      { status: 500 },
    );
  }
}

