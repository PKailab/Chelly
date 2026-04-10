import "@/global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { useChatStore } from "@/store/chat-store";
import { useSettingsStore } from "@/store/settings-store";

export default function RootLayout() {
  const loadChat = useChatStore((s) => s.load);
  const loadSettings = useSettingsStore((s) => s.load);

  useEffect(() => {
    loadChat();
    loadSettings();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
    </Stack>
  );
}
