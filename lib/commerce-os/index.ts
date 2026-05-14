/**
 * QuantAI Commerce OS — public surface.
 *
 * Intent: a portable semantic + intent layer between natural language and ranking/trust
 * pipelines. Not a UI module; not a chatbot. Evolves toward universal commerce cognition
 * (verticals, taste, trust, deals) without breaking existing tray contracts.
 */

export type { UniversalIntentFlags } from "./intentFlags";
export { detectUniversalIntentFlags } from "./intentFlags";
export { expandCommerceSemantics } from "./semanticExpand";
export type { UniversalCommerceContextDTO } from "./universalContext";
export { buildUniversalCommerceContext } from "./universalContext";
