/**
 * components/ArenaBubble.tsx — Arena Mode comparison UI
 *
 * Shows 2 LLM responses side-by-side (wide) or stacked (narrow).
 * User picks winner -> reveals agent names + updates arena store.
 * NativeWind className styling.
 */

import React, { memo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useArenaStore, type ArenaCandidate } from '@/store/arena-store';

// ─── Props ──────────────────────────────────────────────────────────────────

type Props = {
  arenaId: string;
};

const AGENT_COLORS: Record<string, string> = {
  gemini: 'text-blue-400',
  claude: 'text-amber-400',
  groq: 'text-orange-400',
  cerebras: 'text-violet-400',
  perplexity: 'text-teal-400',
  local: 'text-purple-400',
};

const LABEL_BG: Record<number, string> = {
  0: 'bg-blue-500/15',
  1: 'bg-amber-500/15',
};

const LABEL_TEXT: Record<number, string> = {
  0: 'text-blue-500',
  1: 'text-amber-500',
};

// ─── Component ──────────────────────────────────────────────────────────────

export const ArenaBubble = memo(function ArenaBubble({ arenaId }: Props) {
  const { width } = useWindowDimensions();
  const isWide = width >= 600;

  const arena = useArenaStore((s) =>
    s.activeArena?.id === arenaId
      ? s.activeArena
      : s.arenaHistory.find((e) => e.id === arenaId),
  );
  const vote = useArenaStore((s) => s.vote);
  const getWinRate = useArenaStore((s) => s.getWinRate);
  const [compactIndex, setCompactIndex] = useState(0);

  const handleVote = useCallback(
    (candidateId: string) => {
      vote(arenaId, candidateId);
    },
    [arenaId, vote],
  );

  if (!arena) return null;

  const isRevealed = arena.winnerId !== null;
  const [a, b] = arena.candidates;
  const winner = isRevealed
    ? arena.candidates.find((c) => c.id === arena.winnerId)
    : null;
  const winRate = winner ? getWinRate(winner.agent) : 0;

  // ── Candidate card ──
  const renderCandidate = (
    candidate: ArenaCandidate,
    label: string,
    idx: number,
  ) => {
    const isWinner = isRevealed && candidate.id === arena.winnerId;
    const borderClass = isWinner
      ? 'border-green-500'
      : 'border-zinc-700/40';

    return (
      <View
        key={candidate.id}
        className={`bg-zinc-800/80 border rounded-xl p-3 gap-1.5 max-h-72 ${borderClass} ${
          isWide ? 'flex-1' : ''
        }`}
      >
        {/* Header */}
        <View className="flex-row items-center gap-1.5">
          <View className={`px-2 py-0.5 rounded ${LABEL_BG[idx]}`}>
            <Text
              className={`text-xs font-mono font-bold ${LABEL_TEXT[idx]}`}
            >
              {label}
            </Text>
          </View>
          {isRevealed && (
            <View className="flex-row items-center gap-1">
              <Text
                className={`text-xs font-mono font-semibold ${
                  AGENT_COLORS[candidate.agent] ?? 'text-emerald-400'
                }`}
              >
                {candidate.agent.charAt(0).toUpperCase() +
                  candidate.agent.slice(1)}
              </Text>
              {isWinner && (
                <Text className="text-amber-400 text-xs">{'🏆'}</Text>
              )}
            </View>
          )}
        </View>

        {/* Response */}
        <ScrollView className="max-h-48" nestedScrollEnabled>
          {candidate.isStreaming ? (
            <View className="flex-row items-center gap-1.5 py-1">
              <ActivityIndicator size="small" color="#10B981" />
              <Text className="text-zinc-500 text-xs font-mono">
                {candidate.response ? '...' : 'thinking...'}
              </Text>
            </View>
          ) : candidate.error ? (
            <Text className="text-red-400 text-xs font-mono">
              {candidate.error}
            </Text>
          ) : null}
          {candidate.response ? (
            <Text className="text-zinc-300 text-sm font-mono leading-5">
              {candidate.response}
            </Text>
          ) : null}
        </ScrollView>

        {/* Vote button (pre-reveal only) */}
        {!isRevealed && !candidate.isStreaming && candidate.response ? (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/15 mt-1"
            onPress={() => handleVote(candidate.id)}
            activeOpacity={0.7}
          >
            <Text className="text-emerald-400 text-xs font-mono font-semibold">
              Pick this one
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  // ── Main render ──
  return (
    <View className="border border-zinc-700/40 rounded-xl overflow-hidden mx-3 my-1">
      {/* Header */}
      <View className="flex-row items-center justify-between px-3 pt-2.5 pb-1">
        <Text className="text-zinc-200 text-sm font-mono font-bold">
          Arena Mode
        </Text>
        {isRevealed && (
          <Text className="text-green-400 text-[11px] font-mono font-semibold">
            Result
          </Text>
        )}
      </View>

      {/* Prompt */}
      <Text
        className="text-zinc-500 text-xs font-mono px-3 pb-2"
        numberOfLines={2}
      >
        {arena.prompt}
      </Text>

      {/* Candidates */}
      {isWide ? (
        <View className="flex-row gap-1 px-1.5 pb-1.5">
          {renderCandidate(a, 'A', 0)}
          {renderCandidate(b, 'B', 1)}
        </View>
      ) : (
        <View className="px-1.5 pb-1.5">
          {renderCandidate(
            compactIndex === 0 ? a : b,
            compactIndex === 0 ? 'A' : 'B',
            compactIndex,
          )}
          <View className="flex-row justify-center gap-2 py-2">
            <TouchableOpacity
              className={`w-2 h-2 rounded-full ${
                compactIndex === 0 ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
              onPress={() => setCompactIndex(0)}
            />
            <TouchableOpacity
              className={`w-2 h-2 rounded-full ${
                compactIndex === 1 ? 'bg-emerald-400' : 'bg-zinc-600'
              }`}
              onPress={() => setCompactIndex(1)}
            />
          </View>
        </View>
      )}

      {/* Result footer */}
      {isRevealed && winner && (
        <View className="bg-green-500/10 px-3 py-2 items-center">
          <Text className="text-zinc-200 text-xs font-mono font-semibold">
            {winner.agent.charAt(0).toUpperCase() + winner.agent.slice(1)}{' '}
            selected{winRate > 0 ? ` (${winRate}% win rate)` : ''}
          </Text>
        </View>
      )}

      {/* Pre-reveal hint */}
      {!isRevealed && (
        <Text className="text-zinc-600 text-[10px] font-mono text-center py-1.5">
          Vote to reveal which AI wrote each response
        </Text>
      )}
    </View>
  );
});
