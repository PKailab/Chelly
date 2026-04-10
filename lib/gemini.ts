/**
 * Google Gemini API client
 *
 * - Model: gemini-2.0-flash
 * - Streaming: Server-Sent Events (generateContentStream)
 * - API: https://ai.google.dev/api/generate-content
 */

export const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta";
export const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface GeminiStreamChunk {
  candidates?: {
    content?: { parts?: { text?: string }[]; role?: string };
    finishReason?: string;
    index?: number;
  }[];
}

/**
 * Send a streaming chat request to the Gemini API.
 */
export async function geminiChatStream(
  apiKey: string,
  systemPrompt: string,
  history: GeminiMessage[],
  userMessage: string,
  onChunk: (text: string, done: boolean) => void,
  signal?: AbortSignal,
  model: string = GEMINI_DEFAULT_MODEL,
): Promise<GeminiResult> {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Gemini API key is not set." };
  }

  const contents: GeminiMessage[] = [
    ...history.slice(-6),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const url = `${GEMINI_API_BASE}/models/${model}:streamGenerateContent?alt=sse`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timer);
        controller.abort();
      } else {
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            controller.abort();
          },
          { once: true },
        );
      }
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.7,
          topP: 0.95,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 400)
        return { success: false, error: "Invalid request. Check API key or model." };
      if (res.status === 403)
        return { success: false, error: "Invalid API key or no access." };
      if (res.status === 429)
        return { success: false, error: "Rate limited. Try again later." };
      try {
        const errJson = JSON.parse(errText);
        return {
          success: false,
          error: `HTTP ${res.status}: ${errJson?.error?.message ?? errText.slice(0, 100)}`,
        };
      } catch {
        return {
          success: false,
          error: `HTTP ${res.status}: ${errText.slice(0, 100)}`,
        };
      }
    }

    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback: no ReadableStream (React Native)
      const text = await res.text();
      let fullContent = "";
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const chunk = JSON.parse(jsonStr);
          const part =
            chunk.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (part) fullContent += part;
        } catch {}
      }
      if (!fullContent) {
        try {
          fullContent =
            JSON.parse(text).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        } catch {}
      }
      if (fullContent) {
        onChunk(fullContent, true);
        return { success: true, content: fullContent };
      }
      return { success: false, error: "Failed to parse response." };
    }

    // SSE streaming
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let finished = false;

    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") {
          if (!finished) {
            onChunk("", true);
            finished = true;
          }
          break;
        }

        try {
          const chunk = JSON.parse(jsonStr) as GeminiStreamChunk;
          const candidate = chunk.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text ?? "";
          const isDone =
            candidate?.finishReason === "STOP" ||
            candidate?.finishReason === "MAX_TOKENS";

          if (text) fullContent += text;

          if (isDone) {
            onChunk(text || "", true);
            finished = true;
            break;
          } else if (text) {
            onChunk(text, false);
          }
        } catch {}
      }
    }

    if (!finished && fullContent) {
      onChunk("", true);
    }

    return { success: true, content: fullContent };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      message.includes("abort") || message.includes("timeout");
    return {
      success: false,
      error: isTimeout ? "Request timed out." : message,
    };
  }
}
