import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";

export interface WrkBinaryInfo {
  path: string;
  platform: string;
  arch: string;
  exists: boolean;
  version?: string;
}

/**
 * 获取当前平台的标识符
 */
export function getPlatformIdentifier(): string {
  const platform = os.platform();
  const arch = os.arch();

  // 标准化平台名称
  const platformMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "win32",
  };

  // 标准化架构名称
  const archMap: Record<string, string> = {
    x64: "x64",
    x86: "x86",
    arm64: "arm64",
    arm: "arm",
  };

  const normalizedPlatform = platformMap[platform] || platform;
  const normalizedArch = archMap[arch] || arch;

  return `${normalizedPlatform}-${normalizedArch}`;
}

/**
 * 获取内置 wrk 二进制文件的路径
 */
export function getBuiltinWrkPath(): string {
  const platformId = getPlatformIdentifier();

  // 尝试多种路径解析方式
  let packageRoot: string;

  // 方式1: 从 __dirname 解析（适用于 npm 包安装后的情况）
  try {
    // 从 dist/index.js 回到包根目录
    packageRoot = path.resolve(__dirname, "..", "..");
    // 检查这个路径是否包含 bin 目录
    if (existsSync(path.join(packageRoot, "bin", platformId, "wrk"))) {
      const packageBinPath = path.join(packageRoot, "bin", platformId, "wrk");
      if (platformId.startsWith("win32")) {
        return packageBinPath + ".exe";
      }
      return packageBinPath;
    }
  } catch {
    // 继续尝试其他方式
  }

  // 方式2: 从当前工作目录解析（适用于开发环境）
  try {
    packageRoot = path.resolve(process.cwd());
    // 检查这个路径是否包含 bin 目录
    if (existsSync(path.join(packageRoot, "bin", platformId, "wrk"))) {
      const packageBinPath = path.join(packageRoot, "bin", platformId, "wrk");
      if (platformId.startsWith("win32")) {
        return packageBinPath + ".exe";
      }
      return packageBinPath;
    }
  } catch {
    // 继续尝试其他方式
  }

  // 方式3: 尝试从 node_modules 路径解析
  try {
    const nodeModulesPath = path.resolve(process.cwd(), "node_modules", "thunderbench");
    if (existsSync(path.join(nodeModulesPath, "bin", platformId, "wrk"))) {
      const packageBinPath = path.join(nodeModulesPath, "bin", platformId, "wrk");
      if (platformId.startsWith("win32")) {
        return packageBinPath + ".exe";
      }
      return packageBinPath;
    }
  } catch {
    // 继续尝试其他方式
  }

  // 如果都找不到，返回默认路径（用于错误提示）
  const defaultPath = path.join(process.cwd(), "bin", platformId, "wrk");
  if (platformId.startsWith("win32")) {
    return defaultPath + ".exe";
  }
  return defaultPath;
}

/**
 * 获取系统安装的 wrk 路径（保留作为备用选项）
 */
export async function getSystemWrkPath(): Promise<string | undefined> {
  // 简化版本：只检查用户是否明确指定了系统路径
  // 主要用于向后兼容和高级用户自定义
  return undefined;
}

/**
 * 验证 wrk 二进制文件是否可用
 */
export async function validateWrkBinary(wrkPath: string): Promise<boolean> {
  try {
    const { execSync } = await import("child_process");
    // wrk --help 会返回退出码 1，这是正常的
    execSync(`"${wrkPath}" --help`, { stdio: "pipe" });
    return true;
  } catch (error: any) {
    // 如果退出码是 1，说明 wrk 可以运行（--help 正常显示）
    if (error.status === 1) {
      return true;
    }
    // 其他错误说明 wrk 无法运行
    return false;
  }
}

/**
 * 获取 wrk 版本信息
 * wrk 版本格式: "wrk a211dd5 [kqueue]" (git commit hash) 或 "wrk 4.2.0"
 */
export async function getWrkVersion(wrkPath: string): Promise<string | undefined> {
  try {
    const { spawnSync } = await import("child_process");
    // 使用 -v 参数获取版本信息（wrk -v 退出码为 1，所以用 spawnSync 而不是 execSync）
    const result = spawnSync(wrkPath, ["-v"], { encoding: "utf8" });
    const output = result.stdout + result.stderr;
    // 匹配 "wrk <version>" 格式，支持语义版本和 git hash
    const match = output.match(/wrk\s+([a-zA-Z0-9.]+)/);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 获取最佳的 wrk 二进制文件路径
 * 优先级：用户指定 > 内置二进制
 */
export async function getBestWrkPath(userWrkPath?: string): Promise<WrkBinaryInfo> {
  const platformId = getPlatformIdentifier();
  const builtinPath = getBuiltinWrkPath();

  // 1. 如果用户指定了路径，优先使用
  if (userWrkPath) {
    try {
      const isValid = await validateWrkBinary(userWrkPath);
      if (isValid) {
        const version = await getWrkVersion(userWrkPath);
        return {
          path: userWrkPath,
          platform: platformId,
          arch: os.arch(),
          exists: true,
          version,
        };
      }
    } catch {
      // 用户指定的路径无效，继续尝试其他选项
    }
  }

  // 2. 尝试内置二进制文件
  try {
    await fs.access(builtinPath);
    const isValid = await validateWrkBinary(builtinPath);
    if (isValid) {
      const version = await getWrkVersion(builtinPath);
      return {
        path: builtinPath,
        platform: platformId,
        arch: os.arch(),
        exists: true,
        version,
      };
    }
  } catch {
    // 内置二进制文件不存在或无效
  }

  // 3. 不再尝试系统安装的 wrk，直接使用内置版本

  // 4. 没有可用的 wrk
  return {
    path: builtinPath,
    platform: platformId,
    arch: os.arch(),
    exists: false,
  };
}

/**
 * 检查是否需要下载 wrk 二进制文件
 */
export async function needsWrkDownload(): Promise<boolean> {
  const wrkInfo = await getBestWrkPath();
  return !wrkInfo.exists;
}

/**
 * 获取下载说明信息
 */
export function getDownloadInstructions(): string {
  return `
🚨 wrk 二进制文件未找到！

请运行以下命令下载内置的 wrk 二进制文件：

  npm run setup-wrk

或者手动安装 wrk：

macOS (使用 Homebrew):
  brew install wrk

Ubuntu/Debian:
  sudo apt-get install wrk

CentOS/RHEL:
  sudo yum install wrk

Windows:
  从 https://github.com/wg/wrk/releases 下载预编译版本
`;
}
