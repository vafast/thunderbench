import { describe, it } from "vitest";
import { ReportStorage } from "../report-storage";
import { validateConfig } from "../config-validation";
import { calculateRequestDistribution } from "../weight-distribution";
import { calculateStats } from "../stats-calculation";
import {
  BenchmarkResult,
  BenchmarkConfig,
  DetailedStats,
  RequestResult,
  GroupResult,
} from "../../types";
import fs from "fs/promises";
import path from "path";

describe("报告存储集成测试", () => {
  it("应该使用真实配置文件生成完整报告", async () => {
    // 1. 加载配置文件
    const configPath = path.join(process.cwd(), "test-config.ts");
    const configModule = await import(configPath);
    const config: BenchmarkConfig = configModule.default;

    console.log("\n📁 加载配置文件:", configPath);
    console.log("🔍 配置验证...");

    // 2. 验证配置
    validateConfig(config);
    console.log("✅ 配置验证通过");

    // 3. 模拟测试执行结果
    console.log("🚀 模拟测试执行...");
    const result = createRealisticBenchmarkResult(config);

    // 4. 生成报告
    console.log("📊 生成测试报告...");
    const reportStorage = new ReportStorage();
    const reportPath = await reportStorage.saveTestResult(
      result,
      config,
      "integration-test-reports"
    );

    console.log(`\n🎯 集成测试报告已生成到: ${reportPath}`);
    console.log("\n📂 生成的文件结构:");

    // 5. 显示生成的文件结构
    await displayFileStructure(reportPath);

    // 6. 显示部分文件内容
    await displayFileContents(reportPath);

    console.log("\n✨ 集成测试完成！请检查生成的文件");
  });
});

// 根据配置创建真实的测试结果
function createRealisticBenchmarkResult(config: BenchmarkConfig): BenchmarkResult {
  const startTime = Date.now() - 30000; // 30秒前开始
  const endTime = Date.now();
  const duration = endTime - startTime;

  const groups: GroupResult[] = config.groups.map((groupConfig, groupIndex) => {
    // 根据配置计算请求分布
    const totalRequests = groupConfig.requests || 20; // 如果是duration模式，模拟20个请求
    const distribution = calculateRequestDistribution(groupConfig.tests, totalRequests);

    // 为每个接口生成请求结果
    const requests: RequestResult[] = [];

    groupConfig.tests.forEach((testConfig) => {
      const requestCount = distribution[testConfig.name];

      for (let i = 0; i < requestCount; i++) {
        const request = createRealisticRequest(
          testConfig.name,
          testConfig.request.method,
          testConfig.request.url || "/",
          startTime + Math.random() * duration,
          groupIndex === 1 // 第二个组模拟一些错误
        );
        requests.push(request);
      }
    });

    // 计算组统计
    const stats = calculateStats(requests, startTime);

    return {
      name: groupConfig.name,
      stats,
      requests,
    };
  });

  // 计算总体统计
  const allRequests = groups.flatMap((g) => g.requests);
  const overallStats = calculateStats(allRequests, startTime);

  return {
    startTime,
    endTime,
    duration,
    groups,
    overallStats,
  };
}

// 创建真实的请求结果
function createRealisticRequest(
  name: string,
  method: string,
  url: string,
  timestamp: number,
  introduceErrors: boolean = false
): RequestResult {
  // 模拟不同的响应时间分布
  const baseResponseTime = getBaseResponseTime(name);
  const responseTime = baseResponseTime + Math.random() * 200; // 添加随机波动

  // 模拟错误情况
  const isError = introduceErrors && Math.random() < 0.1; // 10%错误率
  const isTimeout = !isError && Math.random() < 0.02; // 2%超时率
  const isSlow = !isError && !isTimeout && responseTime > 800; // 响应时间>800ms为慢

  const success = !isError && !isTimeout;

  return {
    name,
    success,
    responseTime: Math.round(responseTime),
    statusCode: success
      ? Math.random() > 0.1
        ? 200
        : 201
      : isTimeout
      ? undefined
      : Math.random() > 0.5
      ? 404
      : 500,
    error: success ? undefined : isTimeout ? "Request timeout" : getRandomError(),
    timestamp: Math.round(timestamp),
    requestSize: getRequestSize(method),
    responseSize: success ? getResponseSize(name) : 0,
    isTimeout,
    isSlow,
  };
}

// 根据接口名称获取基础响应时间
function getBaseResponseTime(name: string): number {
  const baseTimes: Record<string, number> = {
    "get-user": 150,
    "create-post": 250,
    "get-posts": 300,
    "get-post-detail": 120,
  };
  return baseTimes[name] || 200;
}

// 获取请求大小
function getRequestSize(method: string): number {
  return method === "POST" ? 150 + Math.random() * 100 : 50 + Math.random() * 50;
}

// 获取响应大小
function getResponseSize(name: string): number {
  const sizes: Record<string, number> = {
    "get-user": 200,
    "create-post": 150,
    "get-posts": 2000,
    "get-post-detail": 300,
  };
  const baseSize = sizes[name] || 200;
  return baseSize + Math.random() * 100;
}

// 获取随机错误信息
function getRandomError(): string {
  const errors = [
    "Network timeout",
    "Server internal error",
    "Not found",
    "Bad request",
    "Database connection failed",
    "Rate limit exceeded",
  ];
  return errors[Math.floor(Math.random() * errors.length)];
}

// 显示文件结构
async function displayFileStructure(reportPath: string, indent: string = ""): Promise<void> {
  try {
    const items = await fs.readdir(reportPath, { withFileTypes: true });

    for (const item of items) {
      const itemPath = path.join(reportPath, item.name);

      if (item.isDirectory()) {
        console.log(`${indent}📁 ${item.name}/`);
        await displayFileStructure(itemPath, indent + "  ");
      } else {
        const stats = await fs.stat(itemPath);
        console.log(`${indent}📄 ${item.name} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    }
  } catch (error) {
    console.log(`${indent}❌ 无法读取目录: ${error}`);
  }
}

// 显示部分文件内容
async function displayFileContents(reportPath: string): Promise<void> {
  console.log("\n📄 部分文件内容预览:");

  try {
    // 显示摘要文件
    const summaryPath = path.join(reportPath, "summary.txt");
    const summary = await fs.readFile(summaryPath, "utf-8");
    console.log("\n=== summary.txt ===");
    console.log(summary.substring(0, 500) + (summary.length > 500 ? "..." : ""));

    // 显示第一个组的摘要
    const groups = await fs.readdir(path.join(reportPath, "logs"), { withFileTypes: true });
    const firstGroup = groups.find((item) => item.isDirectory());

    if (firstGroup) {
      const groupSummaryPath = path.join(reportPath, "logs", firstGroup.name, "summary.txt");
      const groupSummary = await fs.readFile(groupSummaryPath, "utf-8");
      console.log(`\n=== logs/${firstGroup.name}/summary.txt ===`);
      console.log(groupSummary);
    }
  } catch (error) {
    console.log("❌ 读取文件内容时出错:", error);
  }
}
