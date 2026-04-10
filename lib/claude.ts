/**
 * Claude (Anthropic) API client
 *
 * - Model: claude-sonnet-4-6-20250514
 * - Streaming: Server-Sent Events
 * - API: https://docs.anthropic.com/en/api/messages
 */

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

export interface ClaudeResult {
  success: boolean;
  content?: string;
  error?: string;
}

export async function claudeChatStream(
  apiKey: string,
  systemPrompt: string,
  messages: ClaudeMessage[],
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<ClaudeResult> {
  if (!apiKey || apiKey.trim() === "") {
    return { success: false, error: "Claude API key is not set." };
  }

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

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        stream: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 401)
        return { success: false, error: "Invalid API key." };
      if (res.status === 429)
        return { success: false, error: "Rate limited. Try again later." };
      return {
        success: false,
        error: `HTTP ${res.status}: ${errText.slice(0, 100)}`,
      };
    }

    const reader = res.body?.getReader();
    if (!reader) {
      // Fallback: no ReadableStream
      const text = await res.text();
      let full = "";
      for (const line of text.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            full += parsed.delta.text;
          }
        } catch {}
      }
      if (full) {
        onChunk(full);
        return { success: true, content: full };
      }
      return { success: false, error: "Failed to parse response." };
    }

    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.text) {
            full += parsed.delta.text;
            onChunk(parsed.delta.text);
          }
        } catch {}
      }
    }

    return { success: true, content: full };
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
