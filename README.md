# ThunderBench Core

ThunderBench 核心引擎 - 高性能 API 性能测试工具

## 🚀 特性

- **高性能引擎**：基于 WRK 的高性能测试引擎
- **编程 API**：完整的 Node.js 编程接口
- **类型安全**：完整的 TypeScript 类型定义
- **实时监控**：进度和统计流监控
- **灵活配置**：支持复杂的测试场景配置
- **内置 WRK**：跨平台 WRK 二进制文件
- **丰富示例**：多种配置示例和用法演示

## 📦 安装

```bash
npm install thunderbench
# 或
bun add thunderbench
```

## 💻 编程使用

### 基本使用

```javascript
const { ThunderBench, runBenchmark, validateConfig } = require('thunderbench');

// 配置验证
const config = {
  name: "性能测试",
  groups: [{
    name: "测试组",
    http: { baseUrl: "http://localhost:3000" },
    threads: 2,
    connections: 50,
    duration: 10,
    executionMode: "parallel",
    tests: [{
      name: "GET 测试",
      request: { method: "GET", url: "/" },
      weight: 100
    }]
  }]
};

// 验证配置
validateConfig(config);

// 运行测试
const result = await runBenchmark(config, { verbose: true });
console.log("测试完成:", result);
```

### 高级使用

```javascript
const thunderbench = new ThunderBench(config, {
  outputDir: "./reports",
  verbose: true
});

// 监听进度
thunderbench.getProgressStream().subscribe(progress => {
  console.log(`进度: ${progress.percentage}%`);
});

// 监听统计
thunderbench.getStatsStream().subscribe(stats => {
  console.log(`实时统计: ${stats.requestsPerSecond} req/s`);
});

// 运行测试
const result = await thunderbench.runBenchmark();

// 清理资源
thunderbench.destroy();
```

## 🔧 API 参考

### ThunderBench 类

- `constructor(config, options)` - 创建实例
- `runBenchmark()` - 运行性能测试
- `getProgressStream()` - 获取进度流
- `getStatsStream()` - 获取统计流
- `destroy()` - 清理资源

### 便捷函数

- `runBenchmark(config, options)` - 快速运行测试
- `validateConfig(config)` - 验证配置

### 类型定义

- `BenchmarkConfig` - 测试配置
- `TestGroupConfig` - 测试组配置
- `ApiTestConfig` - API 测试配置

## 📊 配置格式

```javascript
{
  name: "测试名称",
  description: "测试描述",
  groups: [{
    name: "测试组名称",
    http: {
      baseUrl: "http://localhost:3000",
      headers: { "User-Agent": "thunderbench/1.0" }
    },
    threads: 2,           // 线程数
    connections: 50,       // 连接数
    duration: 10,          // 测试时长（秒）
    timeout: 5,            // 超时时间（秒）
    latency: true,         // 是否记录延迟
    executionMode: "parallel", // 执行模式：parallel/serial
    tests: [{
      name: "测试名称",
      request: {
        method: "GET",     // HTTP 方法
        url: "/api/test",  // 请求路径
        headers: {},       // 请求头
        body: ""           // 请求体
      },
      weight: 100          // 权重
    }]
  }]
}
```

## 🛠️ 开发

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建
bun run build

# 测试
bun run test
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 🔗 相关链接

- [CLI 工具](https://github.com/thunderbench/thunderbench-cli)
- [文档](https://github.com/thunderbench/thunderbench)
- [问题反馈](https://github.com/thunderbench/thunderbench/issues)
