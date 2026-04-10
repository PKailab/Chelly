import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { installRuntime, getRuntimeInfo, type Runtime } from "@/lib/runtime-manager";

type Props = {
  runtime: Runtime;
  onComplete: (success: boolean) => void;
};

export function RuntimeInstaller({ runtime, onComplete }: Props) {
  const [status, setStatus] = useState<"confirm" | "downloading" | "done" | "error">("confirm");
  const [message, setMessage] = useState("");
  const info = getRuntimeInfo(runtime);

  const handleInstall = async () => {
    setStatus("downloading");
    const success = await installRuntime(runtime, setMessage);
    setStatus(success ? "done" : "error");
    onComplete(success);
  };

  if (status === "confirm") {
    return (
      <View className="bg-blue-900/30 border border-blue-600/50 rounded-xl p-4 my-2">
        <Text className="text-blue-200 text-sm mb-2">
          {info.displayName}が必要です（{info.size}）
        </Text>
        <Text className="text-zinc-400 text-xs mb-3">
          Wi-Fi接続をおすすめします
        </Text>
        <View className="flex-row gap-3">
          <Pressable onPress={handleInstall} className="bg-blue-600 rounded-lg px-4 py-2">
            <Text className="text-white font-medium">インストール</Text>
          </Pressable>
          <Pressable onPress={() => onComplete(false)} className="bg-zinc-700 rounded-lg px-4 py-2">
            <Text className="text-zinc-300 font-medium">スキップ</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (status === "downloading") {
    return (
      <View className="bg-zinc-800/50 rounded-xl p-4 my-2 flex-row items-center gap-3">
        <ActivityIndicator color="#60A5FA" />
        <Text className="text-zinc-300 text-sm">{message || `${info.displayName}をセットアップ中...`}</Text>
      </View>
    );
  }

  return (
    <View className="bg-zinc-800/50 rounded-xl p-4 my-2">
      <Text className={status === "done" ? "text-green-400 text-sm" : "text-red-400 text-sm"}>
        {status === "done" ? `${info.displayName}をインストールしました` : message}
      </Text>
    </View>
  );
}
