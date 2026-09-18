# Task 05 - durable classification and deterministic fallback

Status: implemented and verified on 17 September 2026.

## Scope

Task 05 adds the first reliable classification pipeline without making an
external AI provider a prerequisite for reporting. A newly submitted report is
stored first, then receives one durable classification job. The current rules
provider produces a category, priority, summary, and keyword signals. A future
provider can replace the rules implementation behind the same job/result
records.

## Backend deliverables

- `ClassificationJob` records are unique per submission and track pending,
  running, completed, or failed work, attempts, timestamps, and the last error.
- `ClassificationResult` records are unique per job and preserve the provider,
  classification output, and matched signals.
- The submission preview endpoint and durable job use the same deterministic
  classifier, so users see consistent suggestions before and after submission.
- Classification runs after a report is created. Provider or job failures mark
  analysis as failed while keeping the submitted report available for review.
- Repeated job creation reuses the original job, and repeated processing does
  not create duplicate results. A failed job can be retried after its provider
  is available.

## Safety and permission rules

- Classification never blocks creation of a citizen report.
- The rules provider does not receive private attachments or expose private
  report data; it uses the submitted title, description, and domain.
- Results are stored server-side and are suggestions for later moderation and
  routing. They do not automatically assign a university or change workflow
  status.
- No external AI credentials or network calls are required by this task.

## Verification

- Labeled fixtures cover infrastructure, public-services, and community cases.
- Tests prove fixture matching, idempotent job creation, one-result behavior,
  analysis completion, safe provider failure, report preservation, and retry.
- Backend build, lint, and the complete Vitest suite must pass.

Next task: Task 06, candidate matching and administrator-controlled routing.
