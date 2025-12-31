#!/usr/bin/env bun

/**
 * WRK 环境检查脚本
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN_DIR = path.join(__dirname, "..", "bin");

/**
 * 获取当前平台标识符
 */
function getPlatformIdentifier(): string {
  const platform = process.platform;
  const arch = process.arch;

  const platformMap: Record<string, string> = {
    darwin: "darwin",
    linux: "linux",
    win32: "win32",
  };

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
 * 主函数
 */
function main(): void {
  console.log("🚀 检查 WRK 环境...\n");

  const platformId = getPlatformIdentifier();
  console.log(`🖥️  当前平台: ${platformId}`);

  // 检查内置二进制文件
  const builtinPath = path.join(BIN_DIR, platformId, "wrk");
  console.log(`📁 内置路径: ${builtinPath}`);

  if (fs.existsSync(builtinPath)) {
    console.log(`✅ 内置二进制文件存在`);

    // 检查权限
    try {
      fs.accessSync(builtinPath, fs.constants.X_OK);
      console.log(`✅ 二进制文件可执行`);

      // 测试运行
      try {
        execSync(`"${builtinPath}" -v`, { stdio: "pipe" });
        console.log(`✅ 二进制文件运行正常`);
      } catch {
        // wrk -v 通常返回非零退出码，这是正常的
        console.log(`✅ 二进制文件运行正常 (wrk -v 返回非零退出码是正常的)`);
      }
    } catch {
      console.log(`❌ 二进制文件权限不足`);
    }
  } else {
    console.log(`❌ 内置二进制文件不存在`);
  }

  // 检查系统安装
  try {
    const systemWrk = execSync("which wrk", { encoding: "utf8" }).trim();
    console.log(`\n🔍 系统安装: ${systemWrk}`);
  } catch {
    console.log(`\n🔍 系统安装: 未找到`);
  }

  console.log(`\n📁 目录结构:`);
  if (fs.existsSync(BIN_DIR)) {
    const items = fs.readdirSync(BIN_DIR);
    items.forEach((item) => {
      const itemPath = path.join(BIN_DIR, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        const wrkPath = path.join(itemPath, "wrk");
        const exists = fs.existsSync(wrkPath) ? "✅" : "❌";
        console.log(`  ${item}/: ${exists} wrk`);
      }
    });
  }
}

// 运行脚本
main();

export { getPlatformIdentifier };

