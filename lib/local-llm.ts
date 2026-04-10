/**
 * Local LLM (Ollama / llama-server) API client
 *
 * Supports both:
 * - Ollama: /api/chat (NDJSON streaming)
 * - llama-server: /v1/chat/completions (OpenAI-compatible SSE)
 *
 * Auto-detects API type based on port (:11434 = Ollama, :8080 = OpenAI).
 */

// ---- Types ----

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LocalLlmResult {
  success: boolean;
  content?: string;
  error?: string;
}

interface OllamaStreamChunk {
  model: string;
  message: { role: string; content: string };
  done: boolean;
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}

// ---- API detection ----

type ApiType = "openai" | "ollama";

function detectApiType(baseUrl: string): ApiType {
  if (baseUrl.includes(":8080")) return "openai";
  if (baseUrl.includes(":11434")) return "ollama";
  return "openai";
}

// ---- Connection check ----

export async function checkConnection(
  baseUrl: string,
): Promise<{ available: boolean; models: string[]; error?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const apiType = detectApiType(baseUrl);

    if (apiType === "openai") {
      const res = await fetch(`${baseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok)
        return { available: false, models: [], error: `HTTP ${res.status}` };
      try {
        const modelsRes = await fetch(`${baseUrl}/v1/models`, {
          signal: controller.signal,
        });
        if (modelsRes.ok) {
          const data = await modelsRes.json();
          return {
            available: true,
            models: (data.data ?? []).map((m: { id: string }) => m.id),
          };
        }
      } catch {}
      return { available: true, models: [] };
    } else {
      const res = await fetch(`${baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok)
        return { available: false, models: [], error: `HTTP ${res.status}` };
      const data = await res.json();
      return {
        available: true,
        models: (data.models ?? []).map((m: { name: string }) => m.name),
      };
    }
  } catch (err) {
    return {
      available: false,
      models: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ---- Streaming chat ----

/**
 * Send a streaming chat request to a local LLM server.
 */
export async function ollamaChatStream(
  url: string,
  model: string,
  systemPrompt: string,
  history: OllamaMessage[],
  onChunk: (text: string, done: boolean) => void,
  signal?: AbortSignal,
  timeoutMs = 120000,
): Promise<LocalLlmResult> {
  const apiType = detectApiType(url);

  const messages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  let endpoint: string;
  let body: string;

  if (apiType === "openai") {
    endpoint = `${url}/v1/chat/completions`;
    body = JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });
  } else {
    endpoint = `${url}/api/chat`;
    body = JSON.stringify({
      model,
      messages,
      stream: true,
      options: { temperature: 0.7, num_predict: 2048 },
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
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

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      clearTimeout(timer);
      return {
        success: false,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      clearTimeout(timer);
      // Fallback: no ReadableStream
      const text = await res.text();
      let fullContent = "";
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          const content =
            json.message?.content ??
            json.choices?.[0]?.delta?.content ??
            json.choices?.[0]?.message?.content ??
            "";
          if (content) fullContent += content;
        } catch {}
      }
      if (fullContent) {
        onChunk(fullContent, true);
        return { success: true, content: fullContent };
      }
      return { success: false, error: "Failed to parse response." };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (apiType === "openai") {
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (jsonStr === "[DONE]") {
              onChunk("", true);
              return { success: true, content: fullContent };
            }
            try {
              const chunk = JSON.parse(jsonStr) as OpenAIStreamChunk;
              const content = chunk.choices?.[0]?.delta?.content ?? "";
              const isDone = chunk.choices?.[0]?.finish_reason === "stop";
              if (content) {
                fullContent += content;
                onChunk(content, isDone);
              } else if (isDone) {
                onChunk("", true);
              }
            } catch {}
          } else {
            try {
              const chunk = JSON.parse(trimmed) as OllamaStreamChunk;
              if (chunk.message?.content) {
                fullContent += chunk.message.content;
              }
              onChunk(chunk.message?.content ?? "", chunk.done);
            } catch {}
          }
        }
      }
    } finally {
      clearTimeout(timer);
    }

    return { success: true, content: fullContent };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      message.includes("abort") || message.includes("timeout");
    return {
      success: false,
      error: isTimeout ? "Timeout. The model may be too large." : message,
    };
  }
}
