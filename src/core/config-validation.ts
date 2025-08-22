import { BenchmarkConfig, TestGroupConfig, ApiTestConfig } from "../types";

/**
 * 验证测试配置
 * @param config 测试配置
 */
export const validateConfig = (config: BenchmarkConfig): void => {
  // 验证测试组
  if (!config.groups || config.groups.length === 0) {
    throw new Error("至少需要一个测试组");
  }

  // 验证每个测试组
  config.groups.forEach((group) => {
    validateGroup(group);
  });
};

/**
 * 验证测试组配置
 * @param group 测试组配置
 */
const validateGroup = (group: TestGroupConfig): void => {
  // 验证组名称
  if (!group.name || group.name.trim() === "") {
    throw new Error("测试组名称不能为空");
  }

  // 验证执行模式
  if (group.executionMode !== "parallel" && group.executionMode !== "sequential") {
    throw new Error('执行模式必须是 "parallel" 或 "sequential"');
  }

  // 验证延迟配置
  if (group.delay !== undefined && group.delay < 0) {
    throw new Error("延迟时间不能为负数");
  }

  // 验证HTTP配置
  if (group.http) {
    validateHttpConfig(group.http);
  }

  // 验证测试接口
  if (!group.tests || group.tests.length === 0) {
    throw new Error(`测试组 "${group.name}" 至少需要一个测试接口`);
  }

  // 验证每个测试接口
  group.tests.forEach((test) => {
    validateTest(test, group.name);
  });

  // 验证 wrk 参数
  if (group.threads <= 0) {
    throw new Error("线程数必须大于0");
  }

  if (group.connections <= 0) {
    throw new Error("连接数必须大于0");
  }

  // 验证测试策略（duration）
  if (!group.duration) {
    throw new Error(`测试组 "${group.name}" 必须指定 duration`);
  }

  if (group.duration <= 0) {
    throw new Error("测试时长必须大于0");
  }

  // 验证权重总和
  validateWeights(group.tests, group.name);
};

/**
 * 验证测试接口配置
 * @param test 测试接口配置
 * @param groupName 组名称
 */
const validateTest = (test: ApiTestConfig, groupName: string): void => {
  // 验证接口名称
  if (!test.name || test.name.trim() === "") {
    throw new Error("测试接口名称不能为空");
  }

  // 验证请求配置
  if (!test.request) {
    throw new Error(`测试接口 "${test.name}" 缺少请求配置`);
  }

  if (!test.request.method) {
    throw new Error(`测试接口 "${test.name}" 缺少请求方法`);
  }

  if (!test.request.url) {
    throw new Error(`测试接口 "${test.name}" 缺少请求URL`);
  }

  // 验证权重
  if (test.weight < 0 || test.weight > 100) {
    throw new Error(`测试接口 "${test.name}" 权重必须在0-100之间，当前: ${test.weight}`);
  }

  // 验证错误处理配置
  if (test.errorHandling) {
    if (test.errorHandling.expectMaxResponseTime <= 0) {
      throw new Error("期望最大响应时间必须大于0");
    }
  }
};

/**
 * 验证HTTP配置
 * @param httpConfig HTTP配置
 */
const validateHttpConfig = (httpConfig: any): void => {
  if (httpConfig.timeout !== undefined && httpConfig.timeout < 0) {
    throw new Error("HTTP超时时间不能为负数");
  }
};

/**
 * 验证权重总和
 * @param tests 测试接口数组
 * @param groupName 组名称
 */
const validateWeights = (tests: ApiTestConfig[], groupName: string): void => {
  const totalWeight = tests.reduce((sum, test) => sum + test.weight, 0);

  if (Math.abs(totalWeight - 100) > 0.01) {
    // 允许0.01的误差
    throw new Error(`测试组 "${groupName}" 权重总和必须为100，当前为${totalWeight}`);
  }
};
