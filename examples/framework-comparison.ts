/**
 * 框架对比测试示例
 *
 * 演示如何使用 ThunderBench 对比多个 Web 框架的性能
 */

import {
  runComparison,
  generateComparisonReport,
  ServerConfig,
  ComparisonTestConfig,
} from "../src";

// ============================================================
// 1. 定义要对比的框架服务器
// ============================================================

const servers: ServerConfig[] = [
  {
    name: "Vafast",
    command: "bun",
    args: ["run", "servers/vafast-server.ts"],
    cwd: __dirname,
    port: 3001,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
  {
    name: "Express",
    command: "bun",
    args: ["run", "servers/express-server.ts"],
    cwd: __dirname,
    port: 3002,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
  {
    name: "Hono",
    command: "bun",
    args: ["run", "servers/hono-server.ts"],
    cwd: __dirname,
    port: 3003,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
  {
    name: "Elysia",
    command: "bun",
    args: ["run", "servers/elysia-server.ts"],
    cwd: __dirname,
    port: 3004,
    healthCheckPath: "/health",
    startupTimeout: 10000,
    warmupRequests: 100,
  },
];

// ============================================================
// 2. 定义测试配置
// ============================================================

const testConfig: ComparisonTestConfig = {
  name: "Web 框架性能对比测试",
  description: "对比 Vafast, Express, Hono, Elysia 的性能表现",
  threads: 4,
  connections: 100,
  duration: 30, // 30 秒测试
  warmupRequests: 1000,
  scenarios: [
    // 场景 1: 简单 Hello World
    {
      name: "Hello World",
      method: "GET",
      path: "/",
      weight: 30,
    },
    // 场景 2: JSON API
    {
      name: "JSON API",
      method: "GET",
      path: "/api/users",
      weight: 25,
    },
    // 场景 3: 动态参数
    {
      name: "动态参数",
      method: "GET",
      path: "/api/users/123",
      weight: 20,
    },
    // 场景 4: Query 参数
    {
      name: "Query 参数",
      method: "GET",
      path: "/api/search?q=test&page=1&limit=10",
      weight: 15,
    },
    // 场景 5: POST JSON
    {
      name: "POST JSON",
      method: "POST",
      path: "/api/users",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        name: "Test User",
        email: "test@example.com",
      },
      weight: 10,
    },
  ],
};

// ============================================================
// 3. 运行对比测试
// ============================================================

async function main() {
  console.log("🚀 开始框架对比测试...\n");

  try {
    // 运行对比测试
    const result = await runComparison(servers, testConfig, {
      outputDir: "./comparison-reports",
      verbose: true,
    });

    // 生成报告
    const reportFiles = await generateComparisonReport(result, {
      outputDir: "./comparison-reports",
      formats: ["markdown", "json"],
    });

    console.log("\n📄 报告已生成:");
    reportFiles.forEach((file) => console.log(`   - ${file}`));
  } catch (error) {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  }
}

main();

