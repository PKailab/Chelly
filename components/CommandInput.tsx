import { useState, useRef } from "react";
import { View, TextInput, Pressable, Text } from "react-native";

type Props = {
  onSend: (text: string) => void;
  isStreaming?: boolean;
  onCancel?: () => void;
};

export function CommandInput({ onSend, isStreaming, onCancel }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setText("");
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <View className="bg-zinc-900 border-t border-zinc-800 px-3 py-2 pb-6">
      <View className="flex-row items-end gap-2">
        {/* Microphone placeholder */}
        <Pressable
          className="w-10 h-10 items-center justify-center rounded-full bg-zinc-800 active:opacity-60"
          accessibilityLabel="Voice input"
        >
          <Text className="text-zinc-400 text-lg">{"\uD83C\uDF99"}</Text>
        </Pressable>

        {/* Text input */}
        <View className="flex-1 bg-zinc-800 rounded-2xl border border-zinc-700/50 px-4 py-2 min-h-[40px] max-h-[120px]">
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder="何でも聞いてください..."
            placeholderTextColor="#71717a"
            className="text-white text-sm"
            multiline
            returnKeyType="default"
            blurOnSubmit={false}
            editable={!isStreaming}
          />
        </View>

        {/* Send / Cancel button */}
        {isStreaming ? (
          <Pressable
            onPress={handleCancel}
            className="w-10 h-10 items-center justify-center rounded-full bg-red-600 active:opacity-60"
            accessibilityLabel="Cancel"
          >
            <Text className="text-white text-sm font-bold">{"\u25A0"}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            className={`w-10 h-10 items-center justify-center rounded-full active:opacity-60 ${
              text.trim() ? "bg-indigo-600" : "bg-zinc-700"
            }`}
            accessibilityLabel="Send"
          >
            <Text className="text-white text-lg">{"\u2191"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
