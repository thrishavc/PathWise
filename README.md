# PathWise AI

> Adaptive AI-powered learning platform that teaches you 
> how to build a PC from scratch — personalized to how 
> your brain works, built with AMD hardware as the core 
> teaching example.

## What is PathWise?

PathWise is an AI tutor that learns how YOU learn. 
Instead of generic video courses, PathWise has a 
3-question onboarding that builds your learning profile, 
then adapts every lesson — analogies, depth, pacing — 
to match your style.

Built for the AMD Slingshot Hackathon 2026.

## Features

- Adaptive AI Teaching — personalized to your learning style
- AMD-First Curriculum — Ryzen, Radeon, and AMD ecosystem throughout
- 5 Progressive Milestones — Understanding → Choosing → Assembly → Software → Troubleshooting
- Voice Mode — full speech-to-speech interface
- AI-Evaluated Assessments — after every milestone
- Gamified Completion — XP, accuracy, time tracking

## Tech Stack

- Frontend: Next.js 14, TypeScript, Tailwind CSS
- AI: Groq API (llama-3.3-70b-versatile)
- Voice: Web Speech API
- Storage: localStorage

## Getting Started

1. Clone the repo
   git clone https://github.com/thrishavc/PathWise.git

2. Install dependencies
   npm install

3. Add your Groq API key
   Create a .env.local file:
   GROQ_API_KEY=your_groq_api_key_here

4. Run the app
   npm run dev

5. Open http://localhost:3000

## Project Structure

src/app/
├── page.tsx          # Welcome screen
├── onboarding/       # Learning profile setup
├── learn/            # AI teaching interface
├── assessment/       # Milestone quizzes
├── complete/         # Milestone completion
└── api/chat/         # Groq AI backend

## Team

Built by Thrisha V C and Radhe for AMD Slingshot 2026.
