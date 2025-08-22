import { describe, it, expect, beforeEach } from "vitest";
import { TestEngine } from "../test-engine";
import { BenchmarkConfig } from "../../types";
import path from "path";
import fs from "fs/promises";

describe("测试引擎集成测试", () => {
  let config: BenchmarkConfig;

  beforeEach(async () => {
    // 加载简单配置进行快速测试
    const configPath = path.join(process.cwd(), "examples/simple-config.ts");
    const configModule = await import(configPath);
    config = configModule.default;

    // 修改配置为更小的数值以便快速测试
    config.groups[0].requests = 3;
    config.groups[0].concurrent = 2;
  });

  it("应该能够执行完整的基准测试", async () => {
    console.log("\n🚀 测试完整基准测试执行...");

    const engine = new TestEngine(config);

    // 监听进度更新
    let progressUpdates = 0;
    engine.getProgressStream().subscribe((progress) => {
      console.log(
        `📊 进度: ${progress.groupName} - ${progress.percentage}% (${progress.completed}/${progress.total})`
      );
      progressUpdates++;
    });

    // 监听实时统计
    let statsUpdates = 0;
    engine.getStatsStream().subscribe((stats) => {
      console.log(
        `📈 实时统计: ${stats.totalRequests} 请求, ${stats.successfulRequests} 成功, 平均 ${stats.averageResponseTime}ms`
      );
      statsUpdates++;
    });

    try {
      // 执行测试
      const result = await engine.runBenchmark();

      // 验证结果
      expect(result).toBeDefined();
      expect(result.startTime).toBeGreaterThan(0);
      expect(result.endTime).toBeGreaterThan(result.startTime);
      expect(result.duration).toBeGreaterThan(0);
      expect(result.groups).toHaveLength(1);
      expect(result.overallStats).toBeDefined();

      // 验证第一个组的结果
      const groupResult = result.groups[0];
      expect(groupResult.name).toBe("basic-api-test");
      expect(groupResult.requests).toHaveLength(3); // 配置的请求数
      expect(groupResult.stats.totalRequests).toBe(3);

      // 验证统计数据
      expect(result.overallStats.totalRequests).toBe(3);
      expect(result.overallStats.successfulRequests).toBeGreaterThanOrEqual(0);
      expect(result.overallStats.failedRequests).toBeGreaterThanOrEqual(0);
      expect(result.overallStats.averageResponseTime).toBeGreaterThan(0);

      // 验证事件被触发
      expect(progressUpdates).toBeGreaterThan(0);
      expect(statsUpdates).toBeGreaterThan(0);

      console.log("✅ 基准测试执行成功");
      console.log(
        `📊 最终结果: ${result.overallStats.totalRequests} 请求, ${result.overallStats.successfulRequests} 成功`
      );
    } finally {
      engine.destroy();
    }
  }, 30000); // 30秒超时

  it("应该能够处理配置验证错误", async () => {
    console.log("\n🚀 测试配置验证错误处理...");

    // 创建无效配置
    const invalidConfig: BenchmarkConfig = {
      groups: [
        {
          name: "invalid-group",
          http: { baseUrl: "https://example.com" },
          executionMode: "parallel",
          concurrent: 0, // 无效：并发数为0
          requests: 10,
          tests: [], // 无效：没有测试
        },
      ],
    };

    const engine = new TestEngine(invalidConfig);

    try {
      await expect(engine.runBenchmark()).rejects.toThrow();
      console.log("✅ 正确捕获了配置验证错误");
    } finally {
      engine.destroy();
    }
  });

  it("应该能够生成报告文件", async () => {
    console.log("\n🚀 测试报告文件生成...");

    // 使用更小的配置
    const smallConfig: BenchmarkConfig = {
      groups: [
        {
          name: "test-report",
          http: { baseUrl: "https://httpbin.org" },
          executionMode: "parallel",
          concurrent: 1,
          requests: 2,
          tests: [
            {
              name: "simple-get",
              weight: 100,
              request: { method: "GET", url: "/get" },
            },
          ],
        },
      ],
    };

    const engine = new TestEngine(smallConfig);

    try {
      const result = await engine.runBenchmark();

      // 验证报告文件被创建
      const reportDir = `reports`;
      const reportDirs = await fs.readdir(reportDir);
      expect(reportDirs.length).toBeGreaterThan(0);

      // 验证最新的报告目录包含必要文件
      const latestReportDir = reportDirs.sort().pop();
      const latestReportPath = path.join(reportDir, latestReportDir!);

      const reportFiles = await fs.readdir(latestReportPath);
      expect(reportFiles).toContain("results.json");
      expect(reportFiles).toContain("summary.txt");
      expect(reportFiles).toContain("config.json");
      expect(reportFiles).toContain("logs");

      console.log(`✅ 报告文件已生成: ${latestReportPath}`);
      console.log(`📁 包含文件: ${reportFiles.join(", ")}`);
    } finally {
      engine.destroy();
    }
  }, 30000);

  it("应该能够处理网络错误", async () => {
    console.log("\n🚀 测试网络错误处理...");

    // 创建指向无效URL的配置
    const errorConfig: BenchmarkConfig = {
      groups: [
        {
          name: "error-test",
          http: {
            baseUrl: "https://invalid-domain-that-does-not-exist.com",
            timeout: 1000,
          },
          executionMode: "parallel",
          concurrent: 1,
          requests: 2,
          tests: [
            {
              name: "failing-request",
              weight: 100,
              request: { method: "GET", url: "/test" },
            },
          ],
        },
      ],
    };

    const engine = new TestEngine(errorConfig);

    try {
      const result = await engine.runBenchmark();

      // 验证错误被正确处理
      expect(result.overallStats.failedRequests).toBeGreaterThan(0);
      expect(result.overallStats.errorRate).toBeGreaterThan(0);

      // 验证请求结果包含错误信息
      const failedRequests = result.groups[0].requests.filter((req) => !req.success);
      expect(failedRequests.length).toBeGreaterThan(0);
      expect(failedRequests[0].error).toBeDefined();

      console.log(`✅ 网络错误处理正确: ${failedRequests.length} 个请求失败`);
    } finally {
      engine.destroy();
    }
  }, 30000);
});
