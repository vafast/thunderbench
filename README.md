# ThunderBench

<div align="center">

![ThunderBench Logo](https://img.shields.io/badge/ThunderBench-blue?style=for-the-badge&logo=lightning)
![Version](https://img.shields.io/npm/v/thunderbench?style=flat-square)
![License](https://img.shields.io/npm/l/thunderbench?style=flat-square)
![Node.js](https://img.shields.io/node/v/thunderbench?style=flat-square)

**高性能 API 性能测试工具核心引擎**

[🚀 快速开始](#-快速开始) • [📖 使用文档](#-使用文档) • [🔧 API 参考](#-api-参考) • [⚡ 竞品对比](#-竞品对比) • [🤝 贡献指南](#-贡献指南)

</div>

---

## ✨ 核心特性

- **🚀 高性能引擎**：基于 WRK 的高性能测试引擎，支持百万级并发
- **💻 编程 API**：完整的 Node.js/TypeScript 编程接口，易于集成
- **🔒 类型安全**：完整的 TypeScript 类型定义，开发体验优秀
- **📊 实时监控**：进度和统计流监控，支持实时数据观察
- **⚙️ 灵活配置**：支持复杂的测试场景配置和权重分配
- **🌐 跨平台**：内置跨平台 WRK 二进制文件，开箱即用
- **📈 丰富报告**：支持 JSON、Markdown 等多种报告格式，提供详细的性能分析
- **🔄 流式处理**：基于 RxJS 的响应式数据流处理

## 🚀 快速开始

### 安装

```bash
# 使用 npm
npm install thunderbench

# 使用 yarn
yarn add thunderbench

# 使用 bun
bun add thunderbench

# 使用 pnpm
pnpm add thunderbench
```

### 基本使用

```javascript
import { runBenchmark, validateConfig } from 'thunderbench';

// 定义测试配置
const config = {
  name: "API 性能测试",
  description: "测试 API 端点的性能表现",
  groups: [{
    name: "用户 API 测试组",
    http: { 
      baseUrl: "https://api.example.com",
      headers: { "Authorization": "Bearer token" }
    },
    threads: 4,           // 4个线程
    connections: 100,      // 100个并发连接
    duration: 30,          // 测试持续30秒
    timeout: 10,           // 10秒超时
    latency: true,         // 记录延迟统计
    executionMode: "parallel", // 并行执行
    tests: [{
      name: "获取用户列表",
      request: { 
        method: "GET", 
        url: "/users" 
      },
      weight: 70           // 70% 的请求权重
    }, {
      name: "创建用户",
      request: {
        method: "POST",
        url: "/users",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "测试用户", email: "test@example.com" })
      },
      weight: 30           // 30% 的请求权重
    }]
  }]
};

// 验证配置
validateConfig(config);

// 运行测试
const result = await runBenchmark(config, { 
  verbose: true,
  outputDir: "./reports"
});

console.log("测试完成:", result);
```

## 📖 使用文档

### 1. 配置结构

ThunderBench 使用分层配置结构，支持复杂的测试场景：

```javascript
{
  name: "测试名称",                    // 测试项目名称
  description: "测试描述",             // 测试项目描述
  groups: [                          // 测试组数组
    {
      name: "测试组名称",              // 测试组名称
      http: {                        // HTTP 配置
        baseUrl: "http://localhost:3000",  // 基础 URL
        headers: {                    // 全局请求头
          "User-Agent": "thunderbench/1.0.0",
          "Authorization": "Bearer token"
        }
      },
      threads: 4,                    // 线程数
      connections: 100,               // 并发连接数
      duration: 30,                  // 测试时长（秒）
      timeout: 10,                   // 超时时间（秒）
      latency: true,                 // 是否记录延迟统计
      executionMode: "parallel",     // 执行模式：parallel/serial
      tests: [                       // 测试用例数组
        {
          name: "测试用例名称",        // 测试用例名称
          request: {                  // 请求配置
            method: "GET",            // HTTP 方法
            url: "/api/endpoint",     // 请求路径
            headers: {},              // 请求头（覆盖全局）
            body: ""                  // 请求体
          },
          weight: 100                // 权重（百分比）
        }
      ]
    }
  ]
}
```

### 2. 高级配置示例

#### 复杂测试场景

```javascript
const complexConfig = {
  name: "电商系统性能测试",
  description: "模拟真实用户行为的多场景测试",
  groups: [
    {
      name: "首页访问组",
      http: { baseUrl: "https://shop.example.com" },
      threads: 8,
      connections: 200,
      duration: 60,
      tests: [
        { name: "首页", request: { method: "GET", url: "/" }, weight: 40 },
        { name: "商品列表", request: { method: "GET", url: "/products" }, weight: 30 },
        { name: "搜索", request: { method: "GET", url: "/search?q=phone" }, weight: 30 }
      ]
    },
    {
      name: "用户操作组",
      http: { 
        baseUrl: "https://shop.example.com",
        headers: { "Authorization": "Bearer user-token" }
      },
      threads: 4,
      connections: 50,
      duration: 60,
      tests: [
        { name: "用户信息", request: { method: "GET", url: "/user/profile" }, weight: 50 },
        { name: "订单列表", request: { method: "GET", url: "/user/orders" }, weight: 30 },
        { name: "购物车", request: { method: "GET", url: "/user/cart" }, weight: 20 }
      ]
    }
  ]
};
```

#### 动态请求配置

```javascript
const dynamicConfig = {
  name: "动态参数测试",
  groups: [{
    name: "动态测试组",
    http: { baseUrl: "https://api.example.com" },
    threads: 2,
    connections: 20,
    duration: 30,
    tests: [
      {
        name: "动态用户ID",
        request: { 
          method: "GET", 
          url: "/users/{userId}",
          headers: { "X-User-ID": "{userId}" }
        },
        weight: 100,
        // 支持动态参数替换
        dynamicParams: {
          userId: ["1", "2", "3", "4", "5"]
        }
      }
    ]
  }]
};
```

### 3. 编程 API 使用

#### 基础用法

```javascript
import { ThunderBench } from 'thunderbench';

const thunderbench = new ThunderBench(config, {
  outputDir: "./reports",
  verbose: true,
  cleanupWrk: true
});

// 运行测试
const result = await thunderbench.runBenchmark();
console.log("测试结果:", result);
```

#### 流式监控

```javascript
// 监听进度
thunderbench.getProgressStream().subscribe(progress => {
  console.log(`进度: ${progress.percentage}% (${progress.current}/${progress.total})`);
});

// 监听实时统计
thunderbench.getStatsStream().subscribe(stats => {
  console.log(`实时统计: ${stats.requestsPerSecond} req/s, 延迟: ${stats.latency}ms`);
});

// 监听错误
thunderbench.getErrorStream().subscribe(error => {
  console.error("测试错误:", error);
});
```

#### 资源管理

```javascript
try {
  const result = await thunderbench.runBenchmark();
  console.log("测试完成:", result);
} finally {
  // 清理资源
  thunderbench.destroy();
}
```

### 4. 命令行使用

```bash
# 安装 CLI 工具
npm install -g thunderbench

# 运行测试
thunderbench --config examples/complex-config.ts

# 详细输出模式
thunderbench --config examples/complex-config.ts --verbose

# 自定义输出目录
thunderbench --config examples/complex-config.ts --output ./my-reports

# 配置验证（不执行测试）
thunderbench --config examples/complex-config.ts --dry-run
```

## 📊 报告格式

ThunderBench 支持多种报告格式，每种格式都提供详细的性能分析数据。

### 1. JSON 报告格式

JSON 报告采用 K6 兼容的格式，便于集成到 CI/CD 流程和数据分析工具中。

#### 报告结构

```json
{
  "metadata": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "startTime": "2024-01-15T10:30:00.000Z",
    "endTime": "2024-01-15T10:30:30.000Z",
    "duration": 30000,
    "generatedAt": "2024-01-15T10:30:30.000Z",
    "version": "ThunderBench v1.0.3",
    "tool": "wrk",
    "config": {
      "totalGroups": 2,
      "totalTests": 5
    },
    "system": {
      "platform": "darwin",
      "arch": "arm64",
      "nodeVersion": "v18.17.0",
      "cpuCount": 8,
      "memory": "16GB"
    }
  },
  "metrics": {
    "requests": {
      "total": 150000,
      "successful": 149850,
      "failed": 150,
      "rate": 5000
    },
    "latency": {
      "avg": 45.2,
      "min": 12.1,
      "max": 1250.8,
      "p50": 38.5,
      "p90": 89.2,
      "p95": 156.7,
      "p99": 298.4
    },
    "errors": {
      "count": 150,
      "rate": 0.001
    },
    "transfer": {
      "total": 52428800,
      "perSecond": 1747627
    }
  },
  "groups": [
    {
      "name": "用户 API 测试组",
      "config": {
        "http": {
          "baseUrl": "https://api.example.com"
        },
        "executionMode": "parallel",
        "threads": 4,
        "connections": 100,
        "duration": 30,
        "tests": [
          {
            "name": "获取用户列表",
            "weight": 70,
            "method": "GET",
            "path": "/users"
          }
        ]
      },
      "metrics": {
        "requests": {
          "total": 100000,
          "successful": 99800,
          "failed": 200,
          "rate": 3333
        },
        "latency": {
          "avg": 42.1,
          "min": 15.2,
          "max": 980.5,
          "p50": 35.8,
          "p90": 82.1,
          "p95": 145.3,
          "p99": 275.6
        }
      }
    }
  ]
}
```

#### 关键指标说明

- **metadata**: 测试元数据，包括时间戳、配置信息、系统信息
- **metrics**: 总体性能指标，包含请求统计、延迟统计、错误统计、数据传输统计
- **groups**: 各测试组的详细配置和性能数据
- **latency**: 延迟统计，包含 P50、P90、P95、P99 等百分位数

### 2. Markdown 报告格式

Markdown 报告提供人类可读的格式，包含性能评级和可视化元素。

#### 报告结构

```markdown
# ⚡ ThunderBench 性能测试报告

**测试时间**: 2024-01-15 18:30:00  
**总耗时**: 30.0s  
**测试工具**: ThunderBench v1.0.0

---

## 📊 总体性能平均值

| 性能指标 | 值 | 状态 |
|----------|----|------|
| **总请求数** | 150,000 | 🥇 大量 |
| **成功请求** | 149,850 | ✅ 优秀 |
| **失败请求** | 150 | ⚠️ 注意 |
| **总体成功率** | 99.90% | ✅ 优秀 |
| **平均吞吐量** | **5,000** req/s | 🥈 良好 |
| **平均延迟** | **45.20** ms | ✅ 正常 |
| **P95延迟** | **156.70** ms | ✅ 正常 |
| **总体评级** | 🥈 良好性能 | 综合评估结果 |

---

## 🏆 组性能

### 📈 测试组排名

| 排名 | 测试组 | 吞吐量 (req/s) | 延迟 (ms) | 成功率 | 数据传输 (MB) | 状态 |
|------|--------|----------------|-----------|--------|---------------|------|
| 1 | 🥇 **用户 API 测试组** | **3,333** | 42.10 | 99.80% | 50.00 | 🥇 |
| 2 | 🥈 **商品 API 测试组** | **1,667** | 48.30 | 99.95% | 25.00 | 🥇 |

### 📋 详细组性能

#### 🔧 用户 API 测试组

**配置**: 🔄 并行 | 线程: 4 | 连接: 100 | 时长: 30s

| 指标 | 值 | 描述 |
|------|----|------|
| **总请求数** | 100,000 | 该组的总请求数 |
| **成功请求** | 99,800 | 成功处理的请求数 |
| **失败请求** | 200 | 失败的请求数 |
| **成功率** | 99.80% | 请求成功率 |
| **吞吐量** | **3,333** req/s | 每秒处理能力 |
| **错误率** | 0.20% | 请求错误率 |
| **数据传输** | 50.00 MB | 响应数据总量 |

**延迟统计**:

| 延迟指标 | 值 (ms) | 说明 |
|----------|---------|------|
| **平均延迟** | 42.10 | 所有请求的平均响应时间 |
| **最小延迟** | 15.20 | 最快的响应时间 |
| **最大延迟** | 980.50 | 最慢的响应时间 |
| **P50延迟** | 35.80 | 50%请求的响应时间 |
| **P90延迟** | 82.10 | 90%请求的响应时间 |
| **P95延迟** | 145.30 | 95%请求的响应时间 |
| **P99延迟** | 275.60 | 99%请求的响应时间 |
```

#### 性能评级说明

- **🏆 极致性能**: 吞吐量 > 100,000 req/s
- **🥇 优秀性能**: 吞吐量 > 50,000 req/s
- **🥈 良好性能**: 吞吐量 > 20,000 req/s
- **🥉 一般性能**: 吞吐量 ≤ 20,000 req/s

### 3. 报告配置选项

```javascript
const reportOptions = {
  outputDir: "./reports",           // 报告输出目录
  format: ["json", "markdown"],     // 报告格式
  includeSystemInfo: true,          // 包含系统信息
  includeConfig: true,              // 包含测试配置
  includeRawData: false,            // 包含原始数据
  customTemplates: "./templates"    // 自定义模板目录
};

// 生成报告
const result = await runBenchmark(config, reportOptions);
```

### 4. 报告集成

#### CI/CD 集成

```yaml
# GitHub Actions 示例
- name: 性能测试
  run: thunderbench --config test-config.ts
  
- name: 上传报告
  uses: actions/upload-artifact@v3
  with:
    name: performance-reports
    path: reports/
```

#### 数据分析集成

```javascript
// 读取 JSON 报告进行分析
import fs from 'fs';

const report = JSON.parse(fs.readFileSync('./reports/report.json', 'utf8'));

// 分析性能趋势
const performanceTrend = {
  throughput: report.metrics.requests.rate,
  latency: report.metrics.latency.avg,
  errorRate: report.metrics.errors.rate,
  timestamp: report.metadata.timestamp
};

// 发送到监控系统
sendToMonitoringSystem(performanceTrend);
```

---

## 🔧 API 参考

### 核心类

#### ThunderBench

主要的测试引擎类，提供完整的测试生命周期管理。

```typescript
class ThunderBench {
  constructor(config: BenchmarkConfig, options?: ThunderBenchOptions)
  
  // 运行测试
  runBenchmark(): Promise<BenchmarkResult>
  
  // 获取进度流
  getProgressStream(): Observable<ProgressEvent>
  
  // 获取统计流
  getStatsStream(): Observable<StatsEvent>
  
  // 获取错误流
  getErrorStream(): Observable<ErrorEvent>
  
  // 清理资源
  destroy(): void
}
```

#### 配置类型

```typescript
interface BenchmarkConfig {
  name: string;
  description?: string;
  groups: TestGroupConfig[];
}

interface TestGroupConfig {
  name: string;
  http: HttpConfig;
  threads: number;
  connections: number;
  duration: number;
  timeout?: number;
  latency?: boolean;
  executionMode: 'parallel' | 'serial';
  tests: ApiTestConfig[];
}

interface ApiTestConfig {
  name: string;
  request: RequestConfig;
  weight: number;
  dynamicParams?: Record<string, string[]>;
}
```

### 便捷函数

```typescript
// 快速运行测试
function runBenchmark(
  config: BenchmarkConfig, 
  options?: RunBenchmarkOptions
): Promise<BenchmarkResult>

// 配置验证
function validateConfig(config: BenchmarkConfig): ValidationResult

// 生成报告
function generateReport(
  result: BenchmarkResult, 
  format: 'json' | 'markdown'
): string
```

## ⚡ 竞品对比

### 📊 2025 开源负载测试工具全面横评表

| 工具 | 编程语言 | 脚本方式 | 支持协议 | 分布式支持 | 单节点最大 RPS（估算） | 集群最大 RPS（参考） | HTTP/3 & QUIC | gRPC | Web UI | 实时监控 | 报告能力 | CI/CD 友好 | 学习曲线 | 社区活跃度 | 典型应用场景 | 官网/源码 |
|------|--------|----------|-----------|-------------|------------------------|----------------------|---------------|--------|---------|------------|------------|--------------|------------|----------------|------------------|-------------|
| **ThunderBench** | TypeScript/JS | CLI + TS/JS 脚本 | HTTP/1.1, HTTP/2 | ❌（需手动部署多实例） | 🔥 **150k–200k+** | ❌（无原生支持） | ❌ | ❌ | ❌ | ✅（RxJS 流） | ✅（JSON/MD） | ✅✅✅（Node.js 生态） | 低（TS 友好） | ⭐⭐⭐⭐⭐ | Node.js 项目、高性能 API 测试 | [github.com/thunderbench/thunderbench](https://github.com/thunderbench/thunderbench) |
| **wrk** | C + Lua | CLI + Lua 脚本 | HTTP/1.1<br>（HTTP/2 via patch） | ❌（需手动部署多实例） | 🔥 **150k–200k+** | ❌（无原生支持） | ❌ | ❌ | ❌ | ⚠️（终端输出） | ⚠️（基础文本） | ✅（轻量易集成） | 中等 | ⭐⭐⭐⭐☆ | 极致吞吐压测、性能基线测试 | [github.com/wg/wrk](https://github.com/wg/wrk) |
| **k6** | JavaScript/TypeScript | JS/TS 脚本 | HTTP/1.1, HTTP/2<br>✅ HTTP/3 (QUIC)<br>gRPC (实验) | ✅（k6-operator on K8s） | 50k–80k | ✅ **500k+** | ✅ | ✅（实验） | ✅（CLI Dashboard） | ✅（终端 + Prometheus） | ✅（JSON/HTML） | ✅✅✅（DevOps 首选） | 低–中 | ⭐⭐⭐⭐⭐ | 云原生、CI/CD、高并发 API 测试 | [k6.io](https://k6.io) |
| **Gatling** | Scala（DSL） | Scala 代码 | HTTP/1.1, HTTP/2<br>WebSockets, MQTT, SSE | ✅（自建集群） | 30k–50k | ✅ 100k+ | ❌ | ❌ | ✅（Web 控制台） | ✅（实时图表） | ✅✅✅（精美 HTML 报告） | ✅（支持 CLI） | 中–高 | ⭐⭐⭐⭐☆ | 高性能 Web 测试、精准性能建模 | [gatling.io](https://gatling.io) |
| **Locust** | Python | Python 代码 | 任意（自定义） | ✅（Master-Worker） | 15k–25k | ✅ **200k+** | ⚠️（需集成 `http3` 库） | ✅（通过 gRPC 库） | ✅✅✅（实时 Web UI） | ✅✅✅（实时图表 + 指标） | ✅（Web + CSV） | ✅✅（Python 生态无缝） | 低（Python 友好） | ⭐⭐⭐⭐⭐ | 复杂用户行为、动态逻辑、Python 团队 | [locust.io](https://locust.io) |
| **Apache JMeter** | Java | GUI / XML / 模块化 | HTTP, HTTPS, JDBC, FTP, TCP, WebSocket, JMS, SMTP, gRPC (插件) | ✅（Master-Slave） | 8k–15k | ✅ 100k+ | ❌（需插件，不成熟） | ✅（插件） | ✅（Swing GUI） | ✅（监听器 + 插件） | ✅✅（丰富插件报告） | ✅（支持 CLI 模式） | 中等 | ⭐⭐⭐⭐⭐ | 企业级复杂流程、非开发人员使用 | [jmeter.apache.org](https://jmeter.apache.org) |
| **Artillery** | YAML + JS | YAML 配置 + JS 脚本 | HTTP/1.1, HTTP/2<br>WebSockets, Socket.IO<br>gRPC (实验) | ✅（Docker/K8s 部署） | 25k–40k | ✅ 150k+ | ⚠️（实验性） | ✅（实验） | ✅（CLI Dashboard） | ✅（终端 + Prometheus） | ✅（JSON/HTML） | ✅✅（Node.js 友好） | 低（YAML 简洁） | ⭐⭐⭐⭐ | 微服务、Node.js 项目、快速上手 | [artillery.io](https://artillery.io) |
| **Tsung** | Erlang | XML 配置文件 | HTTP, WebDAV, SOAP, PostgreSQL, MySQL, XMPP, LDAP | ✅（原生分布式） | 10k–20k | ✅ 100k+ | ❌ | ❌ | ✅（Web 报告） | ✅（实时图表） | ✅（图表 + 日志） | ⚠️（配置复杂） | 高（Erlang 小众） | ⭐⭐⭐ | 长连接、IM、高并发连接测试 | [tsung.fr](http://tsung.fr) |

### 🔑 关键维度说明

| 维度 | 说明 |
|------|------|
| **单节点最大 RPS** | 在高端服务器（16核+32GB RAM）对简单 GET 请求的极限吞吐能力（理想环境） |
| **HTTP/3 & QUIC** | 是否原生支持新一代基于 UDP 的 HTTP 协议，对 CDN、边缘服务测试至关重要 |
| **gRPC 支持** | 是否支持现代微服务通信协议 gRPC（基于 HTTP/2） |
| **Web UI** | 是否提供图形化控制台用于配置或监控 |
| **实时监控** | 是否支持压测过程中实时查看 TPS、响应时间、错误率等指标 |
| **报告能力** | 是否生成结构化或可视化报告（HTML/JSON/图表） |
| **CI/CD 友好** | 是否支持无头模式、脚本化、与 Jenkins/GitLab CI 集成 |
| **学习曲线** | 入门难度：低（<1天）、中（1–3天）、高（>3天） |
| **社区活跃度** | GitHub Stars、Issue 响应、文档质量、更新频率（⭐越多越活跃） |

### 🏆 2025 推荐场景速查表

| 你的需求 | 推荐工具 |
|--------|----------|
| 追求**极限 RPS** 和**低资源消耗** | ✅ **wrk** 或 **ThunderBench** |
| **Node.js 项目 + 高性能 + 类型安全** | ✅ **ThunderBench** |
| **云原生 + CI/CD + 高并发** | ✅ **k6** |
| **复杂用户行为 + Python 技术栈** | ✅ **Locust** |
| **精美报告 + 精准建模** | ✅ **Gatling** |
| **企业级复杂流程 + 图形化操作** | ✅ **JMeter** |
| **微服务 + YAML 配置 + 快速上手** | ✅ **Artillery** |
| **长连接 + IM + 高并发连接数** | ✅ **Tsung** |
| **HTTP/3 / QUIC 协议测试** | ✅ **k6** 或 **自定义 wrk 补丁版** |

### 💡 总结建议（2025）

- **首选推荐（综合性能 + 现代化）**：**ThunderBench**、**k6** 和 **Locust**
- **性能基准测试**：**wrk** 和 **ThunderBench** 是"黄金标准"
- **传统企业级测试**：**JMeter** 依然不可替代
- **未来趋势**：支持 **HTTP/3、gRPC、K8s 原生部署** 的工具（如 k6）将成为主流
- **Node.js 生态**：**ThunderBench** 为 Node.js 开发者提供了最佳的性能测试解决方案

## 🛠️ 开发指南

### 环境要求

- Node.js >= 18.0.0
- Bun >= 1.0.0 (推荐)
- TypeScript >= 5.0.0

### 开发设置

```bash
# 克隆仓库
git clone https://github.com/thunderbench/thunderbench.git
cd thunderbench

# 安装依赖
bun install

# 开发模式
bun run dev

# 构建项目
bun run build

# 运行测试
bun run test

# 类型检查
bun run type-check
```

### 项目结构

```
thunderbench/
├── src/                    # 源代码
│   ├── core/              # 核心引擎
│   ├── types/             # 类型定义
│   └── utils/             # 工具函数
├── examples/               # 配置示例
├── docs/                   # 文档
├── scripts/                # 构建脚本
└── bin/                    # WRK 二进制文件
```

## 📊 性能基准

### 测试环境
- **目标**: Nginx 静态文件服务

### 测试结果

> ⚠️ **重要声明**: 以下数据为**估算数据**，并非权威的基准测试结果。实际性能表现取决于测试环境、目标系统、网络条件、配置参数等多种因素。强烈建议用户在实际使用中进行自己的基准测试以获得准确数据。

| 排名 | 工具 | 最大 RPS（估算） | 性能评级 |
|------|------|------------------|----------|
| 🥇 **1️⃣** | **wrk** | 🔥 **200,000+** | 🏆 极致性能 |
| 🥈 **2️⃣** | **k6** | **50,000 – 80,000** | 🥇 优秀性能 |
| 🥉 **3️⃣** | **Gatling** | **30,000 – 50,000** | 🥈 良好性能 |
| **4️⃣** | **Artillery / wrk2** | **25,000 – 40,000** | 🥈 良好性能 |
| **5️⃣** | **Locust** | **15,000 – 25,000** | 🥉 一般性能 |
| **6️⃣** | **JMeter** | **8,000 – 15,000** | 🥉 一般性能 |
| **🌟** | **ThunderBench** | **≈ wrk 性能** | 🏆 极致性能 |

### 性能说明

> 📊 **性能数据来源说明**: 以下排名基于工具特性和一般性认知，仅供参考。实际性能表现取决于测试环境、目标系统、网络条件、配置参数等多种因素。

- **ThunderBench**: 基于 WRK 引擎，性能与原生 WRK 基本一致，同时提供丰富的配置验证和报告生成功能
- **wrk**: C 语言实现，性能测试工具的性能标杆，适合追求极致性能的场景
- **k6**: Go 语言实现，现代工具，性能表现优秀，支持复杂的测试逻辑
- **Gatling**: Scala 实现，企业级工具，性能表现良好，支持复杂的测试场景
- **Artillery**: Node.js 实现，简单易用，适合快速性能测试
- **Locust**: Python 实现，支持复杂的用户行为模拟，性能表现中等
- **JMeter**: Java 实现，功能全面，但性能受 JVM 配置影响较大

### 权威基准测试资源

为了获得准确的性能数据，建议参考以下权威资源：

- **[TechEmpower Web Framework Benchmarks](https://www.techempower.com/benchmarks/)** - 权威的 Web 框架性能基准
- **[wrk 官方文档](https://github.com/wg/wrk)** - 官方性能数据和最佳实践
- **[k6 性能指南](https://k6.io/docs/testing-guides/)** - 官方性能优化建议
- **[JMeter 性能调优](https://jmeter.apache.org/usermanual/best-practices.html)** - 官方性能调优指南
- **[Artillery 性能测试](https://www.artillery.io/docs/guides/performance-testing)** - 官方性能测试指南

### 实际测试建议

```bash
# 使用 ThunderBench 进行基准测试
thunderbench --config benchmark-config.ts --verbose

# 对比测试不同工具
# 1. 确保测试环境一致
# 2. 使用相同的目标系统
# 3. 控制网络条件
# 4. 多次测试取平均值
# 5. 使用官方推荐的配置参数
# 6. 参考权威基准测试结果
```

### 为什么需要自己的基准测试？

1. **环境差异**: 不同硬件、操作系统、网络环境下的性能差异巨大
2. **配置影响**: 工具配置参数对性能影响显著
3. **版本差异**: 不同版本的工具性能可能有很大差异
4. **使用场景**: 实际使用场景与基准测试场景可能完全不同
5. **权威性**: 只有自己环境下的测试结果才是最权威的

### 建立自己的性能基准

建议建立以下性能基准体系：
- **基线测试**: 在标准环境下的基础性能
- **压力测试**: 在不同负载下的性能表现
- **长期测试**: 长时间运行下的性能稳定性
- **对比测试**: 与历史版本的性能对比

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看我们的贡献指南：

### 贡献类型

- 🐛 Bug 报告
- 💡 功能建议
- 📝 文档改进
- 🔧 代码贡献
- 🧪 测试用例
- 🌍 国际化

### 贡献流程

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 开发规范

- 遵循 TypeScript 最佳实践
- 添加适当的测试用例
- 更新相关文档
- 遵循提交信息规范

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 🔗 相关链接

- **官方网站**: [https://thunderbench.dev](https://thunderbench.dev)
- **GitHub 仓库**: [https://github.com/thunderbench/thunderbench](https://github.com/thunderbench/thunderbench)
- **问题反馈**: [https://github.com/thunderbench/thunderbench/issues](https://github.com/thunderbench/thunderbench/issues)
- **讨论社区**: [https://github.com/thunderbench/thunderbench/discussions](https://github.com/thunderbench/thunderbench/discussions)
- **CLI 工具**: [https://github.com/thunderbench/thunderbench-cli](https://github.com/thunderbench/thunderbench-cli)

## 🙏 致谢

感谢以下开源项目为 ThunderBench 提供支持：

- [WRK](https://github.com/wg/wrk) - 高性能 HTTP 基准测试工具
- [RxJS](https://rxjs.dev/) - 响应式编程库
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [Bun](https://bun.sh/) - 快速 JavaScript 运行时

---

<div align="center">

**如果 ThunderBench 对你有帮助，请给我们一个 ⭐️**

Made with ❤️ by the ThunderBench Team

</div>
