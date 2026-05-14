/**
 * Query-side alternative / substitute semantics (language only).
 * Used for relationship graph + ranking; no tray dependency.
 */

export type AlternativeQueryContext = {
  /** Extracted reference product / brand / vibe (may be empty). */
  anchorPhrase: string;
  wantsCheaper: boolean;
  wantsPremium: boolean;
  /** User asked for substitutes / dupes / “instead of” language. */
  wantsSubstitute: boolean;
};

function stripAnchorNoise(fragment: string): string {
  return fragment
    .replace(/\b(the|a|an|some|any|good|best|cheap|cheaper|budget|affordable|premium|luxury|real|genuine)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
}

export function parseAlternativeQueryContext(raw: string, intentEnvelope: string): AlternativeQueryContext {
  const q = raw.trim();
  const s = intentEnvelope.toLowerCase();

  const wantsCheaper =
    /\b(but\s+cheaper|cheaper\s+than|budget\s+version|affordable\s+alternative|low(er)?\s+cost|under\s+€?\d+)\b/i.test(
      q
    ) || /\b(but\s+cheaper|cheaper\s+than)\b/i.test(s);

  const wantsPremium =
    /\b(step\s+up|upgrade|premium\s+version|better\s+than|pro\s+version|flagship|max\s+spec)\b/i.test(q) ||
    /\b(step\s+up|upgrade)\b/i.test(s);

  const wantsSubstituteLex =
    /\b(alternative\s+to|instead\s+of|comparable\s+to|replacement\s+for|substitute\s+for|dupe\s+for|similar\s+to|something\s+like|same\s+as|in\s+the\s+same\s+vein)\b/i.test(
      s
    ) || /\b(airpods?|dyson|rolex|galaxy|iphone|ipad|macbook|bose|sony)\s+alternative\b/i.test(q);

  let anchorPhrase = "";

  const likeCheaper = q.match(/\blike\s+(.+?)\s+but\s+cheaper\b/i);
  if (likeCheaper?.[1]) anchorPhrase = stripAnchorNoise(likeCheaper[1]);

  if (!anchorPhrase) {
    const altTo = q.match(/\balternative\s+to\s+(.+?)(?:\s+under|\s+below|\s+for|\s*$)/i);
    if (altTo?.[1]) anchorPhrase = stripAnchorNoise(altTo[1]);
  }
  if (!anchorPhrase) {
    const sim = q.match(/\bsimilar\s+to\s+(.+?)(?:\s+under|\s+below|\s+but|\s*$)/i);
    if (sim?.[1]) anchorPhrase = stripAnchorNoise(sim[1]);
  }
  if (!anchorPhrase) {
    const inst = q.match(/\binstead\s+of\s+(.+?)(?:\s+under|\s+below|\s*$)/i);
    if (inst?.[1]) anchorPhrase = stripAnchorNoise(inst[1]);
  }
  if (!anchorPhrase) {
    const nounAlt = q.match(/\b([\w][\w\s\-]{1,42}?)\s+alternative\b/i);
    if (nounAlt?.[1] && !/^(good|best|cheap|budget|top|great)$/i.test(nounAlt[1].trim())) {
      anchorPhrase = stripAnchorNoise(nounAlt[1]);
    }
  }
  if (!anchorPhrase) {
    const comp = q.match(/\bcomparable\s+to\s+(.+?)(?:\s+under|\s*$)/i);
    if (comp?.[1]) anchorPhrase = stripAnchorNoise(comp[1]);
  }

  const wantsSubstitute = wantsSubstituteLex || wantsCheaper || wantsPremium;

  return {
    anchorPhrase,
    wantsCheaper,
    wantsPremium,
    wantsSubstitute,
  };
}

export function substituteSemanticActiveFromParts(
  alternativeSeeking: boolean,
  alt: AlternativeQueryContext,
  tasteHasLayer: boolean,
  tasteOlfactory01: number,
  tasteVisualPremium01: number,
  raw: string
): boolean {
  const catCue = /\b(perfume|fragrance|parfum|bag|watch|desk|setup|shoe|sneaker|headphone|laptop|phone)\b/i.test(
    raw
  );
  const tasteCue =
    tasteHasLayer &&
    catCue &&
    (tasteOlfactory01 >= 0.38 || tasteVisualPremium01 >= 0.42 || (alt.anchorPhrase.length >= 2 && alt.wantsSubstitute));

  return (
    alternativeSeeking ||
    (alt.anchorPhrase.length >= 2 && (alt.wantsCheaper || alt.wantsPremium || alt.wantsSubstitute)) ||
    tasteCue
  );
}