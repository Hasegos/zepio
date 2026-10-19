import { summarize as colorClash } from "./color-clash/record.js";
import { summarize as memorySequence } from "./memory-sequence/record.js";
import { summarize as patternChallenge } from "./pattern-challenge/record.js";

export const summarizers = {
  "pattern-challenge": patternChallenge,
  "memory-sequence": memorySequence,
  "color-clash": colorClash,
};