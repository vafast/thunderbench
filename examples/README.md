# ThunderBench 示例

本目录包含 ThunderBench 的各种使用示例。

## 📁 目录结构

```
examples/
├── configs/                    # 配置示例
│   ├── simple-config.ts        # 简单配置
│   ├── complex-config.ts       # 复杂配置
│   └── complex-wrk-demo.ts     # WRK 演示配置
├── servers/                    # 测试服务器
│   ├── vafast-server.ts        # Vafast 框架
│   ├── express-server.ts       # Express 框架
│   ├── hono-server.ts          # Hono 框架
│   └── elysia-server.ts        # Elysia 框架
├── comparison/                 # 框架对比
│   └── framework-comparison.ts # 框架对比测试
├── usage/                      # 编程使用示例
│   └── programmatic-usage.ts   # 编程 API 示例
└── README.md
```

## 🚀 快速开始

### 1. 运行简单配置

```bash
cd thunderbench
npm run examples/configs/simple-config.ts
```

### 2. 运行框架对比测试

```bash
# 先启动所有测试服务器（自动管理）
npm run examples/comparison/framework-comparison.ts
```

### 3. 编程使用

```bash
npm run examples/usage/programmatic-usage.ts
```

## 📝 配置示例

### 简单配置 (simple-config.ts)

```typescript
import type { BenchmarkConfig } from "thunderbench";

const config: BenchmarkConfig = {
  name: "简单测试",
  groups: [{
    name: "基础组",
    http: { baseUrl: "http://localhost:3000" },
    threads: 4,
    connections: 100,
    duration: 10,
    executionMode: "parallel",
    tests: [
      { name: "GET", request: { method: "GET", url: "/" }, weight: 100 }
    ]
  }]
};

export default config;
```

### 框架对比测试

```typescript
import { runComparison, generateComparisonReport } from "thunderbench";

const result = await runComparison(servers, testConfig);
await generateComparisonReport(result);
```

## 🖥️ 测试服务器

所有测试服务器都使用 Node.js 标准 API，可以用 `bun` 运行：

| 服务器 | 端口 | 框架 |
|--------|------|------|
| vafast-server.ts | 3001 | Vafast |
| express-server.ts | 3002 | Express |
| hono-server.ts | 3003 | Hono |
| elysia-server.ts | 3004 | Elysia |

启动单个服务器：

```bash
npm run examples/servers/vafast-server.ts
```

