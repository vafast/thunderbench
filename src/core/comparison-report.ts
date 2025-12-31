/**
 * 对比报告生成器
 *
 * 生成 Markdown 和 JSON 格式的框架对比报告
 */

import { ComparisonResult, RankingEntry, FrameworkSummary } from "./comparison-runner";
import fs from "fs/promises";
import path from "path";

/**
 * 报告生成选项
 */
export interface ReportOptions {
  /** 输出目录 */
  outputDir?: string;
  /** 报告格式 */
  formats?: ("markdown" | "json")[];
  /** 包含原始数据 */
  includeRawData?: boolean;
  /** 自定义文件名前缀 */
  filePrefix?: string;
}

/**
 * 对比报告生成器
 */
export class ComparisonReportGenerator {
  private options: Required<ReportOptions>;

  constructor(options: ReportOptions = {}) {
    this.options = {
      outputDir: "./comparison-reports",
      formats: ["markdown", "json"],
      includeRawData: false,
      filePrefix: "comparison",
      ...options,
    };
  }

  /**
   * 生成报告
   */
  async generate(result: ComparisonResult): Promise<string[]> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const reportDir = path.join(this.options.outputDir, timestamp);

    // 创建目录
    await fs.mkdir(reportDir, { recursive: true });

    const files: string[] = [];

    // 生成 Markdown 报告
    if (this.options.formats.includes("markdown")) {
      const mdPath = path.join(reportDir, `${this.options.filePrefix}.md`);
      const mdContent = this.generateMarkdown(result);
      await fs.writeFile(mdPath, mdContent);
      files.push(mdPath);
      console.log(`📄 Markdown 报告: ${mdPath}`);
    }

    // 生成 JSON 报告
    if (this.options.formats.includes("json")) {
      const jsonPath = path.join(reportDir, `${this.options.filePrefix}.json`);
      const jsonContent = this.generateJson(result);
      await fs.writeFile(jsonPath, jsonContent);
      files.push(jsonPath);
      console.log(`📄 JSON 报告: ${jsonPath}`);
    }

    return files;
  }

  /**
   * 生成 Markdown 报告
   */
  generateMarkdown(result: ComparisonResult): string {
    const lines: string[] = [];

    // 标题
    lines.push(`# ⚡ ThunderBench 框架性能对比报告`);
    lines.push("");
    lines.push(`**测试名称**: ${result.name}`);
    if (result.description) {
      lines.push(`**描述**: ${result.description}`);
    }
    lines.push(`**测试时间**: ${new Date(result.startTime).toLocaleString()}`);
    lines.push(`**总耗时**: ${(result.duration / 1000).toFixed(1)}s`);
    lines.push("");

    // 测试配置
    lines.push("## ⚙️ 测试配置");
    lines.push("");
    lines.push(`| 参数 | 值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 线程数 | ${result.testConfig.threads} |`);
    lines.push(`| 连接数 | ${result.testConfig.connections} |`);
    lines.push(`| 持续时间 | ${result.testConfig.duration}s |`);
    lines.push(`| 测试框架 | ${result.frameworks.map((f) => f.name).join(", ")} |`);
    lines.push("");

    // 测试场景
    lines.push("### 测试场景");
    lines.push("");
    lines.push(`| 场景 | 方法 | 路径 | 权重 |`);
    lines.push(`|------|------|------|------|`);
    result.testConfig.scenarios.forEach((scenario) => {
      lines.push(`| ${scenario.name} | ${scenario.method} | ${scenario.path} | ${scenario.weight}% |`);
    });
    lines.push("");

    // 性能排名
    lines.push("## 🏆 性能排名");
    lines.push("");
    lines.push(this.generateRankingTable(result.ranking));
    lines.push("");

    // 性能对比图 (ASCII)
    lines.push("## 📊 性能对比 (RPS)");
    lines.push("");
    lines.push("```");
    lines.push(this.generateAsciiChart(result.ranking));
    lines.push("```");
    lines.push("");

    // 详细结果
    lines.push("## 📋 详细结果");
    lines.push("");

    result.frameworks.forEach((framework) => {
      lines.push(`### ${framework.name}`);
      lines.push("");
      lines.push(this.generateFrameworkTable(framework.summary));
      lines.push("");
    });

    // 延迟对比
    lines.push("## ⏱️ 延迟对比");
    lines.push("");
    lines.push(this.generateLatencyTable(result.frameworks));
    lines.push("");

    // 总结
    lines.push("## 📝 总结");
    lines.push("");
    lines.push(this.generateSummary(result));
    lines.push("");

    // 页脚
    lines.push("---");
    lines.push("");
    lines.push(`*报告由 ThunderBench 自动生成 | ${new Date().toISOString()}*`);

    return lines.join("\n");
  }

  /**
   * 生成排名表格
   */
  private generateRankingTable(ranking: RankingEntry[]): string {
    const lines: string[] = [];

    lines.push(`| 排名 | 框架 | RPS | 延迟 (P99) | 错误率 | 相对性能 |`);
    lines.push(`|:----:|------|----:|----------:|-------:|--------:|`);

    ranking.forEach((entry) => {
      const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "";
      const rps = this.formatNumber(entry.rps);
      const latency = `${entry.p99Latency.toFixed(2)}ms`;
      const errorRate = `${entry.errorRate.toFixed(2)}%`;
      const relative = `${entry.relativePerformance}%`;

      lines.push(`| ${medal} ${entry.rank} | **${entry.name}** | ${rps} | ${latency} | ${errorRate} | ${relative} |`);
    });

    return lines.join("\n");
  }

  /**
   * 生成 ASCII 柱状图
   */
  private generateAsciiChart(ranking: RankingEntry[]): string {
    const maxWidth = 50;
    const maxRps = ranking[0]?.rps || 1;

    const lines: string[] = [];

    ranking.forEach((entry) => {
      const barWidth = Math.round((entry.rps / maxRps) * maxWidth);
      const bar = "█".repeat(barWidth);
      const name = entry.name.padEnd(12);
      const rps = this.formatNumber(entry.rps).padStart(10);

      lines.push(`${name} ${bar} ${rps} req/s`);
    });

    return lines.join("\n");
  }

  /**
   * 生成框架详细表格
   */
  private generateFrameworkTable(summary: FrameworkSummary): string {
    const lines: string[] = [];

    lines.push(`| 指标 | 值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 总请求数 | ${this.formatNumber(summary.totalRequests)} |`);
    lines.push(`| 成功请求 | ${this.formatNumber(summary.successfulRequests)} |`);
    lines.push(`| 失败请求 | ${this.formatNumber(summary.failedRequests)} |`);
    lines.push(`| RPS | **${this.formatNumber(summary.requestsPerSecond)}** req/s |`);
    lines.push(`| 平均延迟 | ${summary.avgLatency.toFixed(2)}ms |`);
    lines.push(`| P50 延迟 | ${summary.p50Latency.toFixed(2)}ms |`);
    lines.push(`| P95 延迟 | ${summary.p95Latency.toFixed(2)}ms |`);
    lines.push(`| P99 延迟 | ${summary.p99Latency.toFixed(2)}ms |`);
    lines.push(`| 错误率 | ${summary.errorRate.toFixed(2)}% |`);

    return lines.join("\n");
  }

  /**
   * 生成延迟对比表格
   */
  private generateLatencyTable(frameworks: { name: string; summary: FrameworkSummary }[]): string {
    const lines: string[] = [];

    lines.push(`| 框架 | 平均延迟 | P50 | P95 | P99 | 最大延迟 |`);
    lines.push(`|------|--------:|----:|----:|----:|--------:|`);

    frameworks.forEach((f) => {
      const s = f.summary;
      lines.push(
        `| ${f.name} | ${s.avgLatency.toFixed(2)}ms | ${s.p50Latency.toFixed(2)}ms | ${s.p95Latency.toFixed(2)}ms | ${s.p99Latency.toFixed(2)}ms | ${s.maxLatency.toFixed(2)}ms |`
      );
    });

    return lines.join("\n");
  }

  /**
   * 生成总结
   */
  private generateSummary(result: ComparisonResult): string {
    const lines: string[] = [];
    const ranking = result.ranking;

    if (ranking.length === 0) {
      return "无测试结果";
    }

    const fastest = ranking[0];
    const slowest = ranking[ranking.length - 1];

    lines.push(`- **最快框架**: ${fastest.name} (${this.formatNumber(fastest.rps)} req/s)`);
    
    if (ranking.length > 1) {
      lines.push(`- **最慢框架**: ${slowest.name} (${this.formatNumber(slowest.rps)} req/s)`);
      const speedup = (fastest.rps / slowest.rps).toFixed(2);
      lines.push(`- **性能差距**: ${fastest.name} 比 ${slowest.name} 快 **${speedup}x**`);
    }

    // 分析延迟
    const lowestLatency = [...result.frameworks].sort(
      (a, b) => a.summary.p99Latency - b.summary.p99Latency
    )[0];
    lines.push(`- **最低 P99 延迟**: ${lowestLatency.name} (${lowestLatency.summary.p99Latency.toFixed(2)}ms)`);

    // 错误率分析
    const zeroErrorFrameworks = result.frameworks.filter((f) => f.summary.errorRate === 0);
    if (zeroErrorFrameworks.length > 0) {
      lines.push(`- **零错误框架**: ${zeroErrorFrameworks.map((f) => f.name).join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 生成 JSON 报告
   */
  generateJson(result: ComparisonResult): string {
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        tool: "ThunderBench",
        version: "1.0.0",
      },
      summary: {
        name: result.name,
        description: result.description,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration,
        frameworksCount: result.frameworks.length,
      },
      testConfig: result.testConfig,
      ranking: result.ranking,
      frameworks: result.frameworks.map((f) => ({
        name: f.name,
        port: f.port,
        summary: f.summary,
        ...(this.options.includeRawData ? { rawResult: f.result } : {}),
      })),
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 格式化数字
   */
  private formatNumber(n: number): string {
    if (n >= 1000000) {
      return `${(n / 1000000).toFixed(2)}M`;
    }
    if (n >= 1000) {
      return `${(n / 1000).toFixed(2)}K`;
    }
    return n.toFixed(2);
  }
}

/**
 * 便捷函数：生成对比报告
 */
export async function generateComparisonReport(
  result: ComparisonResult,
  options?: ReportOptions
): Promise<string[]> {
  const generator = new ComparisonReportGenerator(options);
  return generator.generate(result);
}

