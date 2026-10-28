// Plan Task 14c · `const { run, prompt } = useStepUp()`.
//
//   const out = await run((headers) => api.post("/me/password", body, { headers }));
//   ...
//   return (<View>…{prompt}</View>);
//
// `run` is runWithStepUp (src/stepUp.ts) with the prompt wired in: it makes the call, and if the server wants a
// proof it shows `prompt`, trades the typed code for a token, and retries once with `X-Step-Up`. Render
// `{prompt}` anywhere in the screen; it is null until a proof is actually needed.
import { ReactElement, useCallback, useState } from "react";

import { ApiResult } from "../api/client";
import { useApi } from "../api/useApi";
import { StepUpPrompt } from "../components/StepUpPrompt";
import { STEP_UP_HEADER, StepUpOutcome, runWithStepUp } from "../stepUp";

export type StepUpCall = (headers: Record<string, string> | undefined) => Promise<ApiResult>;

export function useStepUp(): { run: (call: StepUpCall) => Promise<StepUpOutcome>; prompt: ReactElement | null } {
  const api = useApi();
  const [asking, setAsking] = useState<{ sentTo: string; settle: (token: string | null) => void } | null>(null);

  const run = useCallback((call: StepUpCall) => runWithStepUp({
    api,
    call: (token) => call(token ? { [STEP_UP_HEADER]: token } : undefined),
    ask: (sentTo) => new Promise<string | null>((resolve) => setAsking({ sentTo, settle: resolve })),
  }), [api]);

  const prompt = asking ? (
    <StepUpPrompt
      sentTo={asking.sentTo}
      onToken={(token) => { asking.settle(token); setAsking(null); }}
      onCancel={() => { asking.settle(null); setAsking(null); }}
    />
  ) : null;

  return { run, prompt };
}
