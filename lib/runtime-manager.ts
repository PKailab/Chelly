import { execCommand } from "@/modules/exec-bridge";

export type Runtime = "python3" | "node" | "git";

type RuntimeInfo = {
  name: string;
  displayName: string;
  size: string;
  url: string;
  sha256: string;
  binName: string;
};

const RUNTIMES: Record<Runtime, RuntimeInfo> = {
  python3: {
    name: "python3",
    displayName: "Python",
    size: "~50MB",
    url: "https://github.com/RYOITABASHI/Chelly/releases/download/runtimes-v1/python3-arm64.tar.gz",
    sha256: "TBD",
    binName: "python3",
  },
  node: {
    name: "node",
    displayName: "Node.js",
    size: "~35MB",
    url: "https://github.com/RYOITABASHI/Chelly/releases/download/runtimes-v1/node-arm64.tar.gz",
    sha256: "TBD",
    binName: "node",
  },
  git: {
    name: "git",
    displayName: "Git",
    size: "~15MB",
    url: "https://github.com/RYOITABASHI/Chelly/releases/download/runtimes-v1/git-arm64.tar.gz",
    sha256: "TBD",
    binName: "git",
  },
};

const RUNTIME_DIR = "/data/data/com.termux/files/home/chelly/runtimes";

export function detectMissingRuntime(stderr: string, exitCode: number): Runtime | null {
  if (exitCode !== 127) return null;
  const lower = stderr.toLowerCase();
  if (/python3?.*not found|no such file.*python/.test(lower)) return "python3";
  if (/node.*not found|no such file.*node/.test(lower)) return "node";
  if (/git.*not found|no such file.*git/.test(lower)) return "git";
  return null;
}

export function getRuntimeInfo(runtime: Runtime): RuntimeInfo {
  return RUNTIMES[runtime];
}

export async function isRuntimeInstalled(runtime: Runtime): Promise<boolean> {
  const info = RUNTIMES[runtime];
  const result = await execCommand(`which ${info.binName}`, undefined, 5000);
  return result.exitCode === 0;
}

export async function installRuntime(
  runtime: Runtime,
  onProgress?: (msg: string) => void
): Promise<boolean> {
  const info = RUNTIMES[runtime];

  onProgress?.(`${info.displayName}をダウンロード中...`);

  // Create runtime directory
  await execCommand(`mkdir -p ${RUNTIME_DIR}`, undefined, 5000);

  // Download
  const dlResult = await execCommand(
    `curl -L -o ${RUNTIME_DIR}/${info.name}.tar.gz "${info.url}"`,
    undefined,
    300000 // 5 min timeout for download
  );

  if (dlResult.exitCode !== 0) {
    onProgress?.(`${info.displayName}のダウンロードに失敗しました`);
    return false;
  }

  onProgress?.(`${info.displayName}をインストール中...`);

  // Extract
  const extractResult = await execCommand(
    `tar xzf ${RUNTIME_DIR}/${info.name}.tar.gz -C ${RUNTIME_DIR}`,
    undefined,
    60000
  );

  if (extractResult.exitCode !== 0) {
    onProgress?.(`${info.displayName}の展開に失敗しました`);
    return false;
  }

  // Add to PATH (symlink to a directory that's on PATH)
  await execCommand(
    `ln -sf ${RUNTIME_DIR}/bin/${info.binName} /data/data/com.termux/files/home/chelly/bin/${info.binName}`,
    undefined,
    5000
  );

  // Cleanup archive
  await execCommand(`rm -f ${RUNTIME_DIR}/${info.name}.tar.gz`, undefined, 5000);

  onProgress?.(`${info.displayName}のインストールが完了しました`);
  return true;
}
