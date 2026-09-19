import { afterEach, describe, expect, it, vi } from "vitest";
import { parseVoiceReportDraft } from "../src/adapters/ai";
import config from "../src/config";

const gemini = vi.hoisted(() => ({ upload: vi.fn(), transcribe: vi.fn(), delete: vi.fn() }));
vi.mock("@google/genai", () => ({ GoogleGenAI: class { files = { upload: gemini.upload, delete: gemini.delete }; interactions = { create: gemini.transcribe }; } }));

import { buildVoiceReportDraft } from "../src/modules/submissions/voice-report.service";

const originalConfig = { aiApiKey: config.aiApiKey, aiApiUrl: config.aiApiUrl, aiModel: config.aiModel };
const originalFetch = globalThis.fetch;

afterEach(() => {
  Object.assign(config, originalConfig);
  globalThis.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("Citizen voice report draft", () => {
  it("accepts a schema-compliant multilingual report draft", () => {
    expect(parseVoiceReportDraft({
      languageCode: "hi-IN",
      languageName: "Hindi",
      title: "स्कूल के पास टूटी स्ट्रीट लाइट",
      description: "स्कूल के पास स्ट्रीट लाइट काम नहीं कर रही है और रात में सड़क असुरक्षित हो जाती है।",
      domain: "infrastructure",
    })).toMatchObject({ languageCode: "hi-IN", domain: "infrastructure" });
  });

  it("rejects unknown domains and underspecified descriptions", () => {
    expect(() => parseVoiceReportDraft({ languageCode: "en-IN", languageName: "English", title: "Road", description: "Too short", domain: "made-up" })).toThrow();
  });

  it("transcribes, generates a validated draft, and deletes the temporary provider file", async () => {
    Object.assign(config, { aiApiKey: "test-key", aiApiUrl: "https://provider.test/chat/completions", aiModel: "gemini-flash-test" });
    gemini.upload.mockResolvedValue({ name: "files/temporary-audio", uri: "https://provider.test/files/audio", mimeType: "audio/webm" });
    gemini.transcribe.mockResolvedValue({ output_text: "There is a broken streetlight beside the school gate and the road is unsafe after dark." });
    gemini.delete.mockResolvedValue({});
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ languageCode: "en-IN", languageName: "English", title: "Broken streetlight beside school", description: "The streetlight beside the school gate is broken, making the road unsafe after dark.", domain: "infrastructure" }) } }] }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;

    const result = await buildVoiceReportDraft({
      fieldname: "audio", originalname: "report.webm", encoding: "7bit", mimetype: "audio/webm", size: 4,
      destination: "", filename: "", path: "", buffer: Buffer.from("voice"), stream: undefined as never,
    });

    expect(result.title).toBe("Broken streetlight beside school");
    expect(gemini.transcribe).toHaveBeenCalledWith(expect.objectContaining({ model: config.voiceTranscriptionModel }));
    expect(gemini.delete).toHaveBeenCalledWith({ name: "files/temporary-audio" });
  });
});
