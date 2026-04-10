import { useCallback } from "react";
import { execCommand, type ExecResult } from "@/modules/exec-bridge";
import { useSettingsStore } from "@/store/settings-store";

export { type ExecResult };

export function useExec() {
  const cwd = useSettingsStore((s) => s.currentCwd);
  const setCwd = useSettingsStore((s) => s.setCwd);

  const exec = useCallback(async (command: string, timeoutMs?: number): Promise<ExecResult> => {
    const cdMatch = command.match(/^cd\s+(.+)$/);
    if (cdMatch) {
      const target = cdMatch[1].replace(/^~/, "/data/data/com.termux/files/home");
      const result = await execCommand(`cd ${target} && pwd`, cwd, timeoutMs);
      if (result.exitCode === 0) {
        setCwd(result.stdout.trim());
      }
      return result;
    }
    return execCommand(command, cwd, timeoutMs);
  }, [cwd, setCwd]);

  return { exec, cwd };
}
