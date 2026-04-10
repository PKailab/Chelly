/**
 * Cerebras API client
 *
 * - Model: qwen-3-235b-a22b-instruct-2507 (OpenAI-compatible API)
 * - Free tier: 30 RPM, 60K TPM, 1M tokens/day
 * - API: https://inference-docs.cerebras.ai
 */

export const CEREBRAS_API_BASE = "https://api.cerebras.ai/v1";
export const CEREBRAS_DEFAULT_MODEL = "qwen-3-235b-a22b-instruct-2507";

export interface CerebrasMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CerebrasResult {
  success: boolean;
  content?: string;
  error?: string;
  networkError?: boolean;
}

interface CerebrasStreamDelta {
  choices?: Array<{
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

function isNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return (
    message.includes("abort") ||
    message.includes("timeout") ||
    message.includes("Network request failed") ||
    message.includes("Failed to fetch")
  );
}

/**
 * Send a streaming chat request to Cerebras API.
 */
export async function cerebrasChatStream(
  apiKey: string,
  systemPrompt: string,
  history: CerebrasMessage[],
  userMessage: string,
  onChunk: (text: string, done: boolean) => void,
  signal?: AbortSignal,
  model: string = CEREBRAS_DEFAULT_MODEL,
): Promise<CerebrasResult> {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Cerebras API key is not set." };
  }

  const messages: CerebrasMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6),
    { role: "user", content: userMessage },
  ];

  const url = `${CEREBRAS_API_BASE}/chat/completions`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
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
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_completion_tokens: 2048,
        temperature: 0.7,
        top_p: 0.95,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401)
        return { success: false, error: "Invalid Cerebras API key." };
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
      // Fallback: no ReadableStream
      const text = await res.text();
      let fullContent = "";
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const chunk = JSON.parse(jsonStr);
          const content =
            chunk.choices?.[0]?.delta?.content ??
            chunk.choices?.[0]?.message?.content ??
            "";
          if (content) fullContent += content;
        } catch {}
      }
      if (fullContent) {
        onChunk(fullContent, true);
        return { success: true, content: fullContent };
      }
      try {
        const json = JSON.parse(text);
        const content = json.choices?.[0]?.message?.content ?? "";
        if (content) {
          onChunk(content, true);
          return { success: true, content };
        }
      } catch {}
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
          const chunk = JSON.parse(jsonStr) as CerebrasStreamDelta;
          const choice = chunk.choices?.[0];
          const text = choice?.delta?.content ?? "";
          const isDone =
            choice?.finish_reason === "stop" ||
            choice?.finish_reason === "length";

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
    return {
      success: false,
      error: isNetworkError(err)
        ? "Offline. Check network connection."
        : message,
      networkError: isNetworkError(err),
    };
  }
}
