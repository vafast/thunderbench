// ThunderBench 编程 API 入口
import { TestEngine } from "./core/wrk-test-engine";
import { BenchmarkConfig, TestGroupConfig, ApiTestConfig } from "./types";

// 重新导出类型
export type { BenchmarkConfig, TestGroupConfig, ApiTestConfig } from "./types";

// 重新导出核心类
export { TestEngine } from "./core/wrk-test-engine";

// 服务器管理
export { ServerManager, ServerInstance } from "./core/server-manager";
export type { ServerConfig, ServerStatus, ServerEvent, HealthCheckResult } from "./core/server-manager";

// 对比测试
export { ComparisonRunner, runComparison } from "./core/comparison-runner";
export type {
  ComparisonResult,
  ComparisonTestConfig,
  ComparisonProgress,
  FrameworkResult,
  FrameworkSummary,
  RankingEntry,
  TestScenario,
} from "./core/comparison-runner";

// 对比报告
export { ComparisonReportGenerator, generateComparisonReport } from "./core/comparison-report";
export type { ReportOptions } from "./core/comparison-report";

// 便捷的编程接口
export class ThunderBench {
  private engine: TestEngine;

  constructor(
    config: BenchmarkConfig,
    options?: {
      outputDir?: string;
      cleanupScripts?: boolean;
      showProgress?: boolean;
      verbose?: boolean;
    }
  ) {
    this.engine = new TestEngine(config, options);
  }

  /**
   * 运行性能测试
   */
  async runBenchmark() {
    return await this.engine.runBenchmark();
  }

  /**
   * 获取进度流
   */
  getProgressStream() {
    return this.engine.getProgressStream();
  }

  /**
   * 获取统计流
   */
  getStatsStream() {
    return this.engine.getStatsStream();
  }

  /**
   * 清理资源
   */
  destroy() {
    this.engine.destroy();
  }
}

// 便捷函数
export async function runBenchmark(
  config: BenchmarkConfig,
  options?: {
    outputDir?: string;
    cleanupScripts?: boolean;
    showProgress?: boolean;
    verbose?: boolean;
  }
) {
  const thunderbench = new ThunderBench(config, options);
  try {
    const result = await thunderbench.runBenchmark();
    return result;
  } finally {
    thunderbench.destroy();
  }
}

// 配置验证函数
export { validateConfig } from "./core/config-validation";

// 报告生成函数
export { ReportStorage } from "./core/report-storage";
export { JsonReportGenerator } from "./core/json-report-generator";
export { MarkdownReportGenerator } from "./core/markdown-report-generator";
