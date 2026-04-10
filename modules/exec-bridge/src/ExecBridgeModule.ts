import { requireNativeModule } from "expo-modules-core";

export type ExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

const ExecBridge = requireNativeModule("ExecBridge");

export async function execCommand(
  command: string,
  cwd?: string,
  timeoutMs: number = 30000
): Promise<ExecResult> {
  return ExecBridge.execCommand(command, cwd ?? "", timeoutMs);
}
