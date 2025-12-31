import type { BenchmarkConfig } from "thunderbench";

/**
 * 复杂的性能测试配置示例
 * 展示了多种测试场景和配置选项
 */
const complexConfig: BenchmarkConfig = {
  name: "复杂性能测试配置",
  description: "展示多种测试场景和配置选项",
  groups: [
    // 用户认证相关API测试 - 并发模式
    {
      name: "user-authentication",
      http: {
        baseUrl: "https://jsonplaceholder.typicode.com",
        timeout: 5000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "JS-Benchmark/1.0",
        },
      },
      threads: 4,            // 4个线程
      connections: 20,        // 20个连接
      duration: 30,           // 30秒
      timeout: 5,             // 5秒超时
      latency: true,          // 启用延迟统计
      executionMode: "parallel",
      tests: [
        {
          name: "user-login",
          weight: 40,
          request: {
            method: "POST",
            url: "/users",
            body: {
              username: "testuser",
              password: "testpass123",
            },
          },
        },
        {
          name: "get-user-profile",
          weight: 35,
          request: {
            method: "GET",
            url: "/users/1",
            headers: {
              Authorization: "Bearer fake-token",
            },
          },
        },
        {
          name: "update-user-profile",
          weight: 25,
          request: {
            method: "PUT",
            url: "/users/1",
            body: {
              name: "Updated Name",
              email: "updated@example.com",
            },
          },
        },
      ],
    },

    // 内容管理API测试 - 串行模式，模拟按顺序执行的业务流程
    {
      name: "content-management",
      http: {
        baseUrl: "https://jsonplaceholder.typicode.com",
        timeout: 3000,
        headers: {
          "Content-Type": "application/json",
        },
      },
      threads: 2,            // 2个线程
      connections: 10,        // 10个连接
      duration: 20,           // 运行20秒
      timeout: 3,             // 3秒超时
      latency: true,          // 启用延迟统计
      executionMode: "sequential",
      delay: 2,               // 每批之间延迟2秒
      tests: [
        {
          name: "list-posts",
          weight: 50,
          request: {
            method: "GET",
            url: "/posts",
            query: {
              _page: 1,
              _limit: 10,
              _sort: "id",
              _order: "desc",
            },
          },
        },
        {
          name: "create-post",
          weight: 25,
          request: {
            method: "POST",
            url: "/posts",
            body: {
              title: "Performance Test Post",
              body: "This post was created during performance testing",
              userId: 1,
            },
          },
        },
        {
          name: "get-post-details",
          weight: 15,
          request: {
            method: "GET",
            url: "/posts/1",
            query: {
              _embed: "comments",
            },
          },
        },
        {
          name: "delete-post",
          weight: 10,
          request: {
            method: "DELETE",
            url: "/posts/1",
          },
        },
      ],
    },

    // API网关压力测试 - 高并发模式
    {
      name: "api-gateway-stress",
      http: {
        baseUrl: "https://jsonplaceholder.typicode.com",
        timeout: 2000,
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      },
      threads: 8,            // 8个线程
      connections: 50,        // 50个连接
      duration: 30,           // 30秒
      timeout: 2,             // 2秒超时
      latency: true,          // 启用延迟统计
      executionMode: "parallel",
      tests: [
        {
          name: "health-check",
          weight: 30,
          request: {
            method: "GET",
            url: "/posts/1", // 简单的健康检查
          },
        },
        {
          name: "data-query",
          weight: 50,
          request: {
            method: "GET",
            url: "/posts",
            query: {
              _limit: 20,
            },
          },
        },
        {
          name: "data-creation",
          weight: 20,
          request: {
            method: "POST",
            url: "/posts",
            body: {
              title: "Stress Test",
              body: "Testing high concurrency",
              userId: 1,
            },
          },
        },
      ],
    },

    // 移动端API测试 - 模拟移动设备的间歇性请求
    {
      name: "mobile-api",
      http: {
        baseUrl: "https://jsonplaceholder.typicode.com",
        timeout: 8000, // 移动端网络可能较慢
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MobileApp/1.0",
        },
      },
      threads: 2,            // 2个线程
      connections: 10,        // 10个连接
      duration: 30,           // 较长时间测试
      timeout: 8,             // 8秒超时
      latency: true,          // 启用延迟统计
      executionMode: "sequential",
      delay: 1,               // 1秒延迟模拟用户操作间隔
      tests: [
        {
          name: "app-initialization",
          weight: 20,
          request: {
            method: "GET",
            url: "/users/1",
          },
        },
        {
          name: "content-sync",
          weight: 60,
          request: {
            method: "GET",
            url: "/posts",
            query: {
              userId: 1,
              _limit: 5,
            },
          },
        },
        {
          name: "offline-sync",
          weight: 20,
          request: {
            method: "POST",
            url: "/posts",
            body: {
              title: "Offline Post",
              body: "Posted while offline, now syncing",
              userId: 1,
            },
          },
        },
      ],
    },
  ],
};

export default complexConfig;
