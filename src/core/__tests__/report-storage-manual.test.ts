import { describe, it } from "vitest";
import { ReportStorage } from "../report-storage";
import { BenchmarkResult, BenchmarkConfig, DetailedStats, RequestResult } from "../../types";

describe("报告存储手动验证", () => {
  it("应该真实生成文件和目录", async () => {
    const reportStorage = new ReportStorage();
    const testDir = "manual-test-reports";
    
    // 创建模拟数据
    const result = createMockBenchmarkResult();
    const config = createMockConfig();
    
    // 生成报告
    const reportPath = await reportStorage.saveTestResult(result, config, testDir);
    
    console.log(`\n🎯 报告已生成到: ${reportPath}`);
    console.log(`\n请检查以下文件是否存在:`);
    console.log(`- ${reportPath}/results.json`);
    console.log(`- ${reportPath}/summary.txt`);
    console.log(`- ${reportPath}/config.json`);
    console.log(`- ${reportPath}/logs/all.log`);
    console.log(`- ${reportPath}/logs/errors.log`);
    console.log(`- ${reportPath}/logs/user-auth-group/requests.log`);
    console.log(`- ${reportPath}/logs/user-auth-group/performance.json`);
    console.log(`- ${reportPath}/logs/user-auth-group/summary.txt`);
    console.log(`- ${reportPath}/logs/order-management/requests.log`);
    console.log(`- ${reportPath}/logs/order-management/performance.json`);
    console.log(`- ${reportPath}/logs/order-management/summary.txt`);
    
    // 注意：这个测试不会自动清理文件，方便手动查看
  });
});

// 辅助函数
function createMockBenchmarkResult(): BenchmarkResult {
  const startTime = Date.now() - 10000;
  const endTime = Date.now();
  
  return {
    startTime,
    endTime,
    duration: endTime - startTime,
    groups: [
      {
        name: "user-auth-group",
        stats: createMockStats(2, 2, 0),
        requests: [createMockRequest("login", true, 145), createMockRequest("register", true, 168)],
      },
      {
        name: "order-management",
        stats: createMockStats(2, 1, 1),
        requests: [
          createMockRequest("create-order", true, 234),
          createMockRequest("get-orders", false, 89, "Database error"),
        ],
      },
    ],
    overallStats: createMockStats(4, 3, 1),
  };
}

function createMockConfig(): BenchmarkConfig {
  return {
    groups: [
      {
        name: "user-auth-group",
        http: { baseUrl: "https://api.example.com" },
        executionMode: "parallel",
        concurrent: 10,
        requests: 1000,
        tests: [
          { name: "login", weight: 60, request: { method: "POST", url: "/auth/login" } },
          { name: "register", weight: 40, request: { method: "POST", url: "/auth/register" } },
        ],
      },
      {
        name: "order-management",
        http: { baseUrl: "https://api.example.com" },
        executionMode: "sequential",
        concurrent: 5,
        duration: 60,
        tests: [
          { name: "create-order", weight: 50, request: { method: "POST", url: "/api/orders" } },
          { name: "get-orders", weight: 50, request: { method: "GET", url: "/api/orders" } },
        ],
      },
    ],
  };
}

function createMockStats(total: number, success: number, failed: number): DetailedStats {
  return {
    totalRequests: total,
    successfulRequests: success,
    failedRequests: failed,
    timeoutRequests: 0,
    slowRequests: 0,
    averageResponseTime: 156.5,
    minResponseTime: 89,
    maxResponseTime: 234,
    p50ResponseTime: 156.5,
    p90ResponseTime: 201,
    p95ResponseTime: 217.5,
    p99ResponseTime: 232.5,
    requestsPerSecond: 22.1,
    errorRate: failed / total,
    timeoutRate: 0,
    slowRate: 0,
    totalRequestSize: 0,
    totalResponseSize: 0,
  };
}

function createMockRequest(
  name: string,
  success: boolean,
  responseTime: number,
  error?: string
): RequestResult {
  return {
    name,
    success,
    responseTime,
    statusCode: success ? 200 : 500,
    error,
    timestamp: Date.now(),
    requestSize: 100,
    responseSize: 200,
    isTimeout: false,
    isSlow: false,
  };
}
