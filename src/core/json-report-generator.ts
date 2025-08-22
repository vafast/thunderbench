import os from "os";
import { BenchmarkResult, BenchmarkConfig } from "../types";

export class JsonReportGenerator {
  /**
   * 生成 K6 风格的 JSON 报告
   */
  generateK6StyleJsonReport(result: BenchmarkResult, config: BenchmarkConfig, timestamp: string) {
    const realStats = this.calculateRealOverview(result, config);
    const systemInfo = this.getSystemInfo();

    return {
      // 元数据
      metadata: {
        timestamp,
        startTime: result.startTime,
        endTime: result.endTime,
        duration: result.duration,
        generatedAt: new Date().toISOString(),
                            version: "ThunderBench v1.0.0",
                    tool: "wrk",
        config: {
          totalGroups: config.groups.length,
          totalTests: config.groups.reduce((sum, group) => sum + group.tests.length, 0),
        },
        system: systemInfo,
      },

      // 总体性能指标 (简洁直观格式)
      metrics: {
        // 请求统计
        requests: {
          total: realStats.totalRequests,
          successful: realStats.successfulRequests,
          failed: realStats.failedRequests,
          rate: realStats.requestsPerSecond,
        },

        // 延迟统计
        latency: {
          avg: realStats.averageResponseTime,
          min: result.groups.reduce(
            (min, group) => Math.min(min, group.stats.minResponseTime),
            Infinity
          ),
          max: result.groups.reduce((max, group) => Math.max(max, group.stats.maxResponseTime), 0),
          p50: result.groups.reduce((max, group) => Math.max(max, group.stats.p50ResponseTime), 0),
          p90: result.groups.reduce((max, group) => Math.max(max, group.stats.p90ResponseTime), 0),
          p95: realStats.p95ResponseTime,
          p99: result.groups.reduce((max, group) => Math.max(max, group.stats.p99ResponseTime), 0),
        },

        // 错误统计
        errors: {
          count: realStats.failedRequests,
          rate: realStats.failedRequests / realStats.totalRequests,
        },

        // 数据传输统计
        transfer: {
          total: result.groups.reduce((total, group) => total + group.stats.totalResponseSize, 0),
          perSecond:
            result.groups.reduce((total, group) => total + group.stats.totalResponseSize, 0) /
            (result.duration / 1000), // 转换为每秒
        },
      },

      // 测试组详情
      groups: result.groups.map((group, index) => {
        const groupConfig = config.groups[index];
        return {
          name: group.name,
          config: {
            http: groupConfig.http || {},
            executionMode: groupConfig.executionMode || "parallel",
            threads: groupConfig.threads || 0,
            connections: groupConfig.connections || 0,
            duration: groupConfig.duration || 0,
            tests: groupConfig.tests.map((test) => ({
              name: test.name,
              weight: test.weight,
              method: test.request.method,
              path: test.request.url,
            })),
          },

          // 组级性能指标 (简洁直观格式)
          metrics: {
            // 请求统计
            requests: {
              total: group.stats.totalRequests,
              successful: group.stats.successfulRequests,
              failed: group.stats.failedRequests,
              rate: group.stats.requestsPerSecond,
            },

            // 延迟统计
            latency: {
              avg: group.stats.averageResponseTime,
              min: group.stats.minResponseTime,
              max: group.stats.maxResponseTime,
              p50: group.stats.p50ResponseTime,
              p90: group.stats.p90ResponseTime,
              p95: group.stats.p95ResponseTime,
              p99: group.stats.p99ResponseTime,
            },

            // 错误统计
            errors: {
              count: group.stats.failedRequests,
              rate: group.stats.errorRate,
              timeoutRate: group.stats.timeoutRate,
            },

            // 数据传输统计
            transfer: {
              total: Math.round(group.stats.totalResponseSize),
              perSecond: Math.round(group.stats.totalResponseSize / (groupConfig.duration || 1)),
            },
          },

          // 每个测试接口的详细性能指标
          testResults: group.requests
            .map((request, requestIndex) => {
              // 从 group.requests 中获取对应的测试配置
              const testConfig = groupConfig.tests[requestIndex];
              if (!testConfig) return null;

              // 计算该接口的权重分配
              const weightRatio = testConfig.weight / 100;
              const testThreads = Math.max(1, Math.floor(groupConfig.threads * weightRatio));
              const testConnections = Math.max(
                1,
                Math.floor(groupConfig.connections * weightRatio)
              );

              return {
                name: testConfig.name,
                config: {
                  method: testConfig.request.method,
                  path: testConfig.request.url,
                  weight: testConfig.weight,
                  wrk: {
                    threads: testThreads,
                    connections: testConnections,
                    duration: groupConfig.duration,
                  },
                },
                // 接口级性能指标 (从组级指标按权重估算，简洁直观格式)
                metrics: {
                  // 请求统计
                  requests: {
                    total: Math.round(group.stats.totalRequests * weightRatio),
                    successful: Math.round(group.stats.successfulRequests * weightRatio),
                    failed: Math.round(group.stats.failedRequests * weightRatio),
                    rate: Math.round(group.stats.requestsPerSecond * weightRatio * 100) / 100,
                  },

                  // 延迟统计
                  latency: {
                    avg: group.stats.averageResponseTime,
                    min: group.stats.minResponseTime,
                    max: group.stats.maxResponseTime,
                    p50: group.stats.p50ResponseTime,
                    p90: group.stats.p90ResponseTime,
                    p95: group.stats.p95ResponseTime,
                    p99: group.stats.p99ResponseTime,
                  },

                  // 错误统计
                  errors: {
                    count: Math.round(group.stats.failedRequests * weightRatio),
                    rate: group.stats.errorRate,
                    timeoutRate: group.stats.timeoutRate,
                  },

                  // 数据传输统计
                  transfer: {
                    total: Math.round(group.stats.totalResponseSize * weightRatio),
                    perSecond: Math.round(
                      (group.stats.totalResponseSize * weightRatio) / (groupConfig.duration || 1)
                    ),
                  },
                },
                // 原始请求数据
                request: request,
              };
            })
            .filter(Boolean), // 过滤掉 null 值

          // 原始请求数据 (保持向后兼容)
          requests: group.requests,
        };
      }),

      // 汇总统计
      summary: {
        totalRequests: realStats.totalRequests,
        successfulRequests: realStats.successfulRequests,
        failedRequests: realStats.failedRequests,
        successRate: realStats.successfulRequests / realStats.totalRequests,
        averageResponseTime: realStats.averageResponseTime,
        p95ResponseTime: realStats.p95ResponseTime,
        requestsPerSecond: realStats.requestsPerSecond,
        totalDuration: result.duration,
        wrkExecutionTime: config.groups.reduce((sum, group) => sum + (group.duration || 0), 0),
      },
    };
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
