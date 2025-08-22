import { ApiTestConfig } from "../types";

/**
 * 计算请求分布
 * @param tests 测试配置数组
 * @param totalRequests 总请求数
 * @returns 每个接口的请求数分布
 */
export const calculateRequestDistribution = (
  tests: ApiTestConfig[],
  totalRequests: number
): Record<string, number> => {
  // 验证请求总数
  if (totalRequests <= 0) {
    throw new Error("请求总数必须大于0");
  }

  // 验证权重范围
  tests.forEach((test) => {
    if (test.weight < 0 || test.weight > 100) {
      throw new Error(`权重必须在0-100之间，当前: ${test.weight}`);
    }
  });

  // 验证权重总和
  const totalWeight = tests.reduce((sum, test) => sum + test.weight, 0);

  if (totalWeight !== 100) {
    throw new Error(`权重总和必须为100，当前为${totalWeight}`);
  }

  // 第一轮：按权重计算，向下取整
  const distribution = tests.reduce((dist, test) => {
    dist[test.name] = Math.floor((test.weight / 100) * totalRequests);
    return dist;
  }, {} as Record<string, number>);

  // 计算已分配的请求数
  const allocatedRequests = Object.values(distribution).reduce((sum, count) => sum + count, 0);

  // 剩余请求数
  const remainingRequests = totalRequests - allocatedRequests;

  // 第二轮：分配剩余请求给权重最高的接口
  if (remainingRequests > 0) {
    const sortedTests = [...tests].sort((a, b) => b.weight - a.weight);

    for (let i = 0; i < remainingRequests; i++) {
      const testName = sortedTests[i % sortedTests.length].name;
      distribution[testName]++;
    }
  }

  return distribution;
};
