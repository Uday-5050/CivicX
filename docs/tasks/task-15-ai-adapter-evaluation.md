# Task 15 - configurable AI adapter and evaluation

Status: implemented and verified on 17 September 2026.

## Scope

Task 15 replaces the old mock-only adapter with an optional server-side
OpenAI-compatible provider while retaining the deterministic rules classifier
as the default and fallback. No client receives provider credentials, and no
AI result directly changes workflow state.

## Backend deliverables

- `server/backend/src/adapters/ai/` now exposes deterministic classification,
  strict classification-output parsing, sensitive-text redaction, and an
  OpenAI-compatible JSON provider.
- `AI_PROVIDER=mock` keeps local development deterministic. `AI_PROVIDER=rules`
  selects the local baseline explicitly. `AI_PROVIDER=openai-compatible` uses
  `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_MS`, and
  `AI_MAX_INPUT_CHARS` from the backend environment.
- Classification jobs select the configured provider by default. Provider
  errors or invalid output are recorded as a warning and complete with a
  `rules-fallback` result. The explicit `failing` test provider remains a hard
  failure sentinel for retry tests.
- Remote requests redact email addresses, phone numbers, and URLs and cap the
  combined input length. Responses must match the bounded category, priority,
  summary, and signals schema.

## Evaluation and safeguards

- The existing labeled fixtures remain the baseline evaluation set for the
  rules classifier.
- Tests prove invalid provider output is rejected, private contact text is
  redacted, unavailable providers fall back without losing the report, and the
  original durable failure/retry path remains intact.
- AI remains advisory. It cannot reject, merge, route, resolve, or advance a
  submission or project.

## Configuration example

```text
AI_PROVIDER=openai-compatible
AI_API_URL=https://provider.example/v1/chat/completions
AI_API_KEY=stored-only-in-server-env
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=12000
AI_MAX_INPUT_CHARS=6000
```

Next task: Task 16, full browser/phone regression, migration rehearsal, and
demo guide.
