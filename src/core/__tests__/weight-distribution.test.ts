import { describe, it, expect } from "vitest";
import { calculateRequestDistribution } from "../weight-distribution";
import { ApiTestConfig } from "../../types";

describe("权重分配算法", () => {
  describe("calculateRequestDistribution", () => {
    it("应该正确分配简单权重的请求", () => {
      const tests: ApiTestConfig[] = [
        { name: "login", weight: 60, request: { method: "POST", url: "/auth/login" } },
        { name: "register", weight: 40, request: { method: "POST", url: "/auth/register" } },
      ];

      const result = calculateRequestDistribution(tests, 1000);

      expect(result).toEqual({
        login: 600,
        register: 400,
      });

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000);
    });

    it("应该正确处理小数权重", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 33.33, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 33.33, request: { method: "GET", url: "/b" } },
        { name: "C", weight: 33.34, request: { method: "GET", url: "/c" } },
      ];

      const result = calculateRequestDistribution(tests, 1000);

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(1000);

      // 验证权重最高的接口获得剩余请求
      expect(result["C"]).toBeGreaterThan(result["A"]);
      expect(result["C"]).toBeGreaterThan(result["B"]);
    });

    it("当权重总和不为100时应该抛出错误", () => {
      const tests: ApiTestConfig[] = [
        { name: "login", weight: 60, request: { method: "POST", url: "/auth/login" } },
        { name: "register", weight: 30, request: { method: "POST", url: "/auth/register" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 1000);
      }).toThrow("权重总和必须为100，当前为90");
    });

    it("应该处理权重为100的单个测试", () => {
      const tests: ApiTestConfig[] = [
        { name: "single", weight: 100, request: { method: "GET", url: "/single" } },
      ];

      const result = calculateRequestDistribution(tests, 500);

      expect(result).toEqual({
        single: 500,
      });
    });

    it("应该处理请求数较小的边缘情况", () => {
      const tests: ApiTestConfig[] = [
        { name: "A", weight: 60, request: { method: "GET", url: "/a" } },
        { name: "B", weight: 40, request: { method: "GET", url: "/b" } },
      ];

      const result = calculateRequestDistribution(tests, 7);

      // 验证总和
      const total = Object.values(result).reduce((sum, count) => sum + count, 0);
      expect(total).toBe(7);

      // 验证权重分配
      expect(result["A"]).toBeGreaterThan(result["B"]);
    });

    it("当权重为负数时应该抛出错误", () => {
      const tests: ApiTestConfig[] = [
        { name: "login", weight: -10, request: { method: "POST", url: "/auth/login" } },
        { name: "register", weight: 110, request: { method: "POST", url: "/auth/register" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 1000);
      }).toThrow("权重必须在0-100之间，当前: -10");
    });

    it("当权重大于100时应该抛出错误", () => {
      const tests: ApiTestConfig[] = [
        { name: "login", weight: 150, request: { method: "POST", url: "/auth/login" } },
        { name: "register", weight: -50, request: { method: "POST", url: "/auth/register" } },
      ];

      expect(() => {
        calculateRequestDistribution(tests, 1000);
      }).toThrow("权重必须在0-100之间，当前: 150");
    });
  });
});
