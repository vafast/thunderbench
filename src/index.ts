// ThunderBench 编程 API 入口
import { TestEngine } from "./core/wrk-test-engine";
import { BenchmarkConfig, TestGroupConfig, ApiTestConfig } from "./types";

// 重新导出类型
export type { BenchmarkConfig, TestGroupConfig, ApiTestConfig } from "./types";

// 重新导出核心类
export { TestEngine } from "./core/wrk-test-engine";

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
