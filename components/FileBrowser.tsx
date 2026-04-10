import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import FilePreview from "./FilePreview";

interface FileEntry {
  name: string;
  path: string;
  size?: number;
}

interface FileBrowserProps {
  files: FileEntry[];
}

function formatSize(bytes?: number): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["ts", "tsx", "js", "jsx"].includes(ext)) return "\u{1F4C4}";
  if (["json", "yaml", "yml", "toml"].includes(ext)) return "\u{2699}\uFE0F";
  if (["md", "txt", "rst"].includes(ext)) return "\u{1F4DD}";
  if (["png", "jpg", "jpeg", "svg", "gif"].includes(ext)) return "\u{1F5BC}\uFE0F";
  return "\u{1F4CE}";
}

export default function FileBrowser({ files }: FileBrowserProps) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  return (
    <View className="my-2">
      <FlatList
        data={files}
        keyExtractor={(item) => item.path}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-zinc-800 rounded-lg px-3 py-2 mb-1.5">
            <Text className="text-lg mr-2">{fileIcon(item.name)}</Text>
            <View className="flex-1">
              <Text className="text-white text-sm font-medium" numberOfLines={1}>
                {item.name}
              </Text>
              {item.size != null && (
                <Text className="text-zinc-400 text-xs">{formatSize(item.size)}</Text>
              )}
            </View>
            <TouchableOpacity
              className="bg-teal-600 px-3 py-1 rounded"
              onPress={() => setPreviewPath(item.path)}
            >
              <Text className="text-white text-xs font-semibold">View</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {previewPath != null && (
        <FilePreview
          filePath={previewPath}
          visible={true}
          onClose={() => setPreviewPath(null)}
        />
      )}
    </View>
  );
}
