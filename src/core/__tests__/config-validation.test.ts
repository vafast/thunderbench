import { describe, it, expect } from "vitest";
import { validateConfig } from "../config-validation";
import { BenchmarkConfig } from "../../types";

describe("配置验证", () => {
  describe("validateConfig", () => {
    it("应该验证正确的配置", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
            duration: 30,
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
        name: "test-benchmark",
        groups: [],
      };

      expect(() => validateConfig(config)).toThrow("至少需要一个测试组");
    });

    it("当测试组没有测试接口时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "empty-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
            duration: 30,
            tests: [],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow('测试组 "empty-group" 至少需要一个测试接口');
    });

    it("当测试组没有名称时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
            duration: 30,
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
        name: "test-benchmark",
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
            duration: 30,
            tests: [{ name: "", weight: 100, request: { method: "POST", url: "/auth/login" } }],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("测试接口名称不能为空");
    });

    it("当线程数不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 0,
            connections: 10,
            duration: 30,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("线程数必须大于0");
    });

    it("当连接数不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 0,
            duration: 30,
            tests: [
              { name: "login", weight: 100, request: { method: "POST", url: "/auth/login" } },
            ],
          },
        ],
      };

      expect(() => validateConfig(config)).toThrow("连接数必须大于0");
    });

    it("当测试时长不是正数时应该抛出错误", () => {
      const config: BenchmarkConfig = {
        name: "test-benchmark",
        groups: [
          {
            name: "user-group",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
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
        name: "test-benchmark",
        groups: [
          {
            name: "group-1",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "parallel",
            threads: 4,
            connections: 10,
            duration: 30,
            tests: [{ name: "test-1", weight: 100, request: { method: "GET", url: "/test1" } }],
          },
          {
            name: "group-2",
            http: { baseUrl: "https://api.example.com" },
            executionMode: "sequential",
            threads: 2,
            connections: 5,
            duration: 15,
            tests: [{ name: "test-2", weight: 100, request: { method: "GET", url: "/test2" } }],
          },
        ],
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
