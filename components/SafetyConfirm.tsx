import { View, Text, Pressable } from "react-native";

type Props = {
  description: string;
  onApprove: () => void;
  onReject: () => void;
};

export function SafetyConfirm({ description, onApprove, onReject }: Props) {
  return (
    <View className="bg-yellow-900/30 border border-yellow-600/50 rounded-xl p-4 my-2">
      <Text className="text-yellow-200 text-sm mb-3">{description}</Text>
      <View className="flex-row gap-3">
        <Pressable onPress={onApprove} className="bg-yellow-600 rounded-lg px-4 py-2">
          <Text className="text-white font-medium">実行</Text>
        </Pressable>
        <Pressable onPress={onReject} className="bg-zinc-700 rounded-lg px-4 py-2">
          <Text className="text-zinc-300 font-medium">キャンセル</Text>
        </Pressable>
      </View>
    </View>
  );
}
