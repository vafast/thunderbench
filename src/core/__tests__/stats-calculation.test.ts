import { describe, it, expect } from "vitest";
import { calculateStats, calculatePercentile } from "../stats-calculation";
import { RequestResult } from "../../types";

describe("统计计算", () => {
  describe("百分位数计算", () => {
    it("应该正确计算P50", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculatePercentile(values, 50);
      expect(result).toBe(55); // (50 + 60) / 2
    });

    it("应该正确计算P90", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculatePercentile(values, 90);
      expect(result).toBe(91); // 90% of 10 = 9th element (index 8)
    });

    it("应该正确计算P95", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculatePercentile(values, 95);
      expect(result).toBe(95.5); // 95% of 10 = 9.5th element
    });

    it("应该正确计算P99", () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const result = calculatePercentile(values, 99);
      expect(result).toBe(99.1); // 99% of 10 = 9.9th element
    });

    it("应该处理空数组", () => {
      const result = calculatePercentile([], 50);
      expect(result).toBe(0);
    });

    it("应该处理单个值", () => {
      const result = calculatePercentile([42], 50);
      expect(result).toBe(42);
    });
  });

  describe("统计指标计算", () => {
    it("应该正确计算成功请求的统计信息", () => {
      const results: RequestResult[] = [
        {
          name: "test",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 200,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 300,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.failedRequests).toBe(0);
      expect(stats.timeoutRequests).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(200);
      expect(stats.minResponseTime).toBe(100);
      expect(stats.maxResponseTime).toBe(300);
      expect(stats.errorRate).toBe(0);
      expect(stats.timeoutRate).toBe(0);
      expect(stats.slowRate).toBe(0);
      expect(stats.totalRequestSize).toBe(300);
      expect(stats.totalResponseSize).toBe(600);
    });

    it("应该正确计算混合结果的统计信息", () => {
      const results: RequestResult[] = [
        {
          name: "test",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: false,
          responseTime: 5000,
          error: "timeout",
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 0,
          isTimeout: true,
        },
        {
          name: "test",
          success: false,
          responseTime: 800,
          error: "server error",
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 0,
          isSlow: true,
        },
        {
          name: "test",
          success: true,
          responseTime: 150,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequests).toBe(4);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(2);
      expect(stats.timeoutRequests).toBe(1);
      expect(stats.slowRequests).toBe(1);
      expect(stats.averageResponseTime).toBe(1512.5);
      expect(stats.minResponseTime).toBe(100);
      expect(stats.maxResponseTime).toBe(5000);
      expect(stats.errorRate).toBe(0.5);
      expect(stats.timeoutRate).toBe(0.25);
      expect(stats.slowRate).toBe(0.25);
    });

    it("应该正确计算每秒请求数", () => {
      const startTime = Date.now() - 10000; // 10 seconds ago
      const results: RequestResult[] = [
        {
          name: "test",
          success: true,
          responseTime: 100,
          timestamp: startTime + 1000,
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 200,
          timestamp: startTime + 2000,
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 300,
          timestamp: startTime + 3000,
          requestSize: 100,
          responseSize: 200,
        },
      ];

      const stats = calculateStats(results, startTime);

      expect(stats.requestsPerSecond).toBeCloseTo(1.0, 1); // 3 requests / 3 seconds (0ms to 3000ms from startTime)
    });

    it("应该处理空结果", () => {
      const stats = calculateStats([]);

      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.averageResponseTime).toBe(0);
      expect(stats.minResponseTime).toBe(0);
      expect(stats.maxResponseTime).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(stats.requestsPerSecond).toBe(0);
    });

    it("应该正确计算百分位数", () => {
      const results: RequestResult[] = [
        {
          name: "test",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 200,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 300,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 400,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "test",
          success: true,
          responseTime: 500,
          timestamp: Date.now(),
          requestSize: 100,
          responseSize: 200,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.p50ResponseTime).toBe(300);
      expect(stats.p90ResponseTime).toBe(460);
      expect(stats.p95ResponseTime).toBe(480);
      expect(stats.p99ResponseTime).toBe(496);
    });

    it("应该处理缺少可选字段的结果", () => {
      const results: RequestResult[] = [
        { name: "test", success: true, responseTime: 100, timestamp: Date.now() },
        {
          name: "test",
          success: false,
          responseTime: 5000,
          error: "timeout",
          timestamp: Date.now(),
          isTimeout: true,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequestSize).toBe(0);
      expect(stats.totalResponseSize).toBe(0);
      expect(stats.timeoutRequests).toBe(1);
      expect(stats.slowRequests).toBe(0);
    });
  });
});
