import { describe, it, expect } from "vitest";
import { calculateStats, calculatePercentile } from "../stats-calculation";
import { RequestResult } from "../../types";

describe("统计计算扩展测试", () => {
  describe("百分位数边缘情况", () => {
    it("应该处理所有值相同的数组", () => {
      const values = [100, 100, 100, 100, 100];

      expect(calculatePercentile(values, 50)).toBe(100);
      expect(calculatePercentile(values, 90)).toBe(100);
      expect(calculatePercentile(values, 99)).toBe(100);
    });

    it("应该处理两个值的数组", () => {
      const values = [100, 200];

      expect(calculatePercentile(values, 50)).toBe(150); // 中值
      expect(calculatePercentile(values, 90)).toBe(190); // 90% = 0.9 * (2-1) = 0.9
    });

    it("应该处理大量重复值的数组", () => {
      const values = [100, 100, 100, 200, 200, 200, 300];

      expect(calculatePercentile(values, 50)).toBe(200);
      expect(calculatePercentile(values, 90)).toBe(240); // 90% of 7 = 5.4 -> between index 5(200) and 6(300), 0.4 weight = 200 + 0.4*(300-200) = 240
    });
  });

  describe("统计计算边缘情况", () => {
    it("应该处理所有请求都超时的情况", () => {
      const results: RequestResult[] = [
        {
          name: "test1",
          success: false,
          responseTime: 5000,
          timestamp: Date.now(),
          error: "timeout",
          isTimeout: true,
        },
        {
          name: "test2",
          success: false,
          responseTime: 6000,
          timestamp: Date.now(),
          error: "timeout",
          isTimeout: true,
        },
        {
          name: "test3",
          success: false,
          responseTime: 7000,
          timestamp: Date.now(),
          error: "timeout",
          isTimeout: true,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(3);
      expect(stats.timeoutRequests).toBe(3);
      expect(stats.errorRate).toBe(1);
      expect(stats.timeoutRate).toBe(1);
      expect(stats.averageResponseTime).toBe(6000);
    });

    it("应该处理所有请求都响应过慢的情况", () => {
      const results: RequestResult[] = [
        {
          name: "test1",
          success: false,
          responseTime: 800,
          timestamp: Date.now(),
          error: "slow response",
          isSlow: true,
        },
        {
          name: "test2",
          success: false,
          responseTime: 900,
          timestamp: Date.now(),
          error: "slow response",
          isSlow: true,
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequests).toBe(2);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(2);
      expect(stats.slowRequests).toBe(2);
      expect(stats.slowRate).toBe(1);
      expect(stats.averageResponseTime).toBe(850);
    });

    it("应该处理响应时间为0的情况", () => {
      const results: RequestResult[] = [
        {
          name: "test1",
          success: true,
          responseTime: 0,
          timestamp: Date.now(),
        },
        {
          name: "test2",
          success: true,
          responseTime: 0,
          timestamp: Date.now(),
        },
      ];

      const stats = calculateStats(results);

      expect(stats.averageResponseTime).toBe(0);
      expect(stats.minResponseTime).toBe(0);
      expect(stats.maxResponseTime).toBe(0);
      expect(stats.p50ResponseTime).toBe(0);
      expect(stats.p90ResponseTime).toBe(0);
    });

    it("应该处理时间戳乱序的情况", () => {
      const baseTime = Date.now();
      const results: RequestResult[] = [
        {
          name: "test1",
          success: true,
          responseTime: 100,
          timestamp: baseTime + 3000, // 最晚
        },
        {
          name: "test2",
          success: true,
          responseTime: 200,
          timestamp: baseTime + 1000, // 最早
        },
        {
          name: "test3",
          success: true,
          responseTime: 300,
          timestamp: baseTime + 2000, // 中间
        },
      ];

      const stats = calculateStats(results, baseTime);

      // 应该使用最大时间戳计算持续时间
      expect(stats.requestsPerSecond).toBeCloseTo(1, 1); // 3请求 / 3秒
    });

    it("应该处理startTime未提供的情况", () => {
      const results: RequestResult[] = [
        {
          name: "test1",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
        },
      ];

      const stats = calculateStats(results); // 不提供startTime

      expect(stats.requestsPerSecond).toBe(0);
    });

    it("应该处理持续时间为0的情况", () => {
      const startTime = Date.now();
      const results: RequestResult[] = [
        {
          name: "test1",
          success: true,
          responseTime: 100,
          timestamp: startTime, // 时间戳与startTime相同
        },
      ];

      const stats = calculateStats(results, startTime);

      expect(stats.requestsPerSecond).toBe(0);
    });
  });

  describe("数据大小统计", () => {
    it("应该正确计算总请求和响应大小", () => {
      const results: RequestResult[] = [
        {
          name: "test1",
          success: true,
          responseTime: 100,
          timestamp: Date.now(),
          requestSize: 1000,
          responseSize: 2000,
        },
        {
          name: "test2",
          success: true,
          responseTime: 200,
          timestamp: Date.now(),
          requestSize: 1500,
          responseSize: 3000,
        },
        {
          name: "test3",
          success: false,
          responseTime: 300,
          timestamp: Date.now(),
          error: "failed",
          // 没有requestSize和responseSize
        },
      ];

      const stats = calculateStats(results);

      expect(stats.totalRequestSize).toBe(2500); // 1000 + 1500 + 0
      expect(stats.totalResponseSize).toBe(5000); // 2000 + 3000 + 0
    });
  });
});
