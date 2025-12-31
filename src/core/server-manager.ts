/**
 * 服务器生命周期管理器
 *
 * 用于自动启动、停止和管理测试目标服务器
 */

import { spawn, ChildProcess, SpawnOptions } from "child_process";
import { Subject, Observable, firstValueFrom, timeout, catchError, of } from "rxjs";

/** 服务器配置 */
export interface ServerConfig {
  /** 服务器名称 */
  name: string;
  /** 启动命令 */
  command: string;
  /** 命令参数 */
  args?: string[];
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 服务器端口 */
  port: number;
  /** 健康检查路径 */
  healthCheckPath?: string;
  /** 启动超时 (ms) */
  startupTimeout?: number;
  /** 预热请求数 */
  warmupRequests?: number;
}

/** 服务器状态 */
export type ServerStatus = "stopped" | "starting" | "running" | "error" | "stopping";

/** 服务器事件 */
export interface ServerEvent {
  server: string;
  status: ServerStatus;
  message?: string;
  error?: Error;
  timestamp: number;
}

/** 健康检查结果 */
export interface HealthCheckResult {
  healthy: boolean;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

/**
 * 单个服务器实例管理
 */
export class ServerInstance {
  private process: ChildProcess | null = null;
  private status: ServerStatus = "stopped";
  private eventSubject = new Subject<ServerEvent>();
  private stdout: string[] = [];
  private stderr: string[] = [];

  constructor(private config: ServerConfig) {}

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    if (this.status === "running") {
      return;
    }

    this.emitEvent("starting", `启动服务器: ${this.config.name}`);

    const spawnOptions: SpawnOptions = {
      cwd: this.config.cwd,
      env: { ...process.env, ...this.config.env, PORT: String(this.config.port) },
      stdio: ["pipe", "pipe", "pipe"],
      detached: false,
    };

    try {
      this.process = spawn(this.config.command, this.config.args || [], spawnOptions);

      // 收集输出
      this.process.stdout?.on("data", (data) => {
        this.stdout.push(data.toString());
      });

      this.process.stderr?.on("data", (data) => {
        this.stderr.push(data.toString());
      });

      // 监听进程退出
      this.process.on("exit", (code) => {
        if (this.status !== "stopping") {
          this.emitEvent("error", `服务器意外退出，退出码: ${code}`);
        }
        this.status = "stopped";
      });

      this.process.on("error", (err) => {
        this.emitEvent("error", `服务器错误: ${err.message}`, err);
        this.status = "error";
      });

      // 等待服务器就绪
      await this.waitForReady();
      this.status = "running";
      this.emitEvent("running", `服务器已启动: ${this.config.name} (端口: ${this.config.port})`);

      // 执行预热
      if (this.config.warmupRequests && this.config.warmupRequests > 0) {
        await this.warmup();
      }
    } catch (error) {
      this.status = "error";
      this.emitEvent("error", `启动失败: ${error}`, error as Error);
      throw error;
    }
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    if (!this.process || this.status === "stopped") {
      return;
    }

    this.emitEvent("stopping", `停止服务器: ${this.config.name}`);
    this.status = "stopping";

    return new Promise((resolve, reject) => {
      const killTimeout = setTimeout(() => {
        // 强制杀死进程
        this.process?.kill("SIGKILL");
        resolve();
      }, 5000);

      this.process!.on("exit", () => {
        clearTimeout(killTimeout);
        this.status = "stopped";
        this.emitEvent("stopped", `服务器已停止: ${this.config.name}`);
        resolve();
      });

      // 发送 SIGTERM 信号
      this.process!.kill("SIGTERM");
    });
  }

  /**
   * 等待服务器就绪
   */
  private async waitForReady(): Promise<void> {
    const startTime = Date.now();
    const timeoutMs = this.config.startupTimeout || 30000;
    const healthPath = this.config.healthCheckPath || "/";
    const url = `http://localhost:${this.config.port}${healthPath}`;

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.healthCheck();
      if (result.healthy) {
        return;
      }
      // 等待 100ms 后重试
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`服务器 ${this.config.name} 启动超时 (${timeoutMs}ms)`);
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const healthPath = this.config.healthCheckPath || "/";
    const url = `http://localhost:${this.config.port}${healthPath}`;

    try {
      const start = performance.now();
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      const responseTime = performance.now() - start;

      return {
        healthy: response.ok,
        responseTime,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 执行预热请求
   */
  private async warmup(): Promise<void> {
    const count = this.config.warmupRequests || 100;
    const healthPath = this.config.healthCheckPath || "/";
    const url = `http://localhost:${this.config.port}${healthPath}`;

    console.log(`  🔥 预热 ${this.config.name}: ${count} 个请求...`);

    const concurrency = 10;
    const batches = Math.ceil(count / concurrency);

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(concurrency, count - i * concurrency);
      await Promise.all(
        Array.from({ length: batchSize }, () =>
          fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => {})
        )
      );
    }

    console.log(`  ✅ 预热完成: ${this.config.name}`);
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<ServerEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * 获取当前状态
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * 获取服务器名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取服务器端口
   */
  getPort(): number {
    return this.config.port;
  }

  /**
   * 获取 baseUrl
   */
  getBaseUrl(): string {
    return `http://localhost:${this.config.port}`;
  }

  /**
   * 获取标准输出
   */
  getStdout(): string[] {
    return this.stdout;
  }

  /**
   * 获取标准错误
   */
  getStderr(): string[] {
    return this.stderr;
  }

  /**
   * 发送事件
   */
  private emitEvent(status: ServerStatus, message: string, error?: Error): void {
    this.eventSubject.next({
      server: this.config.name,
      status,
      message,
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * 销毁实例
   */
  destroy(): void {
    this.eventSubject.complete();
  }
}

/**
 * 服务器管理器
 *
 * 管理多个服务器的生命周期
 */
export class ServerManager {
  private servers: Map<string, ServerInstance> = new Map();
  private eventSubject = new Subject<ServerEvent>();

  /**
   * 添加服务器配置
   */
  addServer(config: ServerConfig): void {
    const instance = new ServerInstance(config);
    this.servers.set(config.name, instance);

    // 转发事件
    instance.getEventStream().subscribe((event) => {
      this.eventSubject.next(event);
    });
  }

  /**
   * 批量添加服务器配置
   */
  addServers(configs: ServerConfig[]): void {
    configs.forEach((config) => this.addServer(config));
  }

  /**
   * 启动指定服务器
   */
  async startServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`服务器 ${name} 不存在`);
    }
    await server.start();
  }

  /**
   * 启动所有服务器
   */
  async startAll(): Promise<void> {
    console.log("\n🚀 启动所有服务器...");

    // 串行启动以避免端口冲突
    for (const [name, server] of this.servers) {
      try {
        await server.start();
      } catch (error) {
        console.error(`❌ 启动 ${name} 失败:`, error);
        throw error;
      }
    }

    console.log("✅ 所有服务器已启动\n");
  }

  /**
   * 停止指定服务器
   */
  async stopServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`服务器 ${name} 不存在`);
    }
    await server.stop();
  }

  /**
   * 停止所有服务器
   */
  async stopAll(): Promise<void> {
    console.log("\n🛑 停止所有服务器...");

    await Promise.all(
      Array.from(this.servers.values()).map((server) => server.stop().catch(() => {}))
    );

    console.log("✅ 所有服务器已停止\n");
  }

  /**
   * 获取服务器实例
   */
  getServer(name: string): ServerInstance | undefined {
    return this.servers.get(name);
  }

  /**
   * 获取所有服务器名称
   */
  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * 获取所有服务器状态
   */
  getAllStatus(): Map<string, ServerStatus> {
    const status = new Map<string, ServerStatus>();
    for (const [name, server] of this.servers) {
      status.set(name, server.getStatus());
    }
    return status;
  }

  /**
   * 获取事件流
   */
  getEventStream(): Observable<ServerEvent> {
    return this.eventSubject.asObservable();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    for (const server of this.servers.values()) {
      server.destroy();
    }
    this.servers.clear();
    this.eventSubject.complete();
  }
}

