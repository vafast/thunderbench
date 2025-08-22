import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ReportStorage } from "../report-storage";
import {
  BenchmarkResult,
  BenchmarkConfig,
  GroupResult,
  DetailedStats,
  RequestResult,
} from "../../types";
import fs from "fs/promises";
import path from "path";

describe("报告存储", () => {
  let reportStorage: ReportStorage;
  let testDir: string;

  beforeEach(async () => {
    reportStorage = new ReportStorage();
    testDir = path.join(process.cwd(), "test-reports");
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  afterEach(async () => {
    // 清理测试目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {}
  });

  describe("saveTestResult", () => {
    it("应该创建正确的目录结构", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);

      // 验证主目录存在
      expect(await fs.stat(reportPath)).toBeDefined();

      // 验证子目录和文件存在
      const logsDir = path.join(reportPath, "logs");
      expect(await fs.stat(logsDir)).toBeDefined();

      // 验证组文件夹存在
      const userAuthDir = path.join(logsDir, "user-auth-group");
      const orderManagementDir = path.join(logsDir, "order-management");
      expect(await fs.stat(userAuthDir)).toBeDefined();
      expect(await fs.stat(orderManagementDir)).toBeDefined();

      // 验证主要文件存在
      expect(await fs.stat(path.join(reportPath, "results.json"))).toBeDefined();
      expect(await fs.stat(path.join(reportPath, "summary.txt"))).toBeDefined();
      expect(await fs.stat(path.join(reportPath, "config.json"))).toBeDefined();
    });

    it("应该保存完整的测试结果", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);
      const resultsFile = path.join(reportPath, "results.json");

      const savedResults = JSON.parse(await fs.readFile(resultsFile, "utf-8"));

      expect(savedResults.metadata.startTime).toBe(result.startTime);
      expect(savedResults.metadata.endTime).toBe(result.endTime);
      expect(savedResults.overview.totalRequests).toBe(result.overallStats.totalRequests);
      expect(savedResults.groups).toHaveLength(2);
    });

    it("应该保存测试配置", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);
      const configFile = path.join(reportPath, "config.json");

      const savedConfig = JSON.parse(await fs.readFile(configFile, "utf-8"));

      expect(savedConfig.groups).toHaveLength(2);
      expect(savedConfig.groups[0].name).toBe("user-auth-group");
      expect(savedConfig.groups[1].name).toBe("order-management");
    });

    it("应该生成可读的测试摘要", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);
      const summaryFile = path.join(reportPath, "summary.txt");

      const summary = await fs.readFile(summaryFile, "utf-8");

      expect(summary).toContain("性能测试摘要");
      expect(summary).toContain("总请求数: 4");
      expect(summary).toContain("成功率: 75.0%");
      expect(summary).toContain("平均响应时间: 156.5ms");
    });
  });

  describe("日志文件生成", () => {
    it("应该生成所有请求的日志", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);
      const allLogFile = path.join(reportPath, "logs", "all.log");

      const allLogs = await fs.readFile(allLogFile, "utf-8");
      const logLines = allLogs.trim().split("\n");

      expect(logLines).toHaveLength(4); // 2个组，每组2个请求
      expect(logLines[0]).toContain("user-auth-group");
      expect(logLines[2]).toContain("order-management");
    });

    it("应该生成错误请求的日志", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);
      const errorsLogFile = path.join(reportPath, "logs", "errors.log");

      const errorsLogs = await fs.readFile(errorsLogFile, "utf-8");
      const logLines = errorsLogs.trim().split("\n");

      // 应该有1个错误请求
      expect(logLines).toHaveLength(1);
      expect(logLines[0]).toContain("error");
    });

    it("应该为每个组生成独立的日志文件", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);

      // 验证用户认证组日志
      const userAuthLogFile = path.join(reportPath, "logs", "user-auth-group", "requests.log");
      const userAuthLogs = await fs.readFile(userAuthLogFile, "utf-8");
      const userAuthLogLines = userAuthLogs.trim().split("\n");

      expect(userAuthLogLines).toHaveLength(2);
      userAuthLogLines.forEach((line) => {
        const log = JSON.parse(line);
        expect(log.group).toBe("user-auth-group");
      });

      // 验证订单管理组日志
      const orderLogFile = path.join(reportPath, "logs", "order-management", "requests.log");
      const orderLogs = await fs.readFile(orderLogFile, "utf-8");
      const orderLogLines = orderLogs.trim().split("\n");

      expect(orderLogLines).toHaveLength(2);
      orderLogLines.forEach((line) => {
        const log = JSON.parse(line);
        expect(log.group).toBe("order-management");
      });
    });

    it("应该为每个组生成性能统计", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);

      // 验证用户认证组性能统计
      const userAuthPerfFile = path.join(reportPath, "logs", "user-auth-group", "performance.json");
      const userAuthPerf = JSON.parse(await fs.readFile(userAuthPerfFile, "utf-8"));

      expect(userAuthPerf.totalRequests).toBe(2);
      expect(userAuthPerf.successfulRequests).toBe(2);
      expect(userAuthPerf.averageResponseTime).toBe(156.5);

      // 验证订单管理组性能统计
      const orderPerfFile = path.join(reportPath, "logs", "order-management", "performance.json");
      const orderPerf = JSON.parse(await fs.readFile(orderPerfFile, "utf-8"));

      expect(orderPerf.totalRequests).toBe(2);
      expect(orderPerf.successfulRequests).toBe(1);
      expect(orderPerf.failedRequests).toBe(1);
    });

    it("应该为每个组生成性能摘要", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);

      // 验证用户认证组摘要
      const userAuthSummaryFile = path.join(reportPath, "logs", "user-auth-group", "summary.txt");
      const userAuthSummary = await fs.readFile(userAuthSummaryFile, "utf-8");

      expect(userAuthSummary).toContain("user-auth-group 组性能摘要");
      expect(userAuthSummary).toContain("执行模式: parallel");
      expect(userAuthSummary).toContain("并发数: 10");
      expect(userAuthSummary).toContain("成功率: 100.0%");

      // 验证订单管理组摘要
      const orderSummaryFile = path.join(reportPath, "logs", "order-management", "summary.txt");
      const orderSummary = await fs.readFile(orderSummaryFile, "utf-8");

      expect(orderSummary).toContain("order-management 组性能摘要");
      expect(orderSummary).toContain("执行模式: sequential");
      expect(orderSummary).toContain("并发数: 5");
      expect(orderSummary).toContain("成功率: 50.0%");
    });
  });

  describe("错误处理", () => {
    it("应该处理空的测试结果", async () => {
      const emptyResult = createEmptyBenchmarkResult();
      const config = createMockConfig();

      const reportPath = await reportStorage.saveTestResult(emptyResult, config, testDir);

      // 应该能正常创建目录和文件
      expect(await fs.stat(reportPath)).toBeDefined();
      expect(await fs.stat(path.join(reportPath, "results.json"))).toBeDefined();
    });

    it("应该处理没有请求的组", async () => {
      const result = createMockBenchmarkResult();
      const config = createMockConfig();

      // 清空一个组的请求
      result.groups[0].requests = [];

      const reportPath = await reportStorage.saveTestResult(result, config, testDir);

      // 应该能正常创建组文件夹，但日志文件为空
      const userAuthLogFile = path.join(reportPath, "logs", "user-auth-group", "requests.log");
      const userAuthLogs = await fs.readFile(userAuthLogFile, "utf-8");
      expect(userAuthLogs.trim()).toBe("");
    });
  });
});

// 辅助函数：创建模拟的测试结果
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

function createEmptyBenchmarkResult(): BenchmarkResult {
  return {
    startTime: Date.now(),
    endTime: Date.now(),
    duration: 0,
    groups: [],
    overallStats: createMockStats(0, 0, 0),
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
