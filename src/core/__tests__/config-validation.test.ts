import { describe, it, expect } from "vitest";
import { validateConfig } from "../config-validation";
import { BenchmarkConfig } from "../../types";

describe("配置验证", () => {
  describe("validateConfig", () => {
    it("应该验证正确的配置", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              { name: "login", weight: 60, request: { method: "POST", url: "/auth/login" } },
              { name: "register", weight: 40, request: { method: "POST", url: "/auth/register" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("当测试组为空时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [],
      };

      expect(() => validateConfig(config)).toThrow("至少需要一个测试组");
    });

    it("当测试组没有测试接口时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "empty-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow('测试组 "empty-group" 至少需要一个测试接口');
    });

    it("当测试组没有名称时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("测试组名称不能为空");
    });

    it("当测试接口没有名称时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            tests: [{ name: "", weight: 100, request: { method: "POST", url: "/auth/login" } }],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("测试接口名称不能为空");
    });

    it("当并发数不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 0,
            requests: 1000,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("并发数必须大于0");
    });

    it("当既没有指定requests也没有指定duration时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow(
        '测试组 "user-group" 必须指定 requests 或 duration'
      );
    });

    it("当同时指定requests和duration时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 1000,
            duration: 60,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow(
        '测试组 "user-group" 不能同时指定 requests 和 duration'
      );
    });

    it("当请求数不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 0,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("请求数必须大于0");
    });

    it("当测试时长不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            duration: 0,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("测试时长必须大于0");
    });

    it("应该正确验证多个测试组", () => {
      const config: BenchmarkConfig = {
        groups: [
          {
            name: "group-1",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            concurrent: 10,
            requests: 500,
            tests: [{ name: "test-1", weight: 100, request: { method: "GET", url: "/test1" } }],
          },
          {
            name: "group-2",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "sequential",
            concurrent: 5,
            duration: 60,
            tests: [{ name: "test-2", weight: 100, request: { method: "GET", url: "/test2" } }],
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
