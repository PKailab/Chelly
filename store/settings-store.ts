import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

type Provider = "gemini" | "claude" | "groq" | "cerebras" | "perplexity" | "local";

type SettingsStore = {
  activeProvider: Provider;
  geminiApiKey: string;
  claudeApiKey: string;
  groqApiKey: string;
  cerebrasApiKey: string;
  perplexityApiKey: string;
  localLlmUrl: string;
  currentCwd: string;
  isOnboarded: boolean;
  isLoaded: boolean;
  load: () => Promise<void>;
  save: () => Promise<void>;
  setApiKey: (provider: Provider, key: string) => Promise<void>;
  setActiveProvider: (provider: Provider) => void;
  setCwd: (cwd: string) => void;
  setOnboarded: () => void;
};

const DEFAULT_CWD = "/data/data/com.termux/files/home/chelly/workspace";
const SETTINGS_KEY = "chelly_settings";

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  activeProvider: "gemini",
  geminiApiKey: "",
  claudeApiKey: "",
  groqApiKey: "",
  cerebrasApiKey: "",
  perplexityApiKey: "",
  localLlmUrl: "",
  currentCwd: DEFAULT_CWD,
  isOnboarded: false,
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const geminiApiKey = await SecureStore.getItemAsync("chelly_gemini_key") ?? "";
      const claudeApiKey = await SecureStore.getItemAsync("chelly_claude_key") ?? "";
      const groqApiKey = await SecureStore.getItemAsync("chelly_groq_key") ?? "";
      const cerebrasApiKey = await SecureStore.getItemAsync("chelly_cerebras_key") ?? "";
      const perplexityApiKey = await SecureStore.getItemAsync("chelly_perplexity_key") ?? "";
      set({
        activeProvider: data.activeProvider ?? "gemini",
        localLlmUrl: data.localLlmUrl ?? "",
        currentCwd: data.currentCwd ?? DEFAULT_CWD,
        isOnboarded: data.isOnboarded ?? false,
        geminiApiKey, claudeApiKey, groqApiKey, cerebrasApiKey, perplexityApiKey,
        isLoaded: true,
      });
    } catch { set({ isLoaded: true }); }
  },

  save: async () => {
    const s = get();
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({
      activeProvider: s.activeProvider,
      localLlmUrl: s.localLlmUrl,
      currentCwd: s.currentCwd,
      isOnboarded: s.isOnboarded,
    }));
  },

  setApiKey: async (provider, key) => {
    await SecureStore.setItemAsync(`chelly_${provider}_key`, key);
    set({ [`${provider}ApiKey`]: key } as any);
  },

  setActiveProvider: (provider) => { set({ activeProvider: provider }); get().save(); },
  setCwd: (cwd) => { set({ currentCwd: cwd }); get().save(); },
  setOnboarded: () => { set({ isOnboarded: true }); get().save(); },
}));
