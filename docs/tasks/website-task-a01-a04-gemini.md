# Website AI tasks A01-A04 — Gemini classification

Status: implemented locally on 18 September 2026; live provider verification awaits a valid key and available project quota.

## Delivered

- Selected `gemini-3.5-flash-lite` through Google's OpenAI-compatible chat-completions endpoint.
- Kept the API key exclusively in backend environment configuration and exposed only safe provider/model readiness to administrators.
- Added strict structured-output validation, shared category bounds, input truncation, contact redaction and an instruction-injection-resistant system prompt.
- Changed saved report analysis to an asynchronous durable job. The report request returns before a remote provider call.
- Added a worker with leases, abandoned-job recovery, capped transient retries and rules fallback for unavailable or invalid remote output.
- Stored requested/actual provider, model, prompt version, input hash, duration, fallback code and revision history.
- Added owner-safe analysis polling and administrator analysis history/retry APIs. The website distinguishes pending, processing, completed, fallback and failed states.
- Kept the draft preview local so typing and page refreshes never spend Gemini quota.
- Expanded the deterministic evaluation fixtures with Hindi cases and added a mocked Gemini outbound-contract test.

## Remaining live gate

Add a valid key to `server/backend/.env`, ensure the Google AI project has available quota, restart the backend, submit one synthetic report and record the provider result, latency and fallback behavior. Do not claim Gemini quality from mocked calls. The screenshot supplied for this task shows the project currently reporting a reached rate limit, so CivicX must remain on `AI_PROVIDER=rules` until quota is available.
