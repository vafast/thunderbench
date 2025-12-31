/**
 * 简单配置示例
 * 展示基本的 wrk 参数配置
 */

import type { BenchmarkConfig } from "thunderbench";

const config: BenchmarkConfig = {
  name: "简单 wrk 配置演示",
  description: "展示基本的 wrk 参数配置",
  groups: [
    {
      name: "基础测试组",
      http: {
        baseUrl: "http://localhost:3000",
        headers: {
          "User-Agent": "wrk-benchmark/1.0",
        },
      },
      threads: 4,
      connections: 100,
      duration: 10,
      timeout: 5,
      latency: true,
      executionMode: "parallel",
      tests: [
        {
          name: "GET 请求测试",
          request: {
            method: "GET",
            url: "/",
          },
          weight: 100,
        },
      ],
    },
  ],
};

export default config;

