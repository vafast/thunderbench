#!/usr/bin/env node

import { Command } from "commander";
import { TestEngine } from "./core/wrk-test-engine";
import { BenchmarkConfig } from "./types";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import fs from "fs/promises";

const program = new Command();

program
  .name("thunderbench")
  .description("高性能API性能测试工具，基于WRK引擎")
  .version("1.0.0")
  .option("-c, --config <path>", "配置文件路径", "./examples/test-config.ts")
  .option("-v, --verbose", "详细输出模式")
  .option("--no-report", "不生成报告文件")
  .option("--no-progress", "不显示实时进度")
  .option("-o, --output <dir>", "报告输出目录", "./reports")
  .option("--timeout <ms>", "全局超时时间(毫秒)", "30000")
  .option("--concurrent <number>", "全局并发数覆盖", "10")
  .option("--dry-run", "仅验证配置，不执行测试")
  .option("--list-examples", "列出示例配置文件")
  .option("--create-example", "创建示例配置文件")

  .option("--cleanup-wrk", "测试完成后清理 wrk 脚本文件");

program.parse();

const options = program.opts();

async function main() {
  try {
    // 显示欢迎信息
    console.log(chalk.blue.bold("\nThunderBench - 高性能API性能测试工具"));
    console.log(chalk.gray("版本 1.0.0 | 基于内置 WRK 引擎\n"));

    // 处理特殊选项
    if (options.listExamples) {
      await listExamples();
      return;
    }

    if (options.createExample) {
      await createExampleConfig();
      return;
    }

    // 验证配置文件
    const configPath = path.resolve(options.config);
    console.log(chalk.blue(`配置文件: ${configPath}`));

    if (!(await fileExists(configPath))) {
      console.error(chalk.red(`配置文件不存在: ${configPath}`));
      console.log(chalk.yellow("使用 --create-example 创建示例配置文件"));
      process.exit(1);
    }

    // 加载配置
    const spinner = ora("加载配置文件...").start();
    let config: BenchmarkConfig;

    try {
      const configModule = await import(configPath);
      config = configModule.default || configModule.config;
      spinner.succeed("配置文件加载成功");
    } catch (error) {
      spinner.fail("配置文件加载失败");
      console.error(chalk.red("错误详情:"), error);
      process.exit(1);
    }

    // 应用全局选项覆盖
    if (options.timeout) {
      const timeout = parseInt(options.timeout);
      config.groups.forEach((group) => {
        if (group.http) {
          group.http.timeout = timeout;
        }
      });
      console.log(chalk.yellow(`全局超时时间设置为: ${timeout}ms`));
    }

    if (options.concurrent && options.concurrent !== "10") {
      const concurrent = parseInt(options.concurrent);
      config.groups.forEach((group) => {
        // 将全局并发数转换为线程数和连接数
        group.threads = Math.min(12, Math.ceil(concurrent / 10)); // 每线程最多10个连接
        group.connections = concurrent;
      });
      console.log(chalk.yellow(`全局并发数设置为: ${concurrent}`));
    }

    // 干运行模式
    if (options.dryRun) {
      console.log(chalk.blue("\n干运行模式 - 仅验证配置"));
      const { validateConfig } = await import("./core/config-validation");
      validateConfig(config);
      console.log(chalk.green("配置验证通过！"));
      console.log(chalk.blue("使用 --no-dry-run 执行实际测试"));
      return;
    }

    // 创建测试引擎
    console.log(chalk.blue("使用内置 wrk 版本..."));

    const engine = new TestEngine(config, {
      outputDir: options.output, // 使用全局输出目录
      cleanupScripts: options.cleanupWrk,
      showProgress: options.progress !== false,
      verbose: options.verbose,
    });

    // 设置进度监控
    if (options.progress !== false) {
      setupProgressMonitoring(engine, options.verbose);
    }

    // 执行测试
    console.log(chalk.blue("\n开始执行基准测试...\n"));

    const startTime = Date.now();
    const result = await engine.runBenchmark();
    const totalTime = (Date.now() - startTime) / 1000;

    // 显示结果摘要
    displayResultsSummary(result, totalTime);

    // 清理资源
    engine.destroy();

    console.log(chalk.green("\n测试完成！"));

    if (options.report !== false) {
      console.log(chalk.blue("详细报告已保存到 reports/ 目录"));
    }
  } catch (error) {
    console.error(chalk.red("\n测试执行失败:"));
    console.error(error);
    process.exit(1);
  }
}

/**
 * 设置进度监控
 */
function setupProgressMonitoring(engine: TestEngine, verbose: boolean) {
  let lastProgressUpdate = Date.now();

  // 进度流
  engine.getProgressStream().subscribe((progress) => {
    const percentage = progress.percentage;
    const color = percentage === 100 ? chalk.green : chalk.blue;

    if (verbose) {
      const currentTest = progress.currentTest ? ` | ${progress.currentTest}` : "";
      console.log(
        color(
          `${progress.groupName}: ${percentage}% (${progress.completed}/${progress.total})${currentTest}`
        )
      );
    } else {
      // 禁用进度条输出，使用TestEngine的单行显示
    }
  });

  // 统计流
  engine.getStatsStream().subscribe((stats) => {
    const now = Date.now();

    if (verbose) {
      const successRate =
        stats.totalRequests > 0
          ? ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)
          : "0.0";
      console.log(
        chalk.cyan(
          `实时: ${stats.totalRequests.toLocaleString()} 请求 | ${successRate}% 成功 | 平均 ${
            stats.averageResponseTime
          }ms | ${stats.requestsPerSecond.toFixed(1)} req/s`
        )
      );
    } else {
      // 禁用统计输出，使用TestEngine的单行显示
    }
  });
}

/**
 * 显示结果摘要
 */
function displayResultsSummary(result: any, totalTime: number) {
  const stats = result.overallStats;
  const successRate = ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1);

  console.log(chalk.blue("\n" + "=".repeat(60)));
  console.log(chalk.blue.bold("测试结果摘要"));
  console.log(chalk.blue("=".repeat(60)));

  console.log(chalk.white(`总耗时: ${totalTime.toFixed(2)} 秒`));
  console.log(chalk.white(`总请求数: ${stats.totalRequests.toLocaleString()}`));
  console.log(chalk.green(`成功: ${stats.successfulRequests.toLocaleString()} (${successRate}%)`));
  console.log(
    chalk.red(
      `失败: ${stats.failedRequests.toLocaleString()} (${(stats.errorRate * 100).toFixed(1)}%)`
    )
  );
  console.log(chalk.yellow(`平均响应时间: ${stats.averageResponseTime} ms`));
  console.log(chalk.yellow(`P95响应时间: ${stats.p95ResponseTime} ms`));
  console.log(chalk.cyan(`吞吐量: ${stats.requestsPerSecond.toFixed(1)} req/s`));

  // 测试组详情
  if (result.groups.length > 1) {
    console.log(chalk.blue("\n测试组详情:"));
    result.groups.forEach((group: any) => {
      const groupStats = group.stats;
      const groupSuccessRate = (
        (groupStats.successfulRequests / groupStats.totalRequests) *
        100
      ).toFixed(1);
      const color = groupSuccessRate === "100.0" ? chalk.green : chalk.yellow;

      console.log(
        color(
          `  ${group.name}: ${groupStats.totalRequests} 请求, ${groupSuccessRate}% 成功, 平均 ${groupStats.averageResponseTime}ms`
        )
      );
    });
  }

  console.log(chalk.blue("=".repeat(60)));
}

/**
 * 列出示例配置文件
 */
async function listExamples() {
  console.log(chalk.blue("\n可用的示例配置文件:"));
  console.log(chalk.blue("=".repeat(50)));

  const examples = [
    { name: "simple-config.ts", desc: "简单API测试配置" },
    { name: "complex-config.ts", desc: "复杂场景配置（多组、混合模式）" },
    { name: "rest-api-config.ts", desc: "REST API完整测试配置" },
  ];

  examples.forEach((example, index) => {
    console.log(chalk.white(`${index + 1}. ${example.name}`));
    console.log(chalk.gray(`   ${example.desc}`));
    console.log();
  });

  console.log(chalk.yellow("使用 --create-example 创建这些配置文件"));
}

/**
 * 创建示例配置文件
 */
async function createExampleConfig() {
  console.log(chalk.blue("\n创建示例配置文件..."));

  const examplesDir = path.join(process.cwd(), "examples");
  const targetDir = process.cwd();

  try {
    // 复制示例文件
    const files = ["simple-config.ts", "complex-config.ts", "rest-api-config.ts"];

    for (const file of files) {
      const sourcePath = path.join(examplesDir, file);
      const targetPath = path.join(targetDir, file);

      if (await fileExists(sourcePath)) {
        await fs.copyFile(sourcePath, targetPath);
        console.log(chalk.green(`创建: ${file}`));
      }
    }

    console.log(chalk.green("\n示例配置文件创建完成！"));
    console.log(chalk.blue("现在你可以修改这些文件并运行测试"));
    console.log(chalk.blue("   例如: thunderbench --config simple-config.ts"));
  } catch (error) {
    console.error(chalk.red("创建示例配置文件失败:"), error);
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 运行主程序
main().catch((error) => {
  console.error(chalk.red("程序执行失败:"), error);
  process.exit(1);
});
