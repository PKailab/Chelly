import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettingsStore } from "@/store/settings-store";

type Provider = "gemini" | "claude" | "groq" | "cerebras" | "perplexity" | "local";

const PROVIDERS: { id: Provider; label: string; keyField: string }[] = [
  { id: "gemini", label: "Gemini", keyField: "geminiApiKey" },
  { id: "claude", label: "Claude", keyField: "claudeApiKey" },
  { id: "groq", label: "Groq", keyField: "groqApiKey" },
  { id: "cerebras", label: "Cerebras", keyField: "cerebrasApiKey" },
  { id: "perplexity", label: "Perplexity", keyField: "perplexityApiKey" },
  { id: "local", label: "Local LLM", keyField: "localLlmUrl" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (id: string) =>
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));

  const getKeyValue = (p: (typeof PROVIDERS)[number]): string => {
    if (p.id === "local") return settings.localLlmUrl;
    return (settings as any)[p.keyField] ?? "";
  };

  const handleKeyChange = async (p: (typeof PROVIDERS)[number], value: string) => {
    if (p.id === "local") {
      useSettingsStore.setState({ localLlmUrl: value });
      settings.save();
    } else {
      await settings.setApiKey(p.id, value);
    }
  };

  return (
    <>
      <Stack.Screen options={{ presentation: "modal", headerShown: false }} />
      <ScrollView
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingTop: insets.top + 12 }} className="px-5">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <Pressable onPress={() => router.back()} className="p-2 active:opacity-60">
              <Text className="text-indigo-400 text-base">{"\u2190"} Back</Text>
            </Pressable>
            <Text className="text-white text-lg font-bold font-mono">Settings</Text>
            <View className="w-16" />
          </View>

          {/* Provider selector */}
          <Text className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-3">
            AI Provider
          </Text>
          <View className="gap-2 mb-6">
            {PROVIDERS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => settings.setActiveProvider(p.id)}
                className={`flex-row items-center px-4 py-3 rounded-xl border ${
                  settings.activeProvider === p.id
                    ? "border-indigo-500 bg-indigo-600/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <View
                  className={`w-4 h-4 rounded-full border-2 mr-3 items-center justify-center ${
                    settings.activeProvider === p.id
                      ? "border-indigo-500"
                      : "border-zinc-600"
                  }`}
                >
                  {settings.activeProvider === p.id && (
                    <View className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </View>
                <Text className="text-zinc-200 text-sm flex-1">{p.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* API key fields */}
          <Text className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-3">
            API Keys
          </Text>
          <View className="gap-3 mb-6">
            {PROVIDERS.map((p) => (
              <View key={p.id} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-zinc-400 text-xs font-mono">{p.label}</Text>
                  {p.id !== "local" && (
                    <Pressable onPress={() => toggleShowKey(p.id)}>
                      <Text className="text-zinc-500 text-xs">
                        {showKeys[p.id] ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={getKeyValue(p)}
                  onChangeText={(v) => handleKeyChange(p, v)}
                  placeholder={p.id === "local" ? "http://localhost:11434" : "API key..."}
                  placeholderTextColor="#3f3f46"
                  className="text-white text-sm font-mono bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700/50"
                  secureTextEntry={p.id !== "local" && !showKeys[p.id]}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            ))}
          </View>

          {/* CWD */}
          <Text className="text-zinc-400 text-xs font-mono uppercase tracking-wider mb-3">
            Working Directory
          </Text>
          <View className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 mb-3">
            <Text className="text-zinc-300 text-xs font-mono" numberOfLines={2}>
              {settings.currentCwd}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              settings.setCwd("/data/data/com.termux/files/home/chelly/workspace")
            }
            className="bg-zinc-800 rounded-xl py-2.5 items-center active:opacity-60 mb-6"
          >
            <Text className="text-zinc-400 text-sm">Reset CWD</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}
