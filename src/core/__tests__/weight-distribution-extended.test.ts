import { describe, it, expect } from "vitest";
import { calculateRequestDistribution } from "../weight-distribution";
import { ApiTestConfig } from "../../types";

describe("权重分配算法扩展测试", () => {
  describe("权重为0的边缘情况", () => {
    it("应该正确处理权重为0的接口", () => {
      const tests: ApiTestConfig[] = [
        { name: "main", weight: 100, request: { method: "GET", url: "/main" } },
        { name: "disabled", weight: 0, request: { method: "GET", url: "/disabled" } },
      ];

      const result = calculateRequestDistribution(tests, 1000);

      expect(result).toEqual({
        main: 1000,
        disabled: 0,
      });

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000);
    });

    it("应该正确处理多个权重为0的接口", () => {
      const tests: ApiTestConfig[] = [
        { name: "active1", weight: 50, request: { method: "GET", url: "/active1" } },
        { name: "active2", weight: 50, request: { method: "GET", url: "/active2" } },
        { name: "disabled1", weight: 0, request: { method: "GET", url: "/disabled1" } },
        { name: "disabled2", weight: 0, request: { method: "GET", url: "/disabled2" } },
      ];

      const result = calculateRequestDistribution(tests, 1000);

      expect(result).toEqual({
        active1: 500,
        active2: 500,
        disabled1: 0,
        disabled2: 0,
      });

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000);
    });
  });

  describe("精度处理", () => {
    it("应该正确处理高精度小数权重", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 33.333, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 33.333, request: { method: "GET", url: "/b" } },
        { name: "C", weight: 33.334, request: { method: "GET", url: "/c" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 1000);
      }).not.toThrow(); // 应该允许小的精度误差
    });

    it("应该拒绝超出精度范围的权重总和", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 33.33, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 33.33, request: { method: "GET", url: "/b" } },
        { name: "C", weight: 33.33, request: { method: "GET", url: "/c" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 1000);
      }).toThrow("权重总和必须为100，当前为99.99");
    });
  });

  describe("极端请求数量", () => {
    it("应该处理请求数量为1的情况", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 60, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 40, request: { method: "GET", url: "/b" } },
      ];

      const result = calculateRequestDistribution(tests, 1);

      // 权重高的接口应该获得请求
      expect(result["A"]).toBe(1);
      expect(result["B"]).toBe(0);

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1);
    });

    it("应该处理请求数量为2的情况", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 60, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 40, request: { method: "GET", url: "/b" } },
      ];

      const result = calculateRequestDistribution(tests, 2);

      // 应该按权重分配，权重高的获得剩余请求
      expect(result["A"]).toBe(2);
      expect(result["B"]).toBe(0);

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(2);
    });

    it("应该处理大量请求的情况", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 50, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 50, request: { method: "GET", url: "/b" } },
      ];

      const result = calculateRequestDistribution(tests, 1000000);

      expect(result["A"]).toBe(500000);
      expect(result["B"]).toBe(500000);

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000000);
    });
  });

  describe("请求数量为0的错误情况", () => {
    it("当请求数量为0时应该抛出错误", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 100, request: { method: "GET", url: "/a" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 0);
      }).toThrow("请求总数必须大于0");
    });

    it("当请求数量为负数时应该抛出错误", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 100, request: { method: "GET", url: "/a" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, -100);
      }).toThrow("请求总数必须大于0");
    });
  });
});
