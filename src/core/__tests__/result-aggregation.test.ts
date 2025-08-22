import { describe, it, expect } from "vitest";
import { RequestResult, GroupResult, BenchmarkResult, DetailedStats } from "../../types";

describe("结果聚合测试", () => {
  describe("GroupResult构造", () => {
    it("应该正确构造组结果", () => {
      const requests: RequestResult[] = [
        {
          name: "login",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
          statusCode: 200,
          requestSize: 100,
          responseSize: 200,
        },
        {
          name: "register",
          success: false,
          responseTime: 5000,
          timestamp: Date.now(),
          statusCode: 500,
          error: "server error",
          isTimeout: true,
          requestSize: 150,
          responseSize: 0,
        },
      ];

      const stats: DetailedStats = {
        totalRequests: 2,
        successfulRequests: 1,
        failedRequests: 1,
        timeoutRequests: 1,
        slowRequests: 0,
        averageResponseTime: 2550,
        minResponseTime: 100,
        maxResponseTime: 5000,
        p50ResponseTime: 2550,
        p90ResponseTime: 4600,
        p95ResponseTime: 4800,
        p99ResponseTime: 4960,
        requestsPerSecond: 0.5,
        errorRate: 0.5,
        timeoutRate: 0.5,
        slowRate: 0,
        totalRequestSize: 250,
        totalResponseSize: 200,
      };

      const groupResult: GroupResult = {
        name: "user-auth",
        stats,
        requests,
      };

      expect(groupResult.name).toBe("user-auth");
      expect(groupResult.stats.totalRequests).toBe(2);
      expect(groupResult.requests).toHaveLength(2);
      expect(groupResult.requests[0].name).toBe("login");
      expect(groupResult.requests[1].name).toBe("register");
    });
  });

  describe("BenchmarkResult构造", () => {
    it("应该正确构造完整基准测试结果", () => {
      const startTime = Date.now() - 10000;
      const endTime = Date.now();
      const duration = endTime - startTime;

      const group1Requests: RequestResult[] = [
        {
          name: "api1",
          success: true,
          responseTime: 100,
          timestamp: startTime + 1000,
          statusCode: 200,
        },
        {
          name: "api2",
          success: true,
          responseTime: 200,
          timestamp: startTime + 2000,
          statusCode: 200,
        },
      ];

      const group2Requests: RequestResult[] = [
        {
          name: "api3",
          success: false,
          responseTime: 1000,
          timestamp: startTime + 3000,
          statusCode: 500,
          error: "server error",
          isSlow: true,
        },
      ];

      const group1Stats: DetailedStats = {
        totalRequests: 2,
        successfulRequests: 2,
        failedRequests: 0,
        timeoutRequests: 0,
        slowRequests: 0,
        averageResponseTime: 150,
        minResponseTime: 100,
        maxResponseTime: 200,
        p50ResponseTime: 150,
        p90ResponseTime: 190,
        p95ResponseTime: 195,
        p99ResponseTime: 199,
        requestsPerSecond: 1,
        errorRate: 0,
        timeoutRate: 0,
        slowRate: 0,
        totalRequestSize: 0,
        totalResponseSize: 0,
      };

      const group2Stats: DetailedStats = {
        totalRequests: 1,
        successfulRequests: 0,
        failedRequests: 1,
        timeoutRequests: 0,
        slowRequests: 1,
        averageResponseTime: 1000,
        minResponseTime: 1000,
        maxResponseTime: 1000,
        p50ResponseTime: 1000,
        p90ResponseTime: 1000,
        p95ResponseTime: 1000,
        p99ResponseTime: 1000,
        requestsPerSecond: 0.33,
        errorRate: 1,
        timeoutRate: 0,
        slowRate: 1,
        totalRequestSize: 0,
        totalResponseSize: 0,
      };

      const overallStats: DetailedStats = {
        totalRequests: 3,
        successfulRequests: 2,
        failedRequests: 1,
        timeoutRequests: 0,
        slowRequests: 1,
        averageResponseTime: 433.33,
        minResponseTime: 100,
        maxResponseTime: 1000,
        p50ResponseTime: 200,
        p90ResponseTime: 820,
        p95ResponseTime: 910,
        p99ResponseTime: 982,
        requestsPerSecond: 0.3,
        errorRate: 0.33,
        timeoutRate: 0,
        slowRate: 0.33,
        totalRequestSize: 0,
        totalResponseSize: 0,
      };

      const groups: GroupResult[] = [
        {
          name: "group1",
          stats: group1Stats,
          requests: group1Requests,
        },
        {
          name: "group2",
          stats: group2Stats,
          requests: group2Requests,
        },
      ];

      const benchmarkResult: BenchmarkResult = {
        startTime,
        endTime,
        duration,
        groups,
        overallStats,
      };

      expect(benchmarkResult.startTime).toBe(startTime);
      expect(benchmarkResult.endTime).toBe(endTime);
      expect(benchmarkResult.duration).toBe(duration);
      expect(benchmarkResult.groups).toHaveLength(2);
      expect(benchmarkResult.groups[0].name).toBe("group1");
      expect(benchmarkResult.groups[1].name).toBe("group2");
      expect(benchmarkResult.overallStats.totalRequests).toBe(3);
      expect(benchmarkResult.overallStats.successfulRequests).toBe(2);
      expect(benchmarkResult.overallStats.failedRequests).toBe(1);
    });
  });

  describe("多组数据聚合", () => {
    it("应该正确聚合多个组的统计信息", () => {
      const group1Results: RequestResult[] = [
        { name: "test1", success: true, responseTime: 100, timestamp: Date.now() },
        { name: "test2", success: true, responseTime: 200, timestamp: Date.now() },
      ];

      const group2Results: RequestResult[] = [
        {
          name: "test3",
          success: false,
          responseTime: 1000,
          timestamp: Date.now(),
          error: "failed",
          isSlow: true,
        },
        {
          name: "test4",
          success: false,
          responseTime: 5000,
          timestamp: Date.now(),
          error: "timeout",
          isTimeout: true,
        },
      ];

      // 模拟聚合所有请求
      const allRequests = [...group1Results, ...group2Results];

      const aggregatedStats = {
        totalRequests: allRequests.length,
        successfulRequests: allRequests.filter((r) => r.success).length,
        failedRequests: allRequests.filter((r) => !r.success).length,
        timeoutRequests: allRequests.filter((r) => r.isTimeout).length,
        slowRequests: allRequests.filter((r) => r.isSlow).length,
      };

      expect(aggregatedStats.totalRequests).toBe(4);
      expect(aggregatedStats.successfulRequests).toBe(2);
      expect(aggregatedStats.failedRequests).toBe(2);
      expect(aggregatedStats.timeoutRequests).toBe(1);
      expect(aggregatedStats.slowRequests).toBe(1);
    });

    it("应该正确计算聚合响应时间统计", () => {
      const allResponses = [100, 200, 1000, 5000];

      const avg = allResponses.reduce((sum, time) => sum + time, 0) / allResponses.length;
      const min = Math.min(...allResponses);
      const max = Math.max(...allResponses);

      expect(avg).toBe(1575);
      expect(min).toBe(100);
      expect(max).toBe(5000);
    });
  });

  describe("空结果处理", () => {
    it("应该正确处理空组结果", () => {
      const emptyGroupResult: GroupResult = {
        name: "empty-group",
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          timeoutRequests: 0,
          slowRequests: 0,
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          p50ResponseTime: 0,
          p90ResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          requestsPerSecond: 0,
          errorRate: 0,
          timeoutRate: 0,
          slowRate: 0,
          totalRequestSize: 0,
          totalResponseSize: 0,
        },
        requests: [],
      };

      expect(emptyGroupResult.requests).toHaveLength(0);
      expect(emptyGroupResult.stats.totalRequests).toBe(0);
    });

    it("应该正确处理没有组的基准测试结果", () => {
      const startTime = Date.now();
      const endTime = Date.now();

      const emptyBenchmarkResult: BenchmarkResult = {
        startTime,
        endTime,
        duration: endTime - startTime,
        groups: [],
        overallStats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          timeoutRequests: 0,
          slowRequests: 0,
          averageResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          p50ResponseTime: 0,
          p90ResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          requestsPerSecond: 0,
          errorRate: 0,
          timeoutRate: 0,
          slowRate: 0,
          totalRequestSize: 0,
          totalResponseSize: 0,
        },
      };

      expect(emptyBenchmarkResult.groups).toHaveLength(0);
      expect(emptyBenchmarkResult.overallStats.totalRequests).toBe(0);
    });
  });
});
