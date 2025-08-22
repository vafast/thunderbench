const config = {
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
      threads: 4, // 4个线程
      connections: 100, // 100个连接
      duration: 10, // 10秒
      timeout: 5, // 5秒超时
      latency: true, // 启用详细延迟统计
      executionMode: "parallel",
      tests: [
        {
          name: "GET 请求测试",
          request: {
            method: "GET",
            url: "/techempower/json",
          },
          weight: 100,
        },
      ],
    },
  ],
};

export default config;
