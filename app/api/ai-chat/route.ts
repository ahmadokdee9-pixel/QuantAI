import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { extractResponsesApiText } from "@/lib/openai-response-text";
import { aiChatRatelimit, enforceLimit } from "@/lib/rate-limit";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { reply: "", error: "Sign in to use the AI assistant." },
        { status: 401 }
      );
    }

    const limited = await enforceLimit(aiChatRatelimit, userId);
    if (!limited.ok) {
      return NextResponse.json(
        {
          reply: "",
          error: "Too many AI requests. Try again later.",
          retryAfter: limited.retryAfter,
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfter) },
        }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { reply: "", error: "AI assistant is not configured." },
        { status: 503 }
      );
    }

    const { question, products } = await req.json();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are QuantAI, a smart shopping assistant.

User question:
${String(question ?? "")}

Products:
${JSON.stringify(products ?? [], null, 2)}

Give a short, clear shopping recommendation.
Focus on price, value, store trust, and alternatives.
`,
    });

    const reply =
      extractResponsesApiText(response) ||
      "QuantAI could not produce a text reply for this request.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        reply: "",
        error: "QuantAI could not analyze this request.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
