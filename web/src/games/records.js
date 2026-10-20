import { summarize as agentTown } from "./agent-town/record.js";
import { summarize as halluDetective } from "./hallu-detective/record.js";
import { summarize as lightFlip } from "./light-flip/record.js";
import { summarize as patternChallenge } from "./pattern-challenge/record.js";
import { summarize as promptFortress } from "./prompt-fortress/record.js";
import { summarize as tinyIsle } from "./tiny-isle/record.js";

export const summarizers = {
  "pattern-challenge": patternChallenge,
  "light-flip": lightFlip,
  "tiny-isle": tinyIsle,
  "agent-town": agentTown,
  "hallu-detective": halluDetective,
  "prompt-fortress": promptFortress,
};