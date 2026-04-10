/**
 * Perplexity Sonar API client
 *
 * - Model: sonar-reasoning-pro (Chain of Thought + citations)
 * - Streaming: SSE (OpenAI-compatible)
 * - API: https://docs.perplexity.ai/docs/sonar/quickstart
 */

export const PERPLEXITY_API_BASE = "https://api.perplexity.ai";
export const PERPLEXITY_DEFAULT_MODEL = "sonar-reasoning-pro";
export const PERPLEXITY_FAST_MODEL = "sonar";

export interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface PerplexityCitation {
  url: string;
  title?: string;
}

export interface PerplexityResult {
  success: boolean;
  content?: string;
  citations?: PerplexityCitation[];
  error?: string;
}

interface PerplexityStreamChunk {
  id: string;
  model: string;
  object: string;
  choices: {
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }[];
  citations?: string[];
}

/**
 * Send a streaming search request to Perplexity Sonar API.
 */
export async function perplexitySearchStream(
  apiKey: string,
  systemPrompt: string,
  history: PerplexityMessage[],
  query: string,
  onChunk: (
    text: string,
    done: boolean,
    citations?: PerplexityCitation[],
  ) => void,
  signal?: AbortSignal,
  model: string = PERPLEXITY_DEFAULT_MODEL,
): Promise<PerplexityResult> {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Perplexity API key is not set." };
  }

  const messages: PerplexityMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: query },
  ];

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

    const res = await fetch(`${PERPLEXITY_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.2,
        return_citations: true,
        return_related_questions: false,
        search_recency_filter: "month",
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401)
        return { success: false, error: "Invalid Perplexity API key." };
      if (res.status === 429)
        return { success: false, error: "Rate limited. Try again later." };
      return {
        success: false,
        error: `HTTP ${res.status}: ${errText.slice(0, 100)}`,
      };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      return { success: false, error: "ReadableStream not available." };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let finalCitations: PerplexityCitation[] = [];
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
            onChunk("", true, finalCitations);
            finished = true;
          }
          break;
        }

        try {
          const chunk = JSON.parse(jsonStr) as PerplexityStreamChunk;
          const content = chunk.choices?.[0]?.delta?.content ?? "";
          const isDone = chunk.choices?.[0]?.finish_reason === "stop";

          if (chunk.citations && chunk.citations.length > 0) {
            finalCitations = chunk.citations.map((url, i) => ({
              url,
              title: `[${i + 1}] ${url}`,
            }));
          }

          if (content) fullContent += content;

          if (isDone) {
            onChunk(content || "", true, finalCitations);
            finished = true;
            break;
          } else if (content) {
            onChunk(content, false);
          }
        } catch {}
      }
    }

    return { success: true, content: fullContent, citations: finalCitations };
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
