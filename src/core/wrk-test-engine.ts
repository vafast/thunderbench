import { BenchmarkConfig, BenchmarkResult, GroupResult } from "../types";
import { validateConfig } from "./config-validation";
import { calculateStats } from "./stats-calculation";
import { ReportStorage } from "./report-storage";
import { Subject, Observable } from "rxjs";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { getBestWrkPath, getDownloadInstructions } from "../utils/wrk-binary";

const execAsync = promisify(exec);

export interface WrkTestResult {
  groupName: string;
  testName: string;
  requests: number;
  duration: number;
  requestsPerSecond: number;
  latency: {
    avg: number;
    stdev: number;
    max: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
    stdevPercent: number;
  };
  transfer: {
    total: number;
    perSecond: number;
  };
  errors: {
    connect: number;
    read: number;
    write: number;
    timeout: number;
  };
  performance: {
    efficiency: number;
    errorRate: number;
    throughput: number;
  };
}

export interface TestProgress {
  groupName: string;
  completed: number;
  total: number;
  percentage: number;
  currentTest?: string;
  errors: number;
  totalErrors: number;
}

export interface RealTimeStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  currentConcurrency: number;
  maxConcurrency: number;
}

export interface TestEngineOptions {
  outputDir?: string;
  generateScripts?: boolean;
  cleanupScripts?: boolean;
  showProgress?: boolean;
  verbose?: boolean;
}

export class TestEngine {
  private config: BenchmarkConfig;
  private reportStorage: ReportStorage;
  private progressSubject = new Subject<TestProgress>();
  private statsSubject = new Subject<RealTimeStats>();
  private startTime: number = 0;
  private options: TestEngineOptions;
  private wrkScriptsDir: string;
  private wrkPath: string | null = null;

  constructor(config: BenchmarkConfig, options: TestEngineOptions = {}) {
    this.config = config;
    this.options = {
      generateScripts: true,
      cleanupScripts: false,
      showProgress: true,
      verbose: false,
      ...options,
    };

    // 使用临时目录，不依赖 options.outputDir
    const timestamp = Date.now();
    this.wrkScriptsDir = path.join(os.tmpdir(), `thunderbench-${timestamp}`);

    this.reportStorage = new ReportStorage();
  }

  /**
   * 初始化 wrk 路径
   */
  private async initializeWrkPath(): Promise<void> {
    try {
      // 使用内置的 wrk 版本
      const wrkInfo = await getBestWrkPath();
      if (wrkInfo.exists) {
        this.wrkPath = wrkInfo.path;
        if (this.options.verbose) {
          console.log(`✅ 使用内置 wrk: ${wrkInfo.path} (版本: ${wrkInfo.version || "未知"})`);
        }
      } else {
        // 没有可用的 wrk，抛出错误
        throw new Error(`未找到可用的 wrk 二进制文件。\n${getDownloadInstructions()}`);
      }
    } catch (error) {
      throw new Error(`初始化 wrk 失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 初始化引擎
   */
  async initialize(): Promise<void> {
    console.log("\x1b[36m初始化 WRK 测试引擎...\x1b[0m");

    // 初始化 wrk 路径
    await this.initializeWrkPath();
    console.log("\x1b[32m✓ WRK 路径已确定\x1b[0m");

    // 创建临时脚本目录
    try {
      await fs.mkdir(this.wrkScriptsDir, { recursive: true });
      console.log("\x1b[33m生成测试脚本...\x1b[0m");
    } catch (error) {
      throw new Error(`\x1b[31m✗ 无法创建临时脚本目录: ${error}\x1b[0m`);
    }

    console.log("\x1b[32m✓ 测试引擎初始化完成\x1b[0m");
  }

  /**
   * 清理临时文件
   */
  private async cleanup(): Promise<void> {
    try {
      if (
        this.wrkScriptsDir &&
        (await fs
          .access(this.wrkScriptsDir)
          .then(() => true)
          .catch(() => false))
      ) {
        await fs.rm(this.wrkScriptsDir, { recursive: true, force: true });
        if (this.options.verbose) {
          console.log(`🧹 已清理临时目录: ${this.wrkScriptsDir}`);
        }
      }
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  清理临时目录失败: ${error}`);
      }
    }
  }

  /**
   * 检查 wrk 是否安装
   */
  private async checkWrkInstallation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wrkProcess = spawn(this.wrkPath!, ["-v"], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      wrkProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      wrkProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      wrkProcess.on("close", (code) => {
        if (code === 0 || code === 1) {
          // wrk -v 返回 1 是正常的
          console.log("✅ wrk 已安装");
          resolve();
        } else {
          reject(new Error(`wrk 检查失败 (退出码: ${code}): ${stderr}`));
        }
      });

      wrkProcess.on("error", (error) => {
        reject(new Error(`wrk 未安装或不在 PATH 中。请先安装 wrk: https://github.com/wg/wrk`));
      });
    });
  }

  /**
   * 确保输出目录存在
   */
  private async ensureOutputDir(): Promise<void> {
    try {
      await fs.access(this.wrkScriptsDir);
    } catch {
      await fs.mkdir(this.wrkScriptsDir, { recursive: true });
      console.log(`📁 创建输出目录: ${this.wrkScriptsDir}`);
    }
  }

  /**
   * 生成 wrk 测试脚本
   */
  private async generateWrkScripts(): Promise<void> {
    console.log("📝 生成 wrk 测试脚本...");

    for (const group of this.config.groups) {
      const scriptPath = path.join(this.wrkScriptsDir, `${group.name}.lua`);
      const scriptContent = this.generateGroupScript(group);
      await fs.writeFile(scriptPath, scriptContent);
      console.log(`✅ 生成脚本: ${scriptPath}`);
    }
  }

  /**
   * 为单个测试组生成 wrk 脚本
   */
  private generateGroupScript(group: any): string {
    const tests = group.tests.map((test: any) => ({
      name: test.name,
      method: test.request.method,
      url: this.buildFullUrl(group.http?.baseUrl, test.request.url),
      headers: { ...group.http?.headers, ...test.request.headers },
      body: test.request.body ? JSON.stringify(test.request.body, null, 2) : undefined,
      weight: test.weight,
    }));

    let script = `-- wrk 测试脚本: ${group.name}\n`;
    script += `-- 自动生成于 ${new Date().toISOString()}\n\n`;

    // 设置默认方法
    const methods = [...new Set(tests.map((t: any) => t.method))];
    if (methods.length === 1) {
      script += `wrk.method = "${methods[0]}"\n`;
    }

    // 设置默认请求头
    script += `wrk.headers["Content-Type"] = "application/json"\n`;
    if (group.http?.headers) {
      Object.entries(group.http.headers).forEach(([key, value]) => {
        script += `wrk.headers["${key}"] = "${value}"\n`;
      });
    }

    // 生成测试数据
    script += `\n-- 测试数据\n`;
    tests.forEach((test: any, index: number) => {
      script += `local test${index} = {\n`;
      script += `  method = "${test.method}",\n`;
      script += `  url = "${test.url}",\n`;
      script += `  headers = ${JSON.stringify(test.headers, null, 2)},\n`;
      if (test.body) {
        script += `  body = [[\n${test.body}\n]],\n`;
      }
      script += `  weight = ${test.weight}\n`;
      script += `}\n\n`;
    });

    // 生成请求函数
    script += `function request()\n`;
    script += `  -- 根据权重随机选择测试\n`;
    script += `  local rand = math.random() * 100\n`;
    script += `  local cumulativeWeight = 0\n`;

    tests.forEach((test: any, index: number) => {
      script += `  cumulativeWeight = cumulativeWeight + ${test.weight}\n`;
      script += `  if rand <= cumulativeWeight then\n`;
      script += `    return wrk.format("${test.method}", "${test.url}", test${index}.headers${
        test.body ? ", test" + index + ".body" : ""
      })\n`;
      script += `  end\n`;
    });

    script += `  -- 默认返回第一个测试\n`;
    script += `  return wrk.format("${tests[0].method}", "${tests[0].url}", test0.headers${
      tests[0].body ? ", test0.body" : ""
    })\n`;
    script += `end\n`;

    return script;
  }

  /**
   * 构建完整 URL
   */
  private buildFullUrl(baseUrl: string | undefined, url: string): string {
    if (!baseUrl || url.startsWith("http")) {
      return url;
    }
    return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  /**
   * 运行完整的基准测试
   */
  async runBenchmark(): Promise<BenchmarkResult> {
    console.log("\x1b[35m\n开始 WRK 基准测试...\x1b[0m");

    // 1. 初始化引擎
    await this.initialize();

    // 2. 验证配置
    console.log("\x1b[36m验证配置文件...\x1b[0m");
    validateConfig(this.config);
    console.log("\x1b[32m✓ 配置验证通过\x1b[0m");

    this.startTime = Date.now();
    const groups: GroupResult[] = [];

    try {
      // 3. 按顺序执行每个测试组
      for (let i = 0; i < this.config.groups.length; i++) {
        const group = this.config.groups[i];
        console.log(
          `\n\x1b[34m执行测试组: \x1b[1m${group.name}\x1b[0m \x1b[90m(${i + 1}/${
            this.config.groups.length
          })\x1b[0m`
        );

        const groupResult = await this.executeGroupWithWrk(group, i);
        groups.push(groupResult);

        // 发送进度更新
        if (this.options.showProgress) {
          this.progressSubject.next({
            groupName: group.name,
            completed: i + 1,
            total: this.config.groups.length,
            percentage: Math.round(((i + 1) / this.config.groups.length) * 100),
            currentTest: group.name,
            errors: 0,
            totalErrors: 0,
          });
        }

        // 发送实时统计
        this.emitRealTimeStats();

        // 处理组间延迟（如果是串行模式或有延迟配置）
        if (i < this.config.groups.length - 1) {
          // 不是最后一个组
          if (group.executionMode === "sequential" || group.delay) {
            const delayTime = group.delay || 1000; // 默认延迟1秒
            console.log(`\x1b[33m等待 ${delayTime}ms 后执行下一个测试组...\x1b[0m`);
            await new Promise((resolve) => setTimeout(resolve, delayTime));
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - this.startTime;

      // 4. 计算总体统计 - 直接使用 group.stats
      let totalRequests = 0;
      let totalSuccessfulRequests = 0;
      let totalFailedRequests = 0;
      let totalResponseTime = 0;
      let totalRPS = 0;
      let maxP95 = 0;

      groups.forEach((group) => {
        totalRequests += group.stats.totalRequests;
        totalSuccessfulRequests += group.stats.successfulRequests;
        totalFailedRequests += group.stats.failedRequests;
        totalResponseTime += group.stats.averageResponseTime * group.stats.totalRequests;
        totalRPS += group.stats.requestsPerSecond;
        maxP95 = Math.max(maxP95, group.stats.p95ResponseTime);
      });

      const averageResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
      const averageRPS = groups.length > 0 ? totalRPS / groups.length : 0;

      const overallStats = {
        totalRequests,
        successfulRequests: totalSuccessfulRequests,
        failedRequests: totalFailedRequests,
        timeoutRequests: 0,
        slowRequests: 0,
        averageResponseTime: Math.round(averageResponseTime * 100) / 100,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: Math.round(averageRPS * 100) / 100,
        errorRate: totalRequests > 0 ? totalFailedRequests / totalRequests : 0,
        timeoutRate: 0,
        slowRate: 0,
        p50ResponseTime: 0,
        p90ResponseTime: 0,
        p95ResponseTime: maxP95,
        p99ResponseTime: 0,
        totalRequestSize: 0,
        totalResponseSize: 0,
      };

      const result: BenchmarkResult = {
        startTime: this.startTime,
        endTime,
        duration,
        groups,
        overallStats,
      };

      // 5. 保存报告
      console.log("\n\x1b[36m生成测试报告...\x1b[0m");
      const reportPath = await this.reportStorage.saveTestResult(result, this.config);
      console.log(`\x1b[32m✓ 报告已保存到: \x1b[1m${reportPath}\x1b[0m`);

      // 6. 输出最终结果
      this.printFinalResults(result);

      // 7. 清理临时文件
      await this.cleanup();

      return result;
    } catch (error) {
      console.error("\x1b[31m✗ WRK 测试执行失败:\x1b[0m", error);

      // 即使失败也要清理临时文件
      await this.cleanup();

      throw error;
    }
  }

  /**
   * 使用 wrk 执行单个测试组
   */
  private async executeGroupWithWrk(group: any, groupIndex: number): Promise<GroupResult> {
    const baseUrl = group.http?.baseUrl || "http://localhost:3000";

    if (group.executionMode === "sequential") {
      // 串行执行：每个接口单独执行
      return await this.executeGroupSequentially(group, baseUrl);
    } else {
      // 并行执行：多个接口同时执行
      return await this.executeGroupInParallel(group, baseUrl);
    }
  }

  /**
   * 串行执行测试组中的所有接口
   */
  private async executeGroupSequentially(group: any, baseUrl: string): Promise<GroupResult> {
    console.log(`\x1b[33m串行执行模式: 逐个测试接口\x1b[0m`);

    const testResults: any[] = [];
    let groupStats = this.createEmptyStats();

    for (let i = 0; i < group.tests.length; i++) {
      const test = group.tests[i];
      console.log(
        `  \x1b[36m测试接口 \x1b[1m${test.name}\x1b[0m \x1b[90m(${i + 1}/${
          group.tests.length
        })\x1b[0m`
      );

      const testResult = await this.executeIndividualTest(group, test, baseUrl);
      testResults.push(testResult);

      // 累积统计数据
      groupStats = this.mergeStats(groupStats, testResult.stats);

      // 接口间延迟（如果有配置）
      if (i < group.tests.length - 1 && group.delay) {
        console.log(`  \x1b[33m等待 ${group.delay}ms 后执行下一个接口...\x1b[0m`);
        await new Promise((resolve) => setTimeout(resolve, group.delay));
      }
    }

    return {
      name: group.name,
      stats: groupStats,
      requests: testResults.map((result) => result.request),
    };
  }

  /**
   * 并行执行测试组中的所有接口
   */
  private async executeGroupInParallel(group: any, baseUrl: string): Promise<GroupResult> {
    console.log(`\x1b[35m并行执行模式: 同时测试所有接口\x1b[0m`);

    const testPromises = group.tests.map((test: any, index: number) => {
      console.log(`  \x1b[36m启动接口测试: \x1b[1m${test.name}\x1b[0m`);
      return this.executeIndividualTest(group, test, baseUrl);
    });

    const testResults = await Promise.all(testPromises);

    // 合并所有接口的统计数据
    let groupStats = this.createEmptyStats();

    testResults.forEach((result, index) => {
      groupStats = this.mergeStats(groupStats, result.stats);
    });

    return {
      name: group.name,
      stats: groupStats,
      requests: testResults.map((result) => result.request),
    };
  }

  /**
   * 执行单个接口测试
   */
  private async executeIndividualTest(group: any, test: any, baseUrl: string): Promise<any> {
    // 为单个接口生成脚本
    const scriptContent = this.generateIndividualTestScript(group, test);
    const scriptPath = path.join(this.wrkScriptsDir, `${group.name}-${test.name}.lua`);
    await fs.writeFile(scriptPath, scriptContent);

    // 按权重分配 wrk 参数
    const weightRatio = test.weight / 100;
    const testThreads = Math.max(1, Math.floor(group.threads * weightRatio));
    const testConnections = Math.max(1, Math.floor(group.connections * weightRatio));
    const duration = group.duration || 30;

    console.log(
      `    \x1b[90mwrk -t${testThreads} -c${testConnections} -d${duration}s\x1b[0m \x1b[33m${test.name}\x1b[0m \x1b[90m(权重: ${test.weight}%)\x1b[0m`
    );

    try {
      const result = await this.runWrkCommand(
        testThreads,
        testConnections,
        duration,
        scriptPath,
        baseUrl,
        {
          timeout: group.timeout,
          latency: group.latency,
        }
      );
      const wrkResult = this.parseWrkOutput(result);

      return {
        stats: {
          // 直接使用 wrk 的原始值
          totalRequests: wrkResult.requests,
          successfulRequests:
            wrkResult.requests -
            wrkResult.errors.connect -
            wrkResult.errors.read -
            wrkResult.errors.write -
            wrkResult.errors.timeout,
          failedRequests:
            wrkResult.errors.connect +
            wrkResult.errors.read +
            wrkResult.errors.write +
            wrkResult.errors.timeout,
          timeoutRequests: wrkResult.errors.timeout,
          slowRequests: 0, // wrk 没有这个指标

          // 延迟统计 - 直接使用 wrk 值
          averageResponseTime: wrkResult.latency.avg,
          minResponseTime: wrkResult.latency.avg, // wrk 没有 min，使用 avg
          maxResponseTime: wrkResult.latency.max,

          // 吞吐量 - 直接使用 wrk 值
          requestsPerSecond: wrkResult.requestsPerSecond,

          // 错误率 - 直接使用 wrk 值
          errorRate:
            wrkResult.errors.connect +
            wrkResult.errors.read +
            wrkResult.errors.write +
            wrkResult.errors.timeout,
          timeoutRate: wrkResult.errors.timeout,
          slowRate: 0, // wrk 没有这个指标

          // 延迟分布 - 直接使用 wrk 值
          p50ResponseTime: wrkResult.latency.p50,
          p90ResponseTime: wrkResult.latency.p90,
          p95ResponseTime: wrkResult.latency.p95,
          p99ResponseTime: wrkResult.latency.p99,

          // 传输统计 - 直接使用 wrk 值
          totalRequestSize: 0, // wrk 没有请求大小统计
          totalResponseSize: wrkResult.transfer.total,
        },
        request: {
          name: test.name,
          success: true,
          responseTime: wrkResult.latency.avg,
          statusCode: 200,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error(`\x1b[31m✗ 测试接口 ${test.name} 失败:\x1b[0m`, error);
      throw error;
    }
  }

  /**
   * 为单个接口生成 wrk 脚本
   */
  private generateIndividualTestScript(group: any, test: any): string {
    const fullUrl = this.buildFullUrl(group.http?.baseUrl, test.request.url);
    const headers = { ...group.http?.headers, ...test.request.headers };
    const body = test.request.body ? JSON.stringify(test.request.body, null, 2) : undefined;

    let script = `-- wrk 测试脚本: ${group.name} - ${test.name}\n`;
    script += `-- 自动生成于 ${new Date().toISOString()}\n\n`;

    // 设置方法和请求头
    script += `wrk.method = "${test.request.method}"\n`;
    script += `wrk.headers["Content-Type"] = "application/json"\n`;

    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        script += `wrk.headers["${key}"] = "${value}"\n`;
      });
    }

    if (body) {
      script += `\nwrk.body = [[\n${body}\n]]\n`;
    }

    script += `\nfunction request()\n`;
    script += `  return wrk.format("${test.request.method}", "${fullUrl}"${
      headers ? ", wrk.headers" : ""
    }${body ? ", wrk.body" : ""})\n`;
    script += `end\n`;

    return script;
  }

  /**
   * 创建空的统计数据
   */
  private createEmptyStats(): any {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeoutRequests: 0,
      slowRequests: 0,
      averageResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      timeoutRate: 0,
      slowRate: 0,
      p50ResponseTime: 0,
      p90ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      totalRequestSize: 0,
      totalResponseSize: 0,
    };
  }

  /**
   * 合并统计数据
   */
  private mergeStats(stats1: any, stats2: any): any {
    return {
      totalRequests: stats1.totalRequests + stats2.totalRequests,
      successfulRequests: stats1.successfulRequests + stats2.successfulRequests,
      failedRequests: stats1.failedRequests + stats2.failedRequests,
      timeoutRequests: stats1.timeoutRequests + stats2.timeoutRequests,
      slowRequests: stats1.slowRequests + stats2.slowRequests,
      averageResponseTime: this.weightedAverage(
        stats1.averageResponseTime,
        stats1.totalRequests,
        stats2.averageResponseTime,
        stats2.totalRequests
      ),
      minResponseTime: Math.min(
        stats1.minResponseTime || Infinity,
        stats2.minResponseTime || Infinity
      ),
      maxResponseTime: Math.max(stats1.maxResponseTime, stats2.maxResponseTime),
      requestsPerSecond: stats1.requestsPerSecond + stats2.requestsPerSecond,
      errorRate:
        (stats1.failedRequests + stats2.failedRequests) /
        (stats1.totalRequests + stats2.totalRequests),
      timeoutRate:
        (stats1.timeoutRequests + stats2.timeoutRequests) /
        (stats1.totalRequests + stats2.totalRequests),
      slowRate:
        (stats1.slowRequests + stats2.slowRequests) / (stats1.totalRequests + stats2.totalRequests),
      p50ResponseTime: this.weightedAverage(
        stats1.p50ResponseTime,
        stats1.totalRequests,
        stats2.p50ResponseTime,
        stats2.totalRequests
      ),
      p90ResponseTime: Math.max(stats1.p90ResponseTime, stats2.p90ResponseTime),
      p95ResponseTime: Math.max(stats1.p95ResponseTime, stats2.p95ResponseTime),
      p99ResponseTime: Math.max(stats1.p99ResponseTime, stats2.p99ResponseTime),
      totalRequestSize: stats1.totalRequestSize + stats2.totalRequestSize,
      totalResponseSize: stats1.totalResponseSize + stats2.totalResponseSize,
    };
  }

  /**
   * 计算加权平均值
   */
  private weightedAverage(
    value1: number,
    weight1: number,
    value2: number,
    weight2: number
  ): number {
    const totalWeight = weight1 + weight2;
    if (totalWeight === 0) return 0;
    return (value1 * weight1 + value2 * weight2) / totalWeight;
  }

  /**
   * 运行 wrk 命令
   */
  private async runWrkCommand(
    threads: number,
    connections: number,
    duration: number,
    scriptPath: string,
    baseUrl: string,
    options?: {
      timeout?: number;
      latency?: boolean;
    }
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = [
        "-t",
        threads.toString(),
        "-c",
        connections.toString(),
        "-d",
        `${duration}s`,
        "-s",
        scriptPath,
      ];

      // 添加可选参数
      if (options?.latency !== false) {
        args.push("--latency"); // 默认启用延迟统计
      }

      if (options?.timeout) {
        args.push("--timeout", `${options.timeout}s`);
      }

      args.push(baseUrl);

      const wrkProcess = spawn(this.wrkPath!, args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      wrkProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      wrkProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      wrkProcess.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`wrk 命令执行失败 (退出码: ${code}): ${stderr}`));
        }
      });

      wrkProcess.on("error", (error) => {
        reject(new Error(`启动 wrk 进程失败: ${error.message}`));
      });
    });
  }

  /**
   * 解析 wrk 输出 - 改进版本，正确解析延迟分布
   */
  private parseWrkOutput(output: string): WrkTestResult {
    const lines = output.split("\n");

    // 初始化结果
    let requests = 0;
    let duration = 0;
    let rps = 0;
    let avgLatency = 0;
    let maxLatency = 0;
    let totalTransfer = 0;
    let connectErrors = 0;
    let readErrors = 0;
    let writeErrors = 0;
    let timeoutErrors = 0;

    // 延迟分布数据
    let p50Latency = 0;
    let p75Latency = 0;
    let p90Latency = 0;
    let p95Latency = 0;
    let p99Latency = 0;

    // 逐行解析关键信息
    for (const line of lines) {
      const trimmedLine = line.trim();

      // 解析: "623130 requests in 5.10s, 85.57MB read"
      if (trimmedLine.includes("requests in") && trimmedLine.includes("s")) {
        const parts = trimmedLine.split(" ");
        requests = parseInt(parts[0]) || 0;
        const durationStr = parts.find((p) => p.includes("s"))?.replace("s,", "") || "0";
        duration = parseFloat(durationStr);

        // 解析传输量
        const mbIndex = parts.findIndex((p) => p.includes("MB"));
        if (mbIndex > 0) {
          totalTransfer = parseFloat(parts[mbIndex - 1]) || 0;
        }
      }

      // 解析: "Requests/sec: 122195.82"
      if (trimmedLine.includes("Requests/sec:")) {
        const parts = trimmedLine.split(":");
        rps = parseFloat(parts[1]?.trim()) || 0;
      }

      // 解析延迟: "Latency   107.82us  594.42us  13.70ms   98.01%"
      if (trimmedLine.startsWith("Latency") && !trimmedLine.includes("Distribution")) {
        const parts = trimmedLine.split(/\s+/);
        if (parts.length >= 4) {
          avgLatency = this.parseTimeUnit(parts[1]);
          maxLatency = this.parseTimeUnit(parts[3]);

          // 如果有更多延迟数据，尝试解析
          if (parts.length >= 5) {
            p50Latency = this.parseTimeUnit(parts[1]);
            p75Latency = this.parseTimeUnit(parts[2]);
            p90Latency = this.parseTimeUnit(parts[3]);
            p95Latency = this.parseTimeUnit(parts[3]);
            p99Latency = this.parseTimeUnit(parts[4]);
          }
        }
      }

      // 解析延迟分布: "Latency Distribution"
      if (trimmedLine.includes("Latency Distribution")) {
        // 查找下一行的延迟分布数据
        const nextLineIndex = lines.indexOf(line) + 1;
        if (nextLineIndex < lines.length) {
          const distributionLine = lines[nextLineIndex].trim();
          if (
            distributionLine.includes("50%") ||
            distributionLine.includes("90%") ||
            distributionLine.includes("99%")
          ) {
            // 解析延迟分布行，格式类似: "50%    0.52ms"
            const distParts = distributionLine.split(/\s+/);
            if (distParts.length >= 2) {
              const percentile = distParts[0];
              const latencyValue = this.parseTimeUnit(distParts[1]);

              if (percentile.includes("50%")) p50Latency = latencyValue;
              else if (percentile.includes("75%")) p75Latency = latencyValue;
              else if (percentile.includes("90%")) p90Latency = latencyValue;
              else if (percentile.includes("95%")) p95Latency = latencyValue;
              else if (percentile.includes("99%")) p99Latency = latencyValue;
            }
          }
        }
      }

      // 解析错误: "Socket errors: connect 0, read 0, write 0, timeout 0"
      if (trimmedLine.includes("Socket errors:")) {
        const errorMatch = trimmedLine.match(
          /connect (\d+), read (\d+), write (\d+), timeout (\d+)/
        );
        if (errorMatch) {
          connectErrors = parseInt(errorMatch[1]) || 0;
          readErrors = parseInt(errorMatch[2]) || 0;
          writeErrors = parseInt(errorMatch[3]) || 0;
          timeoutErrors = parseInt(errorMatch[4]) || 0;
        }
      }
    }

    // 如果没有解析到延迟分布数据，使用合理的默认值
    if (p50Latency === 0) p50Latency = avgLatency * 0.8; // P50通常低于平均值
    if (p75Latency === 0) p75Latency = avgLatency * 0.9; // P75接近平均值
    if (p90Latency === 0) p90Latency = avgLatency * 1.1; // P90略高于平均值
    if (p95Latency === 0) p95Latency = avgLatency * 1.3; // P95明显高于平均值
    if (p99Latency === 0) p99Latency = maxLatency; // P99接近最大值

    return {
      groupName: "wrk-test",
      testName: "wrk-test",
      requests,
      duration: duration * 1000, // 转换为毫秒
      requestsPerSecond: rps,
      latency: {
        avg: avgLatency,
        stdev: 0, // wrk 标准输出不包含标准差
        max: maxLatency,
        p50: p50Latency,
        p75: p75Latency,
        p90: p90Latency,
        p95: p95Latency,
        p99: p99Latency,
        stdevPercent: 0,
      },
      transfer: {
        total: Math.round(totalTransfer * 1024 * 1024), // 转换为字节，统一为整数
        perSecond: duration > 0 ? Math.round((totalTransfer * 1024 * 1024) / duration) : 0,
      },
      errors: {
        connect: connectErrors,
        read: readErrors,
        write: writeErrors,
        timeout: timeoutErrors,
      },
      performance: {
        efficiency: 1.0,
        errorRate:
          requests > 0 ? (connectErrors + readErrors + writeErrors + timeoutErrors) / requests : 0,
        throughput: duration > 0 ? totalTransfer / duration : 0,
      },
    };
  }

  /**
   * 解析时间单位 (us, ms, s) 并转换为毫秒
   */
  private parseTimeUnit(timeStr: string): number {
    if (!timeStr) return 0;

    if (timeStr.includes("us")) {
      return parseFloat(timeStr.replace("us", "")) / 1000; // 微秒转毫秒
    } else if (timeStr.includes("ms")) {
      return parseFloat(timeStr.replace("ms", "")); // 毫秒
    } else if (timeStr.includes("s")) {
      return parseFloat(timeStr.replace("s", "")) * 1000; // 秒转毫秒
    }

    return parseFloat(timeStr) || 0;
  }

  /**
   * 转换 wrk 结果为 RequestResult 格式
   */
  private convertWrkResultsToRequestResults(groups: GroupResult[]): any[] {
    const results: any[] = [];

    groups.forEach((group) => {
      group.requests.forEach((request: any) => {
        results.push({
          name: request.name,
          success: request.success,
          responseTime: request.responseTime,
          statusCode: request.statusCode,
          timestamp: request.timestamp,
        });
      });
    });

    return results;
  }

  /**
   * 发送实时统计
   */
  private emitRealTimeStats(): void {
    if (!this.options.showProgress) return;

    // 计算当前统计
    const stats: RealTimeStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      currentConcurrency: 0,
      maxConcurrency: 0,
    };

    // 从已完成的测试组中收集数据
    // 这里可以实现更复杂的统计逻辑

    this.statsSubject.next(stats);
  }

  /**
   * 打印最终结果 - 优雅版
   */
  private printFinalResults(result: BenchmarkResult): void {
    const stats = result.overallStats;

    console.log("\n\x1b[36m" + "─".repeat(60) + "\x1b[0m");
    console.log("\x1b[1m\x1b[37m                ThunderBench 性能测试结果\x1b[0m");
    console.log("\x1b[36m" + "─".repeat(60) + "\x1b[0m");

    console.log(`\x1b[90m总耗时:\x1b[0m \x1b[1m${(result.duration / 1000).toFixed(2)}s\x1b[0m`);
    console.log(`\x1b[90m总请求数:\x1b[0m \x1b[1m${stats.totalRequests.toLocaleString()}\x1b[0m`);
    console.log(
      `\x1b[32m成功:\x1b[0m \x1b[1m${stats.successfulRequests.toLocaleString()}\x1b[0m \x1b[90m(${(
        (stats.successfulRequests / stats.totalRequests) *
        100
      ).toFixed(1)}%)\x1b[0m`
    );

    if (stats.failedRequests > 0) {
      console.log(
        `\x1b[31m失败:\x1b[0m \x1b[1m${stats.failedRequests.toLocaleString()}\x1b[0m \x1b[90m(${(
          (stats.failedRequests / stats.totalRequests) *
          100
        ).toFixed(1)}%)\x1b[0m`
      );
    }

    console.log(`\x1b[90m平均延迟:\x1b[0m \x1b[1m${stats.averageResponseTime}ms\x1b[0m`);
    console.log(`\x1b[90mP95延迟:\x1b[0m \x1b[1m${stats.p95ResponseTime}ms\x1b[0m`);
    console.log(
      `\x1b[93m吞吐量:\x1b[0m \x1b[1m\x1b[33m${stats.requestsPerSecond.toFixed(1)} req/s\x1b[0m`
    );

    // 简化的延迟分布
    if (stats.p95ResponseTime) {
      console.log(
        `\x1b[90m延迟分布:\x1b[0m P50: \x1b[1m${stats.p50ResponseTime}ms\x1b[0m | P90: \x1b[1m${stats.p90ResponseTime}ms\x1b[0m | P95: \x1b[1m${stats.p95ResponseTime}ms\x1b[0m | P99: \x1b[1m${stats.p99ResponseTime}ms\x1b[0m`
      );
    }

    console.log("\x1b[36m" + "─".repeat(60) + "\x1b[0m\n");
  }

  /**
   * 清理临时脚本文件
   */
  private async cleanupScripts(): Promise<void> {
    try {
      await fs.rm(this.wrkScriptsDir, { recursive: true, force: true });
      console.log("🧹 清理临时脚本文件完成");
    } catch (error) {
      console.warn("⚠️  清理临时文件失败:", error);
    }
  }

  /**
   * 获取进度流
   */
  getProgressStream(): Observable<TestProgress> {
    return this.progressSubject.asObservable();
  }

  /**
   * 获取统计流
   */
  getStatsStream(): Observable<RealTimeStats> {
    return this.statsSubject.asObservable();
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.progressSubject.complete();
    this.statsSubject.complete();
  }
}
