import { describe, it, expect } from "vitest";
import { validateConfig } from "../config-validation";
import { BenchmarkConfig } from "../../types";

describe("配置验证扩展测试", () => {
  describe("请求配置验证", () => {
    it("当请求缺少method时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { url: "/test" } as any, // 缺少method
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow('测试接口 "test" 缺少请求方法');
    });

    it("当请求缺少url时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET" } as any, // 缺少url
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow('测试接口 "test" 缺少请求URL');
    });
  });

  describe("执行模式验证", () => {
    it("当执行模式无效时应该抛出错误", () => {
      const config: any = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "invalid-mode", // 无效的执行模式
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET", url: "/test" },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow('执行模式必须是 "parallel" 或 "sequential"');
    });
  });

  describe("延迟配置验证", () => {
    it("当延迟为负数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "sequential",
            concurrent: 10,
            requests: 1000,
            delay: -100, // 负数延迟
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET", url: "/test" },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("延迟时间不能为负数");
    });
  });

  describe("错误处理配置验证", () => {
    it("当expectMaxResponseTime为0时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET", url: "/test" },
                errorHandling: { expectMaxResponseTime: 0 },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("期望最大响应时间必须大于0");
    });

    it("当expectMaxResponseTime为负数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET", url: "/test" },
                errorHandling: { expectMaxResponseTime: -500 },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("期望最大响应时间必须大于0");
    });
  });

  describe("HTTP配置验证", () => {
    it("当HTTP timeout为负数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: {
              baseUrl: "https://api.example.com",
              timeout: -1000, // 负数超时
            },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test",
                weight: 100,
                request: { method: "GET", url: "/test" },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("HTTP超时时间不能为负数");
    });
  });

  describe("权重边缘情况验证", () => {
    it("应该处理权重为0的情况", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test1",
                weight: 0,
                request: { method: "GET", url: "/test1" },
              },
              {
                name: "test2",
                weight: 100,
                request: { method: "GET", url: "/test2" },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("应该处理小数权重", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "test-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              {
                name: "test1",
                weight: 33.33,
                request: { method: "GET", url: "/test1" },
              },
              {
                name: "test2",
                weight: 66.67,
                request: { method: "GET", url: "/test2" },
              },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
