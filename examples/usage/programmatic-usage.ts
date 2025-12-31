/**
 * ThunderBench 编程使用示例
 */

import {
  ThunderBench,
  runBenchmark,
  validateConfig,
  type BenchmarkConfig,
  type BenchmarkResult,
} from "thunderbench";

/**
 * 示例1：使用 ThunderBench 类
 */
async function example1(): Promise<BenchmarkResult> {
  const config: BenchmarkConfig = {
    name: "编程API测试",
    description: "通过编程方式运行性能测试",
    groups: [
      {
        name: "基础测试组",
        http: {
          baseUrl: "http://localhost:3001",
          headers: { "User-Agent": "thunderbench-programmatic/1.0" },
        },
        threads: 2,
        connections: 50,
        duration: 10,
        timeout: 5,
        latency: true,
        executionMode: "parallel",
        tests: [
          {
            name: "GET 请求测试",
            request: { method: "GET", url: "/" },
            weight: 100,
          },
        ],
      },
    ],
  };

  const thunderbench = new ThunderBench(config, {
    outputDir: "./programmatic-reports",
    verbose: true,
  });

  try {
    // 监听进度
    thunderbench.getProgressStream().subscribe((progress) => {
      console.log(`进度: ${progress.groupName} - ${progress.percentage}%`);
    });

    // 监听统计
    thunderbench.getStatsStream().subscribe((stats) => {
      console.log(
        `实时统计: ${stats.totalRequests} 请求, ${stats.requestsPerSecond.toFixed(1)} req/s`
      );
    });

    const result = await thunderbench.runBenchmark();
    console.log("测试完成:", result);
    return result;
  } finally {
    thunderbench.destroy();
  }
}

/**
 * 示例2：使用便捷函数
 */
async function example2(): Promise<BenchmarkResult> {
  const config: BenchmarkConfig = {
    name: "便捷函数测试",
    groups: [
      {
        name: "简单测试",
        http: { baseUrl: "http://localhost:3001" },
        threads: 1,
        connections: 10,
        duration: 5,
        executionMode: "parallel",
        tests: [
          {
            name: "快速测试",
            request: { method: "GET", url: "/" },
            weight: 100,
          },
        ],
      },
    ],
  };

  const result = await runBenchmark(config, { verbose: true });
  console.log("便捷函数测试完成:", result);
  return result;
}

/**
 * 示例3：配置验证
 */
function example3(): boolean {
  const config: BenchmarkConfig = {
    name: "配置验证测试",
    groups: [
      {
        name: "测试组",
        http: { baseUrl: "http://localhost:3001" },
        threads: 2,
        connections: 20,
        duration: 10,
        executionMode: "parallel",
        tests: [
          {
            name: "验证测试",
            request: { method: "GET", url: "/" },
            weight: 100,
          },
        ],
      },
    ],
  };

  try {
    validateConfig(config);
    console.log("✅ 配置验证通过");
    return true;
  } catch (error) {
    console.error("❌ 配置验证失败:", (error as Error).message);
    return false;
  }
}

/**
 * 示例4：自定义报告处理
 */
async function example4(): Promise<BenchmarkResult> {
  const config: BenchmarkConfig = {
    name: "自定义报告测试",
    groups: [
      {
        name: "报告测试组",
        http: { baseUrl: "http://localhost:3001" },
        threads: 1,
        connections: 5,
        duration: 5,
        executionMode: "parallel",
        tests: [
          {
            name: "报告测试",
            request: { method: "GET", url: "/" },
            weight: 100,
          },
        ],
      },
    ],
  };

  const thunderbench = new ThunderBench(config, {
    outputDir: "./custom-reports",
    verbose: false,
  });

  try {
    const result = await thunderbench.runBenchmark();

    // 自定义报告处理
    console.log("=== 自定义报告 ===");
    console.log(`总请求数: ${result.overallStats.totalRequests}`);
    console.log(
      `成功率: ${((result.overallStats.successfulRequests / result.overallStats.totalRequests) * 100).toFixed(1)}%`
    );
    console.log(`平均响应时间: ${result.overallStats.averageResponseTime}ms`);
    console.log(`吞吐量: ${result.overallStats.requestsPerSecond.toFixed(1)} req/s`);

    return result;
  } finally {
    thunderbench.destroy();
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log("🚀 ThunderBench 编程使用示例\n");

  try {
    console.log("=== 示例1：使用 ThunderBench 类 ===");
    await example1();
    console.log();

    console.log("=== 示例2：使用便捷函数 ===");
    await example2();
    console.log();

    console.log("=== 示例3：配置验证 ===");
    example3();
    console.log();

    console.log("=== 示例4：自定义报告 ===");
    await example4();
    console.log();

    console.log("✅ 所有示例执行完成！");
  } catch (error) {
    console.error("❌ 示例执行失败:", error);
  }
}

// 直接运行
main();

export { example1, example2, example3, example4 };

