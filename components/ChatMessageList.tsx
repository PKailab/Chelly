import { useCallback, useRef } from "react";
import { FlatList, View, Text } from "react-native";
import { ChatBubble } from "./ChatBubble";
import type { ChatMessage } from "@/store/chat-store";

type Props = {
  messages: ChatMessage[];
  onApprove?: (msgId: string) => void;
  onReject?: (msgId: string) => void;
};

export function ChatMessageList({ messages, onApprove, onReject }: Props) {
  const listRef = useRef<FlatList>(null);

  // Reverse for inverted list (newest at bottom)
  const reversed = [...messages].reverse();

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble
        message={item}
        onApprove={onApprove}
        onReject={onReject}
      />
    ),
    [onApprove, onReject],
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  if (messages.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-zinc-500 text-base text-center font-mono">
          {"\u{1F41A}"} Start a conversation
        </Text>
        <Text className="text-zinc-600 text-xs text-center mt-2">
          Type anything below to get started
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      data={reversed}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      inverted
      contentContainerStyle={{ paddingVertical: 12 }}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
    />
  );
}
