import { z } from "zod";

const OptionSchema = z
  .object({
    title: z.string().max(240),
    link: z.string().max(2000),
    reason: z.string().max(360),
  })
  .nullable();

export const CopilotStructuredSchema = z.object({
  finalRecommendation: z.string().max(900),
  bestOption: OptionSchema,
  avoidOption: OptionSchema,
  budgetPick: OptionSchema,
  premiumPick: OptionSchema,
  riskWarnings: z.array(z.string().max(280)).max(8),
  comparisonSummary: z.string().max(700),
  nextAction: z.string().max(280),
});

export type CopilotStructuredResponse = z.infer<typeof CopilotStructuredSchema>;

export function emptyStructured(fallback: string): CopilotStructuredResponse {
  return {
    finalRecommendation: fallback,
    bestOption: null,
    avoidOption: null,
    budgetPick: null,
    premiumPick: null,
    riskWarnings: [],
    comparisonSummary: "Not enough QuantAI listing data in this session to compare.",
    nextAction: "Run a product search on the home page, then ask again.",
  };
}
