/**
 * components/ActionsWizard.tsx — GitHub Actions 4-step wizard
 *
 * Step 1: "What?" — checkboxes for build/test/deploy/release
 * Step 2: "When?" — radio for push/daily/manual
 * Step 3: "Confirm" — show summary, generate button
 * Step 4: "Done" — success message
 *
 * On generate: creates workflow YAML and writes to .github/workflows/ via exec bridge.
 * NativeWind className styling.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { execCommand } from '@/modules/exec-bridge';
import { useSettingsStore } from '@/store/settings-store';

// ─── Types ──────────────────────────────────────────────────────────────────

type ActionKind = 'build' | 'test' | 'deploy' | 'release';
type TriggerKind = 'push' | 'daily' | 'manual';
type Step = 'what' | 'when' | 'confirm' | 'done';

const ACTION_OPTIONS: Array<{ key: ActionKind; label: string; icon: string }> = [
  { key: 'build', label: 'Build', icon: 'B' },
  { key: 'test', label: 'Test', icon: 'T' },
  { key: 'deploy', label: 'Deploy', icon: 'D' },
  { key: 'release', label: 'Release', icon: 'R' },
];

const TRIGGER_OPTIONS: Array<{ key: TriggerKind; label: string; desc: string }> = [
  { key: 'push', label: 'On Push', desc: 'Run on every push to main' },
  { key: 'daily', label: 'Daily', desc: 'Run once a day (cron)' },
  { key: 'manual', label: 'Manual', desc: 'Trigger manually via GitHub UI' },
];

// ─── YAML Generator ─────────────────────────────────────────────────────────

function generateWorkflowYaml(
  actions: ActionKind[],
  trigger: TriggerKind,
): string {
  const triggerBlock = (() => {
    switch (trigger) {
      case 'push':
        return `on:\n  push:\n    branches: [main]`;
      case 'daily':
        return `on:\n  schedule:\n    - cron: '0 6 * * *'`;
      case 'manual':
        return `on:\n  workflow_dispatch:`;
    }
  })();

  const steps: string[] = [
    `      - uses: actions/checkout@v4`,
    `      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'`,
    `      - name: Install dependencies\n        run: npm ci`,
  ];

  if (actions.includes('build')) {
    steps.push(`      - name: Build\n        run: npm run build`);
  }
  if (actions.includes('test')) {
    steps.push(`      - name: Test\n        run: npm test`);
  }
  if (actions.includes('deploy')) {
    steps.push(
      `      - name: Deploy\n        run: npm run deploy\n        env:\n          DEPLOY_TOKEN: \${{ secrets.DEPLOY_TOKEN }}`,
    );
  }
  if (actions.includes('release')) {
    steps.push(
      `      - name: Create Release\n        uses: softprops/action-gh-release@v2\n        if: startsWith(github.ref, 'refs/tags/')\n        with:\n          generate_release_notes: true`,
    );
  }

  return `name: CI Pipeline

${triggerBlock}

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
${steps.join('\n')}
`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActionsWizard() {
  const currentCwd = useSettingsStore((s) => s.currentCwd);
  const [step, setStep] = useState<Step>('what');
  const [selectedActions, setSelectedActions] = useState<ActionKind[]>([
    'build',
    'test',
  ]);
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerKind>('push');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleAction = useCallback((action: ActionKind) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  }, []);

  const handleNext = useCallback(() => {
    if (step === 'what' && selectedActions.length > 0) setStep('when');
    else if (step === 'when') setStep('confirm');
  }, [step, selectedActions]);

  const handleBack = useCallback(() => {
    if (step === 'when') setStep('what');
    else if (step === 'confirm') setStep('when');
  }, [step]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const yaml = generateWorkflowYaml(selectedActions, selectedTrigger);
      const dir = `${currentCwd}/.github/workflows`;
      await execCommand(`mkdir -p "${dir}"`, currentCwd);
      // Escape single quotes in YAML for shell
      const escaped = yaml.replace(/'/g, "'\\''");
      await execCommand(
        `printf '%s' '${escaped}' > "${dir}/ci.yml"`,
        currentCwd,
      );
      setStep('done');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to write workflow file');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedActions, selectedTrigger, currentCwd]);

  const handleReset = useCallback(() => {
    setStep('what');
    setSelectedActions(['build', 'test']);
    setSelectedTrigger('push');
    setError(null);
  }, []);

  // ── Step dots ──
  const stepKeys: Step[] = ['what', 'when', 'confirm', 'done'];
  const currentIdx = stepKeys.indexOf(step);

  // ── Done ──
  if (step === 'done') {
    return (
      <View className="border border-green-500/30 rounded-xl overflow-hidden mx-3 my-1">
        <View className="flex-row items-center gap-1.5 px-3 py-2 border-b border-green-500/10">
          <Text className="text-green-400 text-xs font-mono font-bold flex-1">
            GitHub Actions
          </Text>
          <Text className="text-green-400 text-[10px] font-mono">Done</Text>
        </View>
        <View className="p-3 gap-2">
          <Text className="text-zinc-300 text-sm font-mono">
            Workflow created at .github/workflows/ci.yml
          </Text>
          <Text className="text-zinc-500 text-xs font-mono">
            Actions: {selectedActions.join(', ')} | Trigger: {selectedTrigger}
          </Text>
          <TouchableOpacity
            className="self-start px-3 py-1.5 rounded-full border border-zinc-700"
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Text className="text-zinc-400 text-xs font-mono">
              Create another
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="border border-orange-500/30 rounded-xl overflow-hidden mx-3 my-1">
      {/* Header */}
      <View className="flex-row items-center gap-1.5 px-3 py-2 border-b border-orange-500/10">
        <Text className="text-orange-400 text-xs font-mono font-bold flex-1">
          GitHub Actions Wizard
        </Text>
        <View className="flex-row gap-1">
          {stepKeys.slice(0, 3).map((s, i) => (
            <View
              key={s}
              className={`w-1.5 h-1.5 rounded-full ${
                i <= currentIdx ? 'bg-orange-400' : 'bg-zinc-700'
              }`}
            />
          ))}
        </View>
      </View>

      {/* Step 1: What? */}
      {step === 'what' && (
        <View className="p-3 gap-2">
          <Text className="text-zinc-200 text-sm font-mono font-bold">
            What should the workflow do?
          </Text>
          <Text className="text-zinc-500 text-[11px] font-mono">
            Select one or more actions
          </Text>
          <View className="flex-row flex-wrap gap-1.5 mt-1">
            {ACTION_OPTIONS.map(({ key, label, icon }) => {
              const isSelected = selectedActions.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  className={`flex-row items-center gap-1.5 px-2.5 py-2 rounded-lg border ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500'
                      : 'bg-zinc-800/50 border-zinc-700/40'
                  }`}
                  onPress={() => toggleAction(key)}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-xs font-mono font-bold ${
                      isSelected ? 'text-orange-400' : 'text-zinc-500'
                    }`}
                  >
                    [{icon}]
                  </Text>
                  <Text
                    className={`text-xs font-mono font-semibold ${
                      isSelected ? 'text-orange-400' : 'text-zinc-400'
                    }`}
                  >
                    {label}
                  </Text>
                  {isSelected && (
                    <Text className="text-orange-400 text-[10px]">{'✓'}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <View className="flex-row justify-end mt-1">
            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3.5 py-2 rounded-full ${
                selectedActions.length > 0
                  ? 'bg-orange-500'
                  : 'bg-zinc-700/50'
              }`}
              onPress={handleNext}
              disabled={selectedActions.length === 0}
              activeOpacity={0.7}
            >
              <Text className="text-white text-xs font-mono font-bold">
                Next
              </Text>
              <Text className="text-white text-xs">{'→'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 2: When? */}
      {step === 'when' && (
        <View className="p-3 gap-2">
          <Text className="text-zinc-200 text-sm font-mono font-bold">
            When should it run?
          </Text>
          <View className="gap-1.5 mt-1">
            {TRIGGER_OPTIONS.map(({ key, label, desc }) => {
              const isSelected = selectedTrigger === key;
              return (
                <TouchableOpacity
                  key={key}
                  className={`flex-row items-center gap-2 px-2.5 py-2 rounded-lg border ${
                    isSelected
                      ? 'bg-orange-500/15 border-orange-500'
                      : 'bg-zinc-800/50 border-zinc-700/40'
                  }`}
                  onPress={() => setSelectedTrigger(key)}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-3.5 h-3.5 rounded-full border-2 items-center justify-center ${
                      isSelected ? 'border-orange-500' : 'border-zinc-600'
                    }`}
                  >
                    {isSelected && (
                      <View className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text
                      className={`text-xs font-mono font-semibold ${
                        isSelected ? 'text-orange-400' : 'text-zinc-400'
                      }`}
                    >
                      {label}
                    </Text>
                    <Text className="text-zinc-600 text-[10px] font-mono">
                      {desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View className="flex-row justify-end gap-2 mt-1">
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3 py-2 rounded-full border border-zinc-700"
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text className="text-zinc-500 text-xs">{'←'}</Text>
              <Text className="text-zinc-400 text-xs font-mono font-semibold">
                Back
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3.5 py-2 rounded-full bg-orange-500"
              onPress={handleNext}
              activeOpacity={0.7}
            >
              <Text className="text-white text-xs font-mono font-bold">
                Next
              </Text>
              <Text className="text-white text-xs">{'→'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <View className="p-3 gap-2">
          <Text className="text-zinc-200 text-sm font-mono font-bold">
            Review & Generate
          </Text>
          <View className="bg-orange-500/5 border border-orange-500/15 rounded-lg p-2.5 gap-1.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-orange-400 text-xs">{'✓'}</Text>
              <Text className="text-zinc-300 text-xs font-mono flex-1">
                Actions: {selectedActions.join(', ')}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-orange-400 text-xs">{'⏰'}</Text>
              <Text className="text-zinc-300 text-xs font-mono flex-1">
                Trigger: {selectedTrigger}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Text className="text-orange-400 text-xs">{'📁'}</Text>
              <Text className="text-zinc-300 text-xs font-mono flex-1">
                .github/workflows/ci.yml
              </Text>
            </View>
          </View>
          {error && (
            <Text className="text-red-400 text-xs font-mono">{error}</Text>
          )}
          <View className="flex-row justify-end gap-2 mt-1">
            <TouchableOpacity
              className="flex-row items-center gap-1 px-3 py-2 rounded-full border border-zinc-700"
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text className="text-zinc-400 text-xs font-mono font-semibold">
                Start over
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-row items-center gap-1 px-3.5 py-2 rounded-full ${
                isGenerating ? 'bg-zinc-700' : 'bg-green-500'
              }`}
              onPress={handleGenerate}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <>
                  <Text className="text-white text-xs">{'🚀'}</Text>
                  <Text className="text-white text-xs font-mono font-bold">
                    Generate
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
