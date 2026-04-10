import { useCallback, useMemo } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";
import { useAiDispatch } from "@/hooks/use-ai-dispatch";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatHeader } from "@/components/ChatHeader";
import { ChatMessageList } from "@/components/ChatMessageList";
import { CommandInput } from "@/components/CommandInput";

export default function ChatScreen() {
  const isOnboarded = useSettingsStore((s) => s.isOnboarded);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const isChatLoaded = useChatStore((s) => s.isLoaded);

  const sessions = useChatStore((s) => s.sessions);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const createSession = useChatStore((s) => s.createSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const updateMessage = useChatStore((s) => s.updateMessage);

  const { dispatch, cancel } = useAiDispatch();

  // Get or create active session
  const session = useMemo(() => {
    const active = sessions.find((s) => s.id === activeSessionId);
    if (active) return active;
    // Will create on first render if needed
    return null;
  }, [sessions, activeSessionId]);

  // Ensure session exists
  const ensureSession = useCallback(() => {
    if (!session) {
      createSession("New Chat");
    }
  }, [session, createSession]);

  // Check if currently streaming
  const isStreaming = useMemo(
    () => session?.messages.some((m) => m.isStreaming) ?? false,
    [session?.messages],
  );

  // Send handler
  const handleSend = useCallback(
    (text: string) => {
      ensureSession();
      dispatch(text);
    },
    [ensureSession, dispatch],
  );

  // Clear chat — delete current session and create a fresh one
  const handleClearChat = useCallback(() => {
    if (session) {
      deleteSession(session.id);
    }
    createSession("New Chat");
  }, [session, deleteSession, createSession]);

  // Safety confirm handlers
  const handleApprove = useCallback(
    (msgId: string) => {
      if (!session) return;
      updateMessage(session.id, msgId, {
        safetyConfirm: {
          ...session.messages.find((m) => m.id === msgId)?.safetyConfirm!,
          status: "approved",
        },
      });
      // Re-dispatch could be added here for auto-execution after approval
    },
    [session, updateMessage],
  );

  const handleReject = useCallback(
    (msgId: string) => {
      if (!session) return;
      updateMessage(session.id, msgId, {
        safetyConfirm: {
          ...session.messages.find((m) => m.id === msgId)?.safetyConfirm!,
          status: "rejected",
        },
      });
    },
    [session, updateMessage],
  );

  // Wait for stores to load
  if (!isSettingsLoaded || !isChatLoaded) {
    return <View className="flex-1 bg-black" />;
  }

  // Show onboarding if not yet set up
  if (!isOnboarded) {
    return <WelcomeScreen />;
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-black"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ChatHeader onClearChat={handleClearChat} />
      <View className="flex-1">
        <ChatMessageList
          messages={session?.messages ?? []}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      </View>
      <CommandInput
        onSend={handleSend}
        isStreaming={isStreaming}
        onCancel={cancel}
      />
    </KeyboardAvoidingView>
  );
}
