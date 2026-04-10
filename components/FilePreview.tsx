import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { execCommand } from "@/modules/exec-bridge";

interface FilePreviewProps {
  filePath: string;
  visible: boolean;
  onClose: () => void;
}

export default function FilePreview({ filePath, visible, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setContent(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    execCommand(`cat ${JSON.stringify(filePath)}`)
      .then((result: string) => {
        if (!cancelled) {
          setContent(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [filePath, visible]);

  const fileName = filePath.split("/").pop() ?? filePath;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-end">
        <View className="bg-zinc-900 rounded-t-2xl max-h-[85%] min-h-[40%]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-zinc-700">
            <View className="flex-1 mr-3">
              <Text className="text-white font-semibold text-base" numberOfLines={1}>
                {fileName}
              </Text>
              <Text className="text-zinc-400 text-xs" numberOfLines={1}>
                {filePath}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-zinc-700 px-3 py-1.5 rounded"
              onPress={onClose}
            >
              <Text className="text-white text-sm font-medium">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView className="flex-1 px-4 py-3">
            {loading && (
              <View className="items-center py-8">
                <ActivityIndicator color="#14b8a6" />
              </View>
            )}
            {error != null && (
              <Text className="text-red-400 text-sm font-mono">{error}</Text>
            )}
            {content != null && (
              <Text className="text-zinc-200 text-xs font-mono leading-5">
                {content}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
