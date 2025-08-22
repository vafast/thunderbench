import { RequestResult, DetailedStats } from "../types";

/**
 * 计算百分位数
 * @param values 数值数组
 * @param percentile 百分位数 (0-100)
 * @returns 百分位数值
 */
export const calculatePercentile = (values: number[], percentile: number): number => {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);

  if (index === Math.floor(index)) {
    return sorted[index];
  }

  const lower = sorted[Math.floor(index)];
  const upper = sorted[Math.ceil(index)];
  const weight = index - Math.floor(index);

  // 修复精度问题
  const result = lower + (upper - lower) * weight;
  return Math.round(result * 100) / 100;
};

/**
 * 计算统计指标
 * @param results 请求结果数组
 * @param startTime 测试开始时间（可选）
 * @returns 详细统计信息
 */
export const calculateStats = (results: RequestResult[], startTime?: number): DetailedStats => {
  if (results.length === 0) {
    return createEmptyStats();
  }

  const responseTimes = results.map((r) => r.responseTime);
  const totalRequests = results.length;
  const successfulRequests = results.filter((r) => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const timeoutRequests = results.filter((r) => r.isTimeout).length;
  const slowRequests = results.filter((r) => r.isSlow).length;

  const totalRequestSize = results.reduce((sum, r) => sum + (r.requestSize || 0), 0);
  const totalResponseSize = results.reduce((sum, r) => sum + (r.responseSize || 0), 0);

  const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / totalRequests;
  // 避免堆栈溢出，使用循环而不是spread操作符
  let minResponseTime = responseTimes[0] || 0;
  let maxResponseTime = responseTimes[0] || 0;
  for (let i = 0; i < responseTimes.length; i++) {
    if (responseTimes[i] < minResponseTime) minResponseTime = responseTimes[i];
    if (responseTimes[i] > maxResponseTime) maxResponseTime = responseTimes[i];
  }

  const errorRate = failedRequests / totalRequests;
  const timeoutRate = timeoutRequests / totalRequests;
  const slowRate = slowRequests / totalRequests;

  // 计算百分位数
  const p50ResponseTime = calculatePercentile(responseTimes, 50);
  const p90ResponseTime = calculatePercentile(responseTimes, 90);
  const p95ResponseTime = calculatePercentile(responseTimes, 95);
  const p99ResponseTime = calculatePercentile(responseTimes, 99);

  // 计算每秒请求数
  let requestsPerSecond = 0;
  if (startTime && results.length > 0) {
    // 避免堆栈溢出，使用循环而不是spread操作符
    let endTime = results[0]?.timestamp || 0;
    for (let i = 0; i < results.length; i++) {
      if (results[i].timestamp > endTime) endTime = results[i].timestamp;
    }
    const duration = (endTime - startTime) / 1000; // 转换为秒
    if (duration > 0) {
      requestsPerSecond = totalRequests / duration;
    }
  }

  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    timeoutRequests,
    slowRequests,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    p50ResponseTime,
    p90ResponseTime,
    p95ResponseTime,
    p99ResponseTime,
    requestsPerSecond,
    errorRate,
    timeoutRate,
    slowRate,
    totalRequestSize,
    totalResponseSize,
  };
};

/**
 * 创建空统计信息
 * @returns 空的统计信息
 */
const createEmptyStats = (): DetailedStats => ({
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  timeoutRequests: 0,
  slowRequests: 0,
  averageResponseTime: 0,
  minResponseTime: 0,
  maxResponseTime: 0,
  p50ResponseTime: 0,
  p90ResponseTime: 0,
  p95ResponseTime: 0,
  p99ResponseTime: 0,
  requestsPerSecond: 0,
  errorRate: 0,
  timeoutRate: 0,
  slowRate: 0,
  totalRequestSize: 0,
  totalResponseSize: 0,
});
