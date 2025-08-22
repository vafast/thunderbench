// 基础请求配置
export interface RequestConfig {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>; // URL查询参数
  params?: Record<string, any>; // URL路径参数
  formData?: Record<string, any>; // 表单数据
  timeout?: number;
}

// HTTP配置
export interface HttpConfig {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// 错误处理配置
export interface ErrorHandlingConfig {
  expectMaxResponseTime: number; // 期望最大响应时间(毫秒)
}

// 单个接口测试配置
export interface ApiTestConfig {
  name: string;
  request: RequestConfig;
  weight: number; // 权重(0-100，总和应该=100)
  errorHandling?: ErrorHandlingConfig; // 可选的错误处理配置
}

// 测试组配置
export interface TestGroupConfig {
  name: string;
  http: HttpConfig;
  
  // wrk 原生参数
  threads: number;           // -t, 线程数
  connections: number;        // -c, 连接数
  duration: number;          // -d, 测试时长(秒)
  timeout?: number;          // --timeout, 超时时间（秒）
  latency?: boolean;         // --latency, 是否显示详细延迟统计
  
  // 测试配置
  tests: ApiTestConfig[];
  
  // 执行控制（编排参数）
  executionMode: "parallel" | "sequential";  // 并行或串行执行多个测试
  delay?: number;                              // 组间延迟(秒)
}

// 完整测试配置
export interface BenchmarkConfig {
  name: string;
  description?: string;
  groups: TestGroupConfig[];
}

// 单个请求结果
export interface RequestResult {
  name: string; // 接口名称
  success: boolean; // 是否成功
  responseTime: number; // 响应时间(毫秒)
  statusCode?: number; // HTTP状态码
  error?: string; // 错误信息
  timestamp: number; // 请求时间戳
  requestSize?: number; // 请求大小(bytes)
  responseSize?: number; // 响应大小(bytes)
  isTimeout?: boolean; // 是否超时
  isSlow?: boolean; // 是否响应过慢
}

// 实时统计指标
export interface RealTimeStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeoutRequests: number; // 超时请求数
  slowRequests: number; // 响应过慢请求数
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  timeoutRate: number; // 超时率
  slowRate: number; // 响应过慢率
}

// 详细统计指标
export interface DetailedStats extends RealTimeStats {
  p50ResponseTime: number; // 50%请求响应时间
  p90ResponseTime: number; // 90%请求响应时间
  p95ResponseTime: number; // 95%请求响应时间
  p99ResponseTime: number; // 99%请求响应时间
  totalRequestSize: number; // 总请求大小
  totalResponseSize: number; // 总响应大小
}

// 测试组结果
export interface GroupResult {
  name: string;
  stats: DetailedStats;
  requests: RequestResult[];
}

// 完整测试结果
export interface BenchmarkResult {
  startTime: number;
  endTime: number;
  duration: number;
  groups: GroupResult[];
  overallStats: DetailedStats;
}
