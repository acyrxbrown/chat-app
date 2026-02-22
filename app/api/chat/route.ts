import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a helpful AI assistant in a chat app. Keep responses concise and friendly. If the user is asking for an image or video generation (they may tag @diffussion-photo or @diffussion-video), acknowledge briefly—the actual generation happens separately.`;

export async function POST(request: Request) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages } = body as { messages: { role: string; content: string }[] };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages array required" },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      contents,
    });

    const text = response.text?.trim();
    if (!text) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: text });
  } catch (e) {
    console.error("Chat API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chat failed" },
      { status: 500 }
    );
  }
}
