# ThunderBench CLI 使用指南

## 🚀 快速开始

### 安装

```bash
npm install -g thunderbench
```

### 基本用法

```bash
thunderbench [选项] [配置文件]
```

## 📋 命令选项

### 核心选项

| 选项 | 简写 | 描述 | 默认值 |
|------|------|------|--------|
| `--config` | `-c` | 配置文件路径 | `./examples/test-config.ts` |
| `--verbose` | `-v` | 详细输出模式 | `false` |
| `--version` | `-V` | 显示版本信息 | - |
| `--help` | `-h` | 显示帮助信息 | - |

### 执行控制

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--dry-run` | 仅验证配置，不执行测试 | `false` |
| `--no-progress` | 不显示实时进度 | `false` |
| `--no-report` | 不生成报告文件 | `false` |

### 全局参数覆盖

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--timeout <ms>` | 全局超时时间（毫秒） | `30000` |
| `--concurrent <number>` | 全局并发数覆盖 | `10` |

### 输出控制

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--output <dir>` | 报告输出目录 | `./reports` |
| `--cleanup-wrk` | 测试完成后清理临时文件 | `false` |

### 示例和帮助

| 选项 | 描述 |
|------|------|
| `--list-examples` | 列出可用的示例配置文件 |
| `--create-example` | 创建示例配置文件 |

## 🎯 使用示例

### 1. 查看帮助和版本

```bash
# 查看帮助
thunderbench --help

# 查看版本
thunderbench --version
```

### 2. 列出示例配置

```bash
thunderbench --list-examples
```

### 3. 创建示例配置

```bash
thunderbench --create-example
```

### 4. 配置验证（干运行）

```bash
# 验证配置文件语法
thunderbench --config examples/simple-wrk-config.js --dry-run
```

### 5. 执行性能测试

#### 基本测试
```bash
thunderbench --config examples/simple-wrk-config.js
```

#### 详细输出模式
```bash
thunderbench --config examples/simple-wrk-config.js --verbose
```

#### 自定义输出目录
```bash
thunderbench --config examples/simple-wrk-config.js -o ./my-reports
```

#### 全局参数覆盖
```bash
thunderbench --config examples/simple-wrk-config.js \
  --timeout 5000 \
  --concurrent 50
```

## 📊 配置文件格式

### 基础结构

```typescript
const config = {
  name: "测试配置名称",
  description: "测试配置描述",
  groups: [
    {
      name: "测试组名称",
      http: {
        baseUrl: "http://localhost:3000",
        headers: { "User-Agent": "thunderbench/1.0" }
      },
      // wrk 核心参数
      threads: 4,        // -t 线程数
      connections: 100,   // -c 连接数
      duration: 30,       // -d 测试时长(秒)
      timeout: 5,         // --timeout 超时时间
      latency: true,      // --latency 延迟统计
      
      // 执行模式
      executionMode: "parallel", // parallel 或 sequential
      delay: 2,                   // 组间延迟(秒)
      
      // 测试接口
      tests: [
        {
          name: "API测试",
          request: { 
            method: "GET", 
            url: "/api/test" 
          },
          weight: 100
        }
      ]
    }
  ]
};
```

### wrk 参数说明

| 参数 | 对应 wrk 选项 | 描述 | 示例值 |
|------|---------------|------|--------|
| `threads` | `-t` | 线程数 | `4` |
| `connections` | `-c` | 连接数 | `100` |
| `duration` | `-d` | 测试时长（秒） | `30` |
| `timeout` | `--timeout` | 超时时间（秒） | `5` |
| `latency` | `--latency` | 延迟统计 | `true` |

## 📈 测试结果

### 实时输出示例

```
执行测试组: 基础测试组 (1/1)
并行执行模式: 同时测试所有接口
  启动接口测试: GET 请求测试
    wrk -t4 -c100 -d10s GET 请求测试 (权重: 100%)
基础测试组: 100% (1/1) | 基础测试组
实时: 0 请求 | 0.0% 成功 | 平均 0ms | 0.0 req/s
```

### 最终报告示例

```
────────────────────────────────────────────────────────────
                ThunderBench 性能测试结果
────────────────────────────────────────────────────────────
总耗时: 10.13s
总请求数: 1,443,024
成功: 1,443,024 (100.0%)
平均延迟: 0.71ms
P95延迟: 14.09ms
吞吐量: 142862.0 req/s
延迟分布: P50: 0ms | P90: 0ms | P95: 14.09ms | P99: 0ms
────────────────────────────────────────────────────────────
```

## 🔧 高级用法

### 环境变量

```bash
# 设置详细日志
export THUNDERBENCH_VERBOSE=true

# 设置默认超时
export THUNDERBENCH_TIMEOUT=10000
```

### 配置文件优先级

1. 命令行参数（最高优先级）
2. 环境变量
3. 配置文件
4. 默认值（最低优先级）

## 📁 输出文件

### 报告目录结构

```
reports/
└── 2025-08-22_07-10-29/
    ├── report.json      # JSON 格式报告
    ├── report.md        # Markdown 格式报告
    └── summary.txt      # 摘要报告
```

## 🚨 故障排除

### 常见问题

1. **权限问题**: 确保对输出目录有写权限
2. **内存不足**: 减少并发数和连接数
3. **网络超时**: 调整超时时间设置
4. **配置文件错误**: 使用 `--dry-run` 验证配置

### 调试模式

```bash
# 启用详细输出
thunderbench --config config.js --verbose

# 仅验证配置
thunderbench --config config.js --dry-run
```

---

💡 **提示**: 首次使用建议先运行 `--create-example` 创建示例配置，然后使用 `--dry-run` 验证配置正确性。
