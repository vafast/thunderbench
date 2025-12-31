import type { BenchmarkConfig } from "thunderbench";

const config: BenchmarkConfig = {
  name: "复杂 wrk 测试演示",
  description: "展示 wrk 的各种参数配置和权重分配",
  groups: [
    {
      name: "高并发测试组",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "User-Agent": "wrk-benchmark/1.0",
          "Accept": "application/json",
        },
      },
      threads: 8,           // 8个线程
      connections: 200,      // 200个连接
      duration: 30,          // 30秒
      timeout: 10,           // 10秒超时
      latency: true,         // 启用详细延迟统计
      executionMode: "parallel",
      tests: [
        {
          name: "用户注册",
          request: {
            method: "POST",
            url: "/api/users/register",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              username: "testuser",
              email: "test@example.com",
              password: "password123",
            },
          },
          weight: 40, // 40% 的负载
        },
        {
          name: "用户登录",
          request: {
            method: "POST",
            url: "/api/users/login",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              email: "test@example.com",
              password: "password123",
            },
          },
          weight: 60, // 60% 的负载
        },
      ],
    },
    {
      name: "串行测试组",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "Authorization": "Bearer test-token",
        },
      },
      threads: 4,            // 4个线程
      connections: 100,       // 100个连接
      duration: 20,           // 20秒
      timeout: 5,             // 5秒超时
      latency: true,          // 启用详细延迟统计
      executionMode: "sequential",
      delay: 5,               // 组间延迟5秒
      tests: [
        {
          name: "获取用户信息",
          request: {
            method: "GET",
            url: "/api/users/profile",
          },
          weight: 50, // 50% 的负载
        },
        {
          name: "更新用户信息",
          request: {
            method: "PUT",
            url: "/api/users/profile",
            headers: {
              "Content-Type": "application/json",
            },
            body: {
              name: "Updated Name",
              bio: "Updated bio",
            },
          },
          weight: 50, // 50% 的负载
        },
      ],
    },
    {
      name: "轻量级测试组",
      http: {
        baseUrl: "http://localhost:3000",
      },
      threads: 2,            // 2个线程
      connections: 50,        // 50个连接
      duration: 15,           // 15秒
      latency: false,         // 不启用详细延迟统计
      executionMode: "parallel",
      tests: [
        {
          name: "健康检查",
          request: {
            method: "GET",
            url: "/health",
          },
          weight: 100, // 100% 的负载
        },
      ],
    },
  ],
};

export default config;
