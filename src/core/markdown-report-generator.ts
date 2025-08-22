import os from "os";
import { BenchmarkResult, BenchmarkConfig } from "../types";

export class MarkdownReportGenerator {
  /**
   * 生成 Markdown 表格报告
   */
  generateMarkdownTableReport(
    result: BenchmarkResult,
    config: BenchmarkConfig,
    timestamp: string
  ): string {
    const realStats = this.calculateRealOverview(result, config);
    const systemInfo = this.getSystemInfo();
    const beijingTime = new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    let markdown = `# ⚡ ThunderBench 性能测试报告

**测试时间**: ${beijingTime}  
**总耗时**: ${(result.duration / 1000).toFixed(1)}s  
**测试工具**: ThunderBench v1.0.0

---

## 📊 总体性能平均值

| 性能指标 | 值 | 状态 |
|----------|----|------|
| **总请求数** | ${realStats.totalRequests.toLocaleString()} | ${realStats.totalRequests > 1000000 ? "🚀 海量" : realStats.totalRequests > 500000 ? "🥇 大量" : "📊 正常"} |
| **成功请求** | ${realStats.successfulRequests.toLocaleString()} | ${realStats.successfulRequests === realStats.totalRequests ? "🎯 完美" : "✅ 优秀"} |
| **失败请求** | ${realStats.failedRequests.toLocaleString()} | ${realStats.failedRequests === 0 ? "🎯 完美" : "⚠️ 注意"} |
| **总体成功率** | ${((realStats.successfulRequests / realStats.totalRequests) * 100).toFixed(2)}% | ${realStats.successfulRequests === realStats.totalRequests ? "🎯 完美" : "✅ 优秀"} |
| **平均吞吐量** | **${realStats.requestsPerSecond.toLocaleString()}** req/s | ${realStats.requestsPerSecond > 100000 ? "🏆 极致" : realStats.requestsPerSecond > 50000 ? "🥇 优秀" : realStats.requestsPerSecond > 20000 ? "🥈 良好" : "🥉 一般"} |
| **平均延迟** | **${realStats.averageResponseTime.toFixed(2)}** ms | ${realStats.averageResponseTime < 1 ? "⚡️ 极速" : realStats.averageResponseTime < 5 ? "🚀 快速" : realStats.averageResponseTime < 20 ? "✅ 正常" : "⚠️ 较慢"} |
| **P95延迟** | **${realStats.p95ResponseTime.toFixed(2)}** ms | ${realStats.p95ResponseTime < 10 ? "⚡️ 极速" : realStats.p95ResponseTime < 50 ? "🚀 快速" : realStats.p95ResponseTime < 100 ? "✅ 正常" : "⚠️ 较慢"} |
| **总体评级** | ${realStats.requestsPerSecond > 100000 ? "🏆 极致性能" : realStats.requestsPerSecond > 50000 ? "🥇 优秀性能" : realStats.requestsPerSecond > 20000 ? "🥈 良好性能" : "🥉 一般性能"} | 综合评估结果 |

---

## 🏆 组性能

### 📈 测试组排名

| 排名 | 测试组 | 吞吐量 (req/s) | 延迟 (ms) | 成功率 | 数据传输 (MB) | 状态 |
|------|--------|----------------|-----------|--------|---------------|------|
`;

    // 按吞吐量排序
    const sortedGroups = [...result.groups].sort(
      (a, b) => b.stats.requestsPerSecond - a.stats.requestsPerSecond
    );

    sortedGroups.forEach((group, index) => {
      const rank = index + 1;
      const emoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "📊";
      const successRate = ((group.stats.successfulRequests / group.stats.totalRequests) * 100).toFixed(2);
      const status = successRate === "100.00" ? "🎯" : parseFloat(successRate) >= 99.9 ? "🥇" : parseFloat(successRate) >= 99 ? "🥈" : "⚠️";
      const dataTransfer = (group.stats.totalResponseSize / 1024 / 1024).toFixed(2);

      markdown += `| ${rank} | ${emoji} **${group.name}** | **${group.stats.requestsPerSecond.toLocaleString()}** | ${group.stats.averageResponseTime.toFixed(2)} | ${successRate}% | ${dataTransfer} | ${status} |\n`;
    });

    markdown += `\n### 📋 详细组性能\n\n`;

    result.groups.forEach((group, index) => {
      const groupConfig = config.groups[index];
      markdown += `#### 🔧 ${group.name}\n\n`;

      // 配置信息
      markdown += `**配置**: ${groupConfig.executionMode === "parallel" ? "🔄 并行" : "⏳ 串行"} | 线程: ${groupConfig.threads} | 连接: ${groupConfig.connections} | 时长: ${groupConfig.duration}s`;
      if (groupConfig.delay) {
        markdown += ` | 延迟: ${groupConfig.delay}s`;
      }
      markdown += `\n\n`;

      // 性能指标表格
      markdown += `| 指标 | 值 | 描述 |\n`;
      markdown += `|------|----|------|\n`;
      markdown += `| **总请求数** | ${group.stats.totalRequests.toLocaleString()} | 该组的总请求数 |\n`;
      markdown += `| **成功请求** | ${group.stats.successfulRequests.toLocaleString()} | 成功处理的请求数 |\n`;
      markdown += `| **失败请求** | ${group.stats.failedRequests.toLocaleString()} | 失败的请求数 |\n`;
      markdown += `| **成功率** | ${((group.stats.successfulRequests / group.stats.totalRequests) * 100).toFixed(2)}% | 请求成功率 |\n`;
      markdown += `| **吞吐量** | **${group.stats.requestsPerSecond.toLocaleString()}** req/s | 每秒处理能力 |\n`;
      markdown += `| **错误率** | ${(group.stats.errorRate * 100).toFixed(2)}% | 请求错误率 |\n`;
      markdown += `| **超时率** | ${(group.stats.timeoutRate * 100).toFixed(2)}% | 请求超时率 |\n`;
      markdown += `| **数据传输** | ${(group.stats.totalResponseSize / 1024 / 1024).toFixed(2)} MB | 响应数据总量 |\n`;

      // 延迟统计详细表格
      markdown += `\n**延迟统计**:\n\n`;
      markdown += `| 延迟指标 | 值 (ms) | 说明 |\n`;
      markdown += `|----------|---------|------|\n`;
      markdown += `| **平均延迟** | ${group.stats.averageResponseTime.toFixed(2)} | 所有请求的平均响应时间 |\n`;
      markdown += `| **最小延迟** | ${group.stats.minResponseTime.toFixed(2)} | 最快的响应时间 |\n`;
      markdown += `| **最大延迟** | ${group.stats.maxResponseTime.toFixed(2)} | 最慢的响应时间 |\n`;
      markdown += `| **P50延迟** | ${group.stats.p50ResponseTime.toFixed(2)} | 50%请求的响应时间 |\n`;
      markdown += `| **P90延迟** | ${group.stats.p90ResponseTime.toFixed(2)} | 90%请求的响应时间 |\n`;
      markdown += `| **P95延迟** | ${group.stats.p95ResponseTime.toFixed(2)} | 95%请求的响应时间 |\n`;
      markdown += `| **P99延迟** | ${group.stats.p99ResponseTime.toFixed(2)} | 99%请求的响应时间 |\n\n`;

      markdown += `---\n\n`;
    });

    markdown += `## 🎯 接口性能\n\n`;

    result.groups.forEach((group, index) => {
      const groupConfig = config.groups[index];
      
      if (groupConfig.tests && groupConfig.tests.length > 0) {
        markdown += `### 📋 ${group.name} - 接口详情\n\n`;
        
        // 接口列表表格
        markdown += `| 接口名称 | 权重 | 方法 | 路径 | 估算请求数 | 估算吞吐量 (req/s) | 估算数据传输 (MB) |\n`;
        markdown += `|----------|------|------|------|------------|-------------------|------------------|\n`;
        
        groupConfig.tests.forEach((test) => {
          const weightRatio = test.weight / 100;
          const estimatedRequests = Math.round(group.stats.totalRequests * weightRatio);
          const estimatedRPS = Math.round(group.stats.requestsPerSecond * weightRatio * 100) / 100;
          const estimatedDataTransfer = Math.round((group.stats.totalResponseSize * weightRatio) / 1024 / 1024 * 100) / 100;
          
          markdown += `| **${test.name}** | ${test.weight}% | ${test.request.method} | ${test.request.url} | ${estimatedRequests.toLocaleString()} | ${estimatedRPS.toLocaleString()} | ${estimatedDataTransfer} |\n`;
        });
        
        markdown += `\n#### 🔍 接口性能详情\n\n`;
        
        groupConfig.tests.forEach((test) => {
          const weightRatio = test.weight / 100;
          const testThreads = Math.max(1, Math.floor(groupConfig.threads * weightRatio));
          const testConnections = Math.max(1, Math.floor(groupConfig.connections * weightRatio));
          const estimatedRequests = Math.round(group.stats.totalRequests * weightRatio);
          const estimatedRPS = Math.round(group.stats.requestsPerSecond * weightRatio * 100) / 100;
          const estimatedDataTransfer = Math.round((group.stats.totalResponseSize * weightRatio) / 1024 / 1024 * 100) / 100;
          const estimatedErrors = Math.round(group.stats.failedRequests * weightRatio);
          
          markdown += `##### 🔗 ${test.name}\n\n`;
          markdown += `**WRK配置**: 线程: ${testThreads} | 连接: ${testConnections} | 权重: ${test.weight}% | 时长: ${groupConfig.duration}s\n\n`;
          
          markdown += `| 性能指标 | 值 | 说明 |\n`;
          markdown += `|----------|----|------|\n`;
          markdown += `| **请求数** | ${estimatedRequests.toLocaleString()} | 该接口的请求总数 (按权重分配) |\n`;
          markdown += `| **吞吐量** | ${estimatedRPS.toLocaleString()} req/s | 该接口的每秒请求处理能力 |\n`;
          markdown += `| **平均延迟** | ${group.stats.averageResponseTime.toFixed(2)} ms | 该接口的平均响应时间 |\n`;
          markdown += `| **P95延迟** | ${group.stats.p95ResponseTime.toFixed(2)} ms | 该接口的95%请求响应时间 |\n`;
          markdown += `| **错误数** | ${estimatedErrors.toLocaleString()} | 该接口的失败请求数 |\n`;
          markdown += `| **数据传输** | ${estimatedDataTransfer} MB | 该接口的响应数据总量 |\n\n`;
        });
        
        markdown += `---\n\n`;
      }
    });

    // 测试环境
    markdown += `## 🖥️ 测试环境\n\n`;
    
    markdown += `### 💻 系统信息\n`;
    markdown += `| 项目 | 值 | 说明 |\n`;
    markdown += `|------|----|------|\n`;
    markdown += `| **操作系统** | ${systemInfo.platform} ${systemInfo.arch} | 系统平台和架构 |\n`;
    markdown += `| **系统版本** | ${systemInfo.release} | 操作系统版本号 |\n`;
    markdown += `| **CPU型号** | ${systemInfo.cpus.model} | 处理器型号 |\n`;
    markdown += `| **CPU核心数** | ${systemInfo.cpus.cores} | 逻辑处理器核心数 |\n`;
    markdown += `| **内存总量** | ${systemInfo.memory.total} GB | 系统总内存 |\n`;
    markdown += `| **内存使用率** | ${systemInfo.memory.usage}% | 当前内存使用率 |\n`;
    markdown += `| **Node.js版本** | ${systemInfo.nodeVersion} | JavaScript运行时版本 |\n`;
    markdown += `| **系统负载** | 1分钟: ${systemInfo.loadAverage[0].toFixed(2)} / 5分钟: ${systemInfo.loadAverage[1].toFixed(2)} / 15分钟: ${systemInfo.loadAverage[2].toFixed(2)} | 系统平均负载 |\n\n`;

    // 总体性能平均值
    markdown += `## 📊 总体性能平均值\n\n`;
    
    markdown += `| 性能指标 | 值 | 状态 |\n`;
    markdown += `|----------|----|------|\n`;
    markdown += `| **总请求数** | ${realStats.totalRequests.toLocaleString()} | ${realStats.totalRequests > 1000000 ? "🚀 海量" : realStats.totalRequests > 500000 ? "🥇 大量" : "📊 正常"} |\n`;
    markdown += `| **成功请求** | ${realStats.successfulRequests.toLocaleString()} | ${realStats.successfulRequests === realStats.totalRequests ? "🎯 完美" : "✅ 优秀"} |\n`;
    markdown += `| **失败请求** | ${realStats.failedRequests.toLocaleString()} | ${realStats.failedRequests === 0 ? "🎯 完美" : "⚠️ 注意"} |\n`;
    markdown += `| **总体成功率** | ${((realStats.successfulRequests / realStats.totalRequests) * 100).toFixed(2)}% | ${realStats.successfulRequests === realStats.totalRequests ? "🎯 完美" : "✅ 优秀"} |\n`;
    markdown += `| **平均吞吐量** | **${realStats.requestsPerSecond.toLocaleString()}** req/s | ${realStats.requestsPerSecond > 100000 ? "🏆 极致" : realStats.requestsPerSecond > 50000 ? "🥇 优秀" : realStats.requestsPerSecond > 20000 ? "🥈 良好" : "🥉 一般"} |\n`;
    markdown += `| **平均延迟** | **${realStats.averageResponseTime.toFixed(2)}** ms | ${realStats.averageResponseTime < 1 ? "⚡️ 极速" : realStats.averageResponseTime < 5 ? "🚀 快速" : realStats.averageResponseTime < 20 ? "✅ 正常" : "⚠️ 较慢"} |\n`;
    markdown += `| **P95延迟** | **${realStats.p95ResponseTime.toFixed(2)}** ms | ${realStats.p95ResponseTime < 10 ? "⚡️ 极速" : realStats.p95ResponseTime < 50 ? "🚀 快速" : realStats.p95ResponseTime < 100 ? "✅ 正常" : "⚠️ 较慢"} |\n`;
    markdown += `| **总体评级** | ${realStats.requestsPerSecond > 100000 ? "🏆 极致性能" : realStats.requestsPerSecond > 50000 ? "🥇 优秀性能" : realStats.requestsPerSecond > 20000 ? "🥈 良好性能" : "🥉 一般性能"} | 综合评估结果 |\n\n`;

    markdown += `---\n`;
    markdown += `*报告生成: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}*\n`;

    return markdown;
  }

  /**
   * 获取系统信息
   */
  private getSystemInfo() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
      cpus: {
        model: cpus[0]?.model || "Unknown",
        cores: cpus.length,
        speed: cpus[0]?.speed || 0,
        architecture: os.arch(),
      },
      memory: {
        total: Math.round((totalMem / 1024 / 1024 / 1024) * 100) / 100, // GB
        free: Math.round((freeMem / 1024 / 1024 / 1024) * 100) / 100, // GB
        used: Math.round(((totalMem - freeMem) / 1024 / 1024 / 1024) * 100) / 100, // GB
        usage: Math.round(((totalMem - freeMem) / totalMem) * 100 * 100) / 100, // %
      },
      network: {
        interfaces: Object.keys(os.networkInterfaces()).length,
      },
      uptime: Math.round((os.uptime() / 3600) * 100) / 100, // hours
      loadAverage: os.loadavg(),
      nodeVersion: process.version,
      nodePlatform: process.platform,
      nodeArch: process.arch,
    };
  }

  /**
   * 计算总体概览统计
   */
  private calculateRealOverview(result: BenchmarkResult, config: BenchmarkConfig) {
    // 直接使用 wrk 的原始值，不做重新计算
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let totalWrkDuration = 0;
    let maxP95 = 0;
    let totalRPS = 0;

    result.groups.forEach((group, index) => {
      // 直接累加 wrk 的原始值
      totalRequests += group.stats.totalRequests;
      successfulRequests += group.stats.successfulRequests;
      failedRequests += group.stats.failedRequests;
      totalResponseTime += group.stats.averageResponseTime * group.stats.totalRequests;
      maxP95 = Math.max(maxP95, group.stats.p95ResponseTime);
      totalRPS += group.stats.requestsPerSecond; // 直接使用 wrk 的 RPS

      // 从配置中获取实际的 wrk 执行时间
      const groupConfig = config.groups[index];
      if (groupConfig && groupConfig.duration) {
        totalWrkDuration += groupConfig.duration;
      }
    });

    const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;

    // 计算实际的总体 RPS：总请求数除以总测试时间
    const actualTotalDuration = result.duration / 1000; // 转换为秒
    const actualRPS = actualTotalDuration > 0 ? totalRequests / actualTotalDuration : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      p95ResponseTime: maxP95,
      requestsPerSecond: Math.round(actualRPS * 100) / 100, // 实际总体 RPS
    };
  }
}
