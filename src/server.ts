import express, { Request, Response } from "express";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a professional video director and screenwriter. When given a concept or description, generate a detailed video production script.

Your output must be structured as follows:

## Video Title
[Compelling title]

## Overview
[2-3 sentence summary of the video concept, target audience, and tone]

## Production Details
- **Duration**: [estimated length, e.g., "2:30 minutes"]
- **Style**: [e.g., "Documentary", "Narrative", "Tutorial", "Commercial", "Short Film"]
- **Tone**: [e.g., "Inspirational", "Humorous", "Dramatic", "Educational"]
- **Target Audience**: [description]

## Scene Breakdown

### Scene 1: [Scene Title]
- **Duration**: [e.g., "0:00 - 0:15"]
- **Location/Setting**: [description]
- **Shot Type**: [e.g., "Wide establishing shot", "Close-up", "Tracking shot"]
- **Visual Description**: [what the camera sees]
- **Audio**: [music, sound effects, voiceover or dialogue]
- **On-screen Text**: [any text overlays, if applicable]

[Continue with all scenes...]

## Visual Style Guide
- **Color Palette**: [describe the color theme]
- **Cinematography Style**: [e.g., "Handheld for intimacy", "Steady for professionalism"]
- **Lighting**: [e.g., "Natural golden hour", "High-contrast studio"]
- **Transitions**: [e.g., "Smooth cuts", "Fades", "Whip pans"]

## Music & Sound Design
- **Background Music**: [genre, mood, suggested tracks or style]
- **Sound Effects**: [key sound design elements]
- **Voiceover**: [tone, pacing, key phrases if applicable]

## Post-Production Notes
- **VFX/Graphics**: [any special effects or motion graphics needed]
- **Text Animations**: [font style, animation style]
- **Color Grade**: [post-production color treatment]

Be creative, specific, and professional. Make the script production-ready.`;

interface GenerateRequest {
  prompt: string;
  style?: string;
  duration?: string;
}

app.post("/api/generate", async (req: Request, res: Response) => {
  const { prompt, style, duration } = req.body as GenerateRequest;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  if (prompt.trim().length > 2000) {
    res.status(400).json({ error: "Prompt must be 2000 characters or less" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const userMessage = [
    `Create a detailed video production script for the following concept:`,
    ``,
    `**Concept**: ${prompt.trim()}`,
    style ? `**Preferred Style**: ${style}` : null,
    duration ? `**Target Duration**: ${duration}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 64000,
      thinking: { type: "adaptive" },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const data = JSON.stringify({ text: event.delta.text });
        res.write(`data: ${data}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      res.write(
        `data: ${JSON.stringify({ error: "Invalid API key. Please set ANTHROPIC_API_KEY environment variable." })}\n\n`
      );
    } else if (error instanceof Anthropic.RateLimitError) {
      res.write(
        `data: ${JSON.stringify({ error: "Rate limit reached. Please try again in a moment." })}\n\n`
      );
    } else if (error instanceof Anthropic.APIError) {
      res.write(
        `data: ${JSON.stringify({ error: `API error: ${error.message}` })}\n\n`
      );
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "An unexpected error occurred." })}\n\n`
      );
    }
    res.end();
  }
});

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`🎬 Gen Video Web App running at http://localhost:${PORT}`);
});
