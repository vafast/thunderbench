/**
 * 框架对比测试运行器
 *
 * 自动化对比多个框架的性能
 */

import { ServerManager, ServerConfig } from "./server-manager";
import { TestEngine, WrkTestResult } from "./wrk-test-engine";
import { BenchmarkConfig, TestGroupConfig, BenchmarkResult } from "../types";
import { Subject, Observable } from "rxjs";

/** 单个框架的测试结果 */
export interface FrameworkResult {
  name: string;
  port: number;
  result: BenchmarkResult;
  summary: FrameworkSummary;
}

/** 框架测试摘要 */
export interface FrameworkSummary {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 每秒请求数 (RPS) */
  requestsPerSecond: number;
  /** 平均延迟 (ms) */
  avgLatency: number;
  /** P50 延迟 (ms) */
  p50Latency: number;
  /** P95 延迟 (ms) */
  p95Latency: number;
  /** P99 延迟 (ms) */
  p99Latency: number;
  /** 最大延迟 (ms) */
  maxLatency: number;
  /** 错误率 */
  errorRate: number;
  /** 数据传输量 (bytes) */
  transferTotal: number;
}

/** 对比测试结果 */
export interface ComparisonResult {
  /** 测试名称 */
  name: string;
  /** 测试描述 */
  description?: string;
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 总耗时 (ms) */
  duration: number;
  /** 各框架结果 */
  frameworks: FrameworkResult[];
  /** 排名 (按 RPS) */
  ranking: RankingEntry[];
  /** 测试配置 */
  testConfig: ComparisonTestConfig;
}

/** 排名条目 */
export interface RankingEntry {
  rank: number;
  name: string;
  rps: number;
  avgLatency: number;
  p99Latency: number;
  errorRate: number;
  /** 相对于第一名的百分比 */
  relativePerformance: number;
}

/** 对比测试配置 */
export interface ComparisonTestConfig {
  /** 测试名称 */
  name: string;
  /** 测试描述 */
  description?: string;
  /** 测试场景 */
  scenarios: TestScenario[];
  /** 线程数 */
  threads: number;
  /** 连接数 */
  connections: number;
  /** 测试时长 (秒) */
  duration: number;
  /** 预热请求数 */
  warmupRequests?: number;
}

/** 测试场景 */
export interface TestScenario {
  name: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  weight: number;
}

/** 对比运行器选项 */
export interface ComparisonRunnerOptions {
  /** 输出目录 */
  outputDir?: string;
  /** 详细输出 */
  verbose?: boolean;
  /** 显示进度 */
  showProgress?: boolean;
}

/** 对比进度事件 */
export interface ComparisonProgress {
  phase: "starting" | "warmup" | "testing" | "completed";
  currentFramework?: string;
  completedFrameworks: number;
  totalFrameworks: number;
  percentage: number;
  message: string;
}

/**
 * 框架对比测试运行器
 */
export class ComparisonRunner {
  private serverManager: ServerManager;
  private progressSubject = new Subject<ComparisonProgress>();
  private options: ComparisonRunnerOptions;

  constructor(options: ComparisonRunnerOptions = {}) {
    this.serverManager = new ServerManager();
    this.options = {
      outputDir: "./comparison-reports",
      verbose: false,
      showProgress: true,
      ...options,
    };
  }

  /**
   * 添加框架服务器配置
   */
  addFramework(config: ServerConfig): void {
    this.serverManager.addServer(config);
  }

  /**
   * 批量添加框架
   */
  addFrameworks(configs: ServerConfig[]): void {
    configs.forEach((config) => this.addFramework(config));
  }

  /**
   * 运行对比测试
   */
  async runComparison(testConfig: ComparisonTestConfig): Promise<ComparisonResult> {
    const startTime = Date.now();
    const frameworkResults: FrameworkResult[] = [];
    const serverNames = this.serverManager.getServerNames();

    console.log("\n" + "=".repeat(60));
    console.log("🏁 ThunderBench 框架对比测试");
    console.log("=".repeat(60));
    console.log(`📋 测试名称: ${testConfig.name}`);
    console.log(`📊 测试框架: ${serverNames.join(", ")}`);
    console.log(`⚙️  配置: ${testConfig.threads} 线程, ${testConfig.connections} 连接, ${testConfig.duration}s`);
    console.log("=".repeat(60) + "\n");

    try {
      // 1. 启动所有服务器
      this.emitProgress("starting", 0, serverNames.length, "启动服务器...");
      await this.serverManager.startAll();

      // 2. 逐个测试每个框架
      for (let i = 0; i < serverNames.length; i++) {
        const serverName = serverNames[i];
        const server = this.serverManager.getServer(serverName)!;

        console.log(`\n${"─".repeat(50)}`);
        console.log(`🔍 测试框架: ${serverName} (${i + 1}/${serverNames.length})`);
        console.log(`${"─".repeat(50)}`);

        this.emitProgress("testing", i, serverNames.length, `测试 ${serverName}...`, serverName);

        // 创建针对此框架的测试配置
        const benchmarkConfig = this.createBenchmarkConfig(
          serverName,
          server.getBaseUrl(),
          testConfig
        );

        // 运行测试
        const engine = new TestEngine(benchmarkConfig, {
          outputDir: this.options.outputDir,
          verbose: this.options.verbose,
          showProgress: false,
        });

        const result = await engine.runBenchmark();

        // 计算摘要
        const summary = this.calculateSummary(result);

        frameworkResults.push({
          name: serverName,
          port: server.getPort(),
          result,
          summary,
        });

        // 显示单框架结果
        this.printFrameworkResult(serverName, summary);

        engine.destroy();
      }

      // 3. 停止所有服务器
      await this.serverManager.stopAll();

      const endTime = Date.now();

      // 4. 计算排名
      const ranking = this.calculateRanking(frameworkResults);

      // 5. 构建结果
      const comparisonResult: ComparisonResult = {
        name: testConfig.name,
        description: testConfig.description,
        startTime,
        endTime,
        duration: endTime - startTime,
        frameworks: frameworkResults,
        ranking,
        testConfig,
      };

      // 6. 打印最终对比结果
      this.printComparisonResult(comparisonResult);

      this.emitProgress("completed", serverNames.length, serverNames.length, "测试完成");

      return comparisonResult;
    } catch (error) {
      // 确保服务器被清理
      await this.serverManager.stopAll().catch(() => {});
      throw error;
    }
  }

  /**
   * 创建针对特定框架的测试配置
   */
  private createBenchmarkConfig(
    frameworkName: string,
    baseUrl: string,
    testConfig: ComparisonTestConfig
  ): BenchmarkConfig {
    const tests = testConfig.scenarios.map((scenario) => ({
      name: scenario.name,
      request: {
        method: scenario.method,
        url: scenario.path,
        headers: scenario.headers,
        body: scenario.body,
      },
      weight: scenario.weight,
    }));

    const group: TestGroupConfig = {
      name: `${frameworkName}-test`,
      http: {
        baseUrl,
        headers: {
          "Content-Type": "application/json",
        },
      },
      threads: testConfig.threads,
      connections: testConfig.connections,
      duration: testConfig.duration,
      timeout: 10,
      latency: true,
      executionMode: "parallel",
      tests,
    };

    return {
      name: `${testConfig.name} - ${frameworkName}`,
      description: testConfig.description,
      groups: [group],
    };
  }

  /**
   * 计算框架测试摘要
   */
  private calculateSummary(result: BenchmarkResult): FrameworkSummary {
    const stats = result.overallStats;

    return {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      requestsPerSecond: Math.round(stats.requestsPerSecond * 100) / 100,
      avgLatency: Math.round(stats.averageResponseTime * 100) / 100,
      p50Latency: Math.round(stats.p50ResponseTime * 100) / 100,
      p95Latency: Math.round(stats.p95ResponseTime * 100) / 100,
      p99Latency: Math.round(stats.p99ResponseTime * 100) / 100,
      maxLatency: Math.round(stats.maxResponseTime * 100) / 100,
      errorRate: Math.round(stats.errorRate * 10000) / 100, // 转为百分比
      transferTotal: stats.totalResponseSize,
    };
  }

  /**
   * 计算排名
   */
  private calculateRanking(results: FrameworkResult[]): RankingEntry[] {
    // 按 RPS 降序排序
    const sorted = [...results].sort(
      (a, b) => b.summary.requestsPerSecond - a.summary.requestsPerSecond
    );

    const topRps = sorted[0]?.summary.requestsPerSecond || 1;

    return sorted.map((result, index) => ({
      rank: index + 1,
      name: result.name,
      rps: result.summary.requestsPerSecond,
      avgLatency: result.summary.avgLatency,
      p99Latency: result.summary.p99Latency,
      errorRate: result.summary.errorRate,
      relativePerformance: Math.round((result.summary.requestsPerSecond / topRps) * 100),
    }));
  }

  /**
   * 打印单框架结果
   */
  private printFrameworkResult(name: string, summary: FrameworkSummary): void {
    console.log(`\n📊 ${name} 结果:`);
    console.log(`   RPS: ${this.formatNumber(summary.requestsPerSecond)} req/s`);
    console.log(`   延迟: avg=${summary.avgLatency}ms, P95=${summary.p95Latency}ms, P99=${summary.p99Latency}ms`);
    console.log(`   请求: ${this.formatNumber(summary.totalRequests)} 总计, ${summary.errorRate}% 错误率`);
  }

  /**
   * 打印最终对比结果
   */
  private printComparisonResult(result: ComparisonResult): void {
    console.log("\n" + "=".repeat(60));
    console.log("🏆 框架性能对比结果");
    console.log("=".repeat(60));

    // 表头
    console.log("\n排名 | 框架          | RPS           | 延迟(P99)  | 错误率  | 相对性能");
    console.log("─".repeat(75));

    // 排名表
    result.ranking.forEach((entry) => {
      const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : "  ";
      const name = entry.name.padEnd(12);
      const rps = this.formatNumber(entry.rps).padStart(12);
      const latency = `${entry.p99Latency}ms`.padStart(9);
      const errorRate = `${entry.errorRate}%`.padStart(6);
      const relative = `${entry.relativePerformance}%`.padStart(6);

      console.log(`${medal} ${entry.rank}  | ${name} | ${rps} | ${latency} | ${errorRate} | ${relative}`);
    });

    console.log("─".repeat(75));

    // 总结
    const fastest = result.ranking[0];
    const slowest = result.ranking[result.ranking.length - 1];

    if (fastest && slowest && result.ranking.length > 1) {
      const speedup = (fastest.rps / slowest.rps).toFixed(2);
      console.log(`\n📈 ${fastest.name} 比 ${slowest.name} 快 ${speedup}x`);
    }

    console.log(`⏱️  总测试时间: ${(result.duration / 1000).toFixed(1)}s`);
    console.log("=".repeat(60) + "\n");
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

  /**
   * 发送进度事件
   */
  private emitProgress(
    phase: ComparisonProgress["phase"],
    completed: number,
    total: number,
    message: string,
    currentFramework?: string
  ): void {
    this.progressSubject.next({
      phase,
      currentFramework,
      completedFrameworks: completed,
      totalFrameworks: total,
      percentage: Math.round((completed / total) * 100),
      message,
    });
  }

  /**
   * 获取进度流
   */
  getProgressStream(): Observable<ComparisonProgress> {
    return this.progressSubject.asObservable();
  }

  /**
   * 销毁运行器
   */
  destroy(): void {
    this.serverManager.destroy();
    this.progressSubject.complete();
  }
}

/**
 * 便捷函数：运行框架对比测试
 */
export async function runComparison(
  servers: ServerConfig[],
  testConfig: ComparisonTestConfig,
  options?: ComparisonRunnerOptions
): Promise<ComparisonResult> {
  const runner = new ComparisonRunner(options);
  runner.addFrameworks(servers);

  try {
    return await runner.runComparison(testConfig);
  } finally {
    runner.destroy();
  }
}

