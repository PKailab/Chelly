import { View, Text } from "react-native";
import type { ChatMessage } from "@/store/chat-store";
import { ExecutionCard } from "./ExecutionCard";
import { SafetyConfirm } from "./SafetyConfirm";

const AGENT_COLORS: Record<string, string> = {
  gemini: "text-blue-400",
  claude: "text-amber-400",
  groq: "text-orange-400",
  cerebras: "text-violet-400",
  perplexity: "text-teal-400",
  local: "text-purple-400",
};

type Props = {
  message: ChatMessage;
  onApprove?: (msgId: string) => void;
  onReject?: (msgId: string) => void;
};

export function ChatBubble({ message, onApprove, onReject }: Props) {
  const isUser = message.role === "user";

  // ── User bubble ──
  if (isUser) {
    return (
      <View className="flex-row justify-end px-3 py-1">
        <View className="bg-indigo-600/80 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%]">
          <Text className="text-white text-sm">{message.content}</Text>
          <Text className="text-indigo-300/60 text-[10px] text-right mt-1">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    );
  }

  // ── Assistant bubble ──
  const displayText = message.isStreaming
    ? message.streamingText || ""
    : message.content;

  const agentColorClass = AGENT_COLORS[message.agent ?? ""] ?? "text-emerald-400";

  return (
    <View className="flex-row justify-start px-3 py-1">
      <View className="bg-zinc-800/80 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[85%] border border-zinc-700/40">
        {/* Agent badge */}
        {message.agent && (
          <Text className={`text-[10px] font-mono font-bold mb-1 ${agentColorClass}`}>
            {message.agent.toUpperCase()}
          </Text>
        )}

        {/* Message text */}
        {displayText ? (
          <Text className="text-zinc-200 text-sm leading-5">
            {displayText}
          </Text>
        ) : message.isStreaming ? (
          <Text className="text-zinc-500 text-sm">Thinking...</Text>
        ) : null}

        {/* Streaming cursor */}
        {message.isStreaming && displayText ? (
          <Text className="text-emerald-400 text-sm font-mono">{"\u2588"}</Text>
        ) : null}

        {/* Error */}
        {message.error && (
          <Text className="text-red-400 text-xs mt-2">
            {message.error}
          </Text>
        )}

        {/* Command executions */}
        {message.executions && message.executions.length > 0 && (
          <ExecutionCard executions={message.executions} />
        )}

        {/* Safety confirmation */}
        {message.safetyConfirm?.status === "pending" && (
          <SafetyConfirm
            description={message.safetyConfirm.commands
              .map((c) => `${c.cmd} - ${c.desc}`)
              .join("\n")}
            onApprove={() => onApprove?.(message.id)}
            onReject={() => onReject?.(message.id)}
          />
        )}

        {/* Timestamp */}
        <Text className="text-zinc-600 text-[10px] text-right mt-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );
}
