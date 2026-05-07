import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { question, products } = await req.json();

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `
You are QuantAI, a smart shopping assistant.

User question:
${question}

Products:
${JSON.stringify(products, null, 2)}

Give a short, clear shopping recommendation.
Focus on price, value, store trust, and alternatives.
`,
    });

    return NextResponse.json({
      reply: "OPENAI WORKING SUCCESSFULLY",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
  reply: String(error),
});

    
  }
}