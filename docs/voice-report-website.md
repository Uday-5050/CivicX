# Citizen voice reports — website implementation

Status: website implementation in progress  
Scope: React citizen report form and Express API  
Mobile: explicitly deferred until the website flow is verified

## 1. Goal

A signed-in citizen can speak a civic concern instead of typing a title and description. CivicX turns the recording into an editable report draft, suggests a category, and keeps the existing location, optional photo/video evidence, review, and explicit confirmation steps.

Voice processing never creates or submits a report by itself.

## 2. Citizen experience

1. Open **Raise a civic report** and choose **Start voice recording**.
2. Grant microphone access and speak for up to two minutes in a supported language.
3. Stop and play back the recording. The citizen may delete and re-record it.
4. Choose **Create report from voice**.
5. CivicX displays the detected language and fills the title, description, and category.
6. The citizen can inspect the transcript and edit every generated field.
7. The citizen adds a required location and may add up to five existing photo, video, or document attachments.
8. The existing review screen is shown. Nothing is submitted until **Confirm and submit** is selected.

Typing remains available when the browser has no recording support, microphone permission is denied, or the AI service is unavailable.

## 3. Architecture

```text
Browser MediaRecorder
        |
        | multipart/form-data: audio
        v
POST /api/submissions/voice-draft
        |
        | citizen authentication + MIME/15 MB validation
        v
Gemini Files -> gemini-3.5-transcribe (smart mode)
        |
        | transcript; automatic language handling
        v
Existing Gemini Flash-Lite structured-output adapter
        |
        | Zod-validated JSON
        v
transcript + language + title + description + domain
        |
        v
Editable website form -> existing POST /api/submissions
```

The transcription and report-generation calls are deliberately separate. The transcription model handles speech recognition; the text model is constrained to the CivicX report schema.

## 4. API contract

`POST /api/submissions/voice-draft`

- Authentication: bearer access token and citizen role.
- Content type: `multipart/form-data`.
- Field: `audio` containing one recording.
- Accepted types: WebM, OGG, MP3/MPEG, M4A/MP4, WAV, or AAC.
- Maximum upload: 15 MB.
- The endpoint creates a draft only. It does not write a `Submission` record.

Successful response data:

```json
{
  "transcript": "There is a broken streetlight near the school...",
  "languageCode": "en-IN",
  "languageName": "English",
  "title": "Broken streetlight near the school",
  "description": "The streetlight near the school is not working and the road becomes unsafe after dark.",
  "domain": "infrastructure"
}
```

Allowed domain values are `infrastructure`, `safety`, `environment`, `transportation`, `community`, `education`, `health`, `governance`, and `other`.

The OpenAPI operation is recorded in `docs/openapi.yaml`.

## 5. AI behavior

### Transcription

- Model: `VOICE_TRANSCRIPTION_MODEL`, default `gemini-3.5-transcribe`.
- Mode: smart transcription for punctuation, readable formatting, and removal of common disfluencies.
- Language hints are empty so the transcription service can identify the language and handle code-switching.

### Draft generation

- Model: existing `AI_MODEL` through the configured Gemini OpenAI-compatible endpoint.
- Output is constrained to a JSON schema and validated again with Zod.
- Title length: 3–120 characters.
- Description length: 20–2,000 characters.
- Title and description remain in the citizen's detected language.
- The prompt requires the model to preserve uncertainty and prohibits invented facts.
- Transcript instructions are treated as untrusted content.
- Obvious email addresses, phone numbers, and URLs are redacted before the transcript is sent to the drafting model.

## 6. Privacy and retention

- The browser keeps the recording in memory only for playback and processing.
- CivicX does not save raw audio in MongoDB or Cloudinary.
- The audio is uploaded temporarily to Gemini Files for transcription.
- The backend attempts to delete that temporary provider file in a `finally` block after success or failure.
- If provider deletion fails, CivicX logs the failure; provider-side retention policies still apply.
- The returned transcript is visible to the citizen but is not included in the final submission payload.
- Photos and videos continue through the existing attachment system and are independent of the voice recording.

## 7. Configuration

The existing `AI_API_KEY`, `AI_API_URL`, and `AI_MODEL` settings remain required. Two voice settings are added:

```env
VOICE_TRANSCRIPTION_MODEL=gemini-3.5-transcribe
VOICE_MAX_BYTES=15728640
```

`AI_API_KEY` is used server-side only. It must never be exposed through a `VITE_` variable or sent to the browser.

## 8. Error behavior

- Unsupported browser: typing remains available.
- Microphone denied or unavailable: explain how to retry; typing remains available.
- No captured audio: ask the citizen to record again.
- Unclear/very short speech: return HTTP 400 with a re-record message.
- Invalid format or oversized audio: return HTTP 400.
- Missing AI configuration: return HTTP 503.
- Provider/transcription failure: return HTTP 502 without creating a report.
- Generated fields remain editable, and the citizen always confirms submission.

## 9. Limits and deliberate decisions

- Website recording duration is capped at two minutes; the server additionally enforces 15 MB.
- The generated draft is not cached or persisted in this phase.
- The voice transcript is not an evidence attachment.
- Automatic submission is prohibited.
- Location stays required because a spoken landmark may be ambiguous and CivicX needs a normalized location.
- This phase does not change the Flutter app. Mobile implementation follows after browser testing and will use native microphone permissions and the same backend endpoint.

## 10. Verification checklist

- [ ] Chrome/Edge microphone permission, record, stop, playback, and re-record.
- [ ] Two-minute automatic stop.
- [ ] English, Hindi, and mixed Hindi/English recordings.
- [ ] Generated title, description, category, and language display.
- [ ] Citizen edits generated fields before review.
- [ ] Location remains required.
- [ ] Optional photo and video uploads still work with a voice-generated draft.
- [ ] No report exists before confirmation.
- [ ] Non-citizen and unauthenticated access is rejected.
- [ ] Invalid/oversized audio is rejected.
- [ ] Temporary provider file deletion is attempted on success and failure.
- [ ] Website and backend builds, tests, and lint pass after unrelated working-tree build failures are resolved.

### Verification performed during implementation

- Focused TypeScript compilation passes for the new backend adapter, configuration, upload middleware, and voice service.
- Focused TypeScript compilation passes for the website API and submission screen.
- ESLint passes for all changed backend source and voice test files.
- Website test suite passes: 17/17 tests, including the new multipart voice-draft contract test.
- Full website and backend production builds currently stop on pre-existing government/institution changes elsewhere in the working tree. The failures are unrelated to the voice-report files and are intentionally not modified by this work.
- The backend Vitest process is blocked in the current Codex sandbox while resolving its configuration above the repository. The voice draft schema test is included and should run normally in the repository's standard local environment.

Before public release, add endpoint-level rate limiting/quotas and validate the flow against the configured Gemini account with synthetic recordings. Do not use citizen production recordings for development tests.

## 11. Files introduced or changed

- `client/src/components/Submissions/SubmissionWorkspace.tsx`
- `client/src/components/Submissions/SubmissionWorkspace.css`
- `client/src/api/submissions.api.ts`
- `server/backend/src/modules/submissions/voice-upload.middleware.ts`
- `server/backend/src/modules/submissions/voice-report.service.ts`
- `server/backend/src/modules/submissions/submission.routes.ts`
- `server/backend/src/adapters/ai/index.ts`
- `server/backend/src/config/index.ts`
- `server/backend/.env.example`
- `server/backend/package.json` and lockfile
- `docs/openapi.yaml`
- `docs/voice-report-website.md`

## 12. Provider references

- Gemini audio transcription: <https://ai.google.dev/gemini-api/docs/transcribe>
- Gemini structured outputs: <https://ai.google.dev/gemini-api/docs/structured-output>
