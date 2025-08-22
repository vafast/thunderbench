import { describe, it, expect } from "vitest";
import { validateConfig } from "../config-validation";
import { BenchmarkConfig } from "../../types";
import path from "path";

describe("配置文件示例测试", () => {
  it("应该能正确加载和验证基础配置文件", async () => {
    const configPath = path.join(process.cwd(), "test-config.ts");
    const configModule = await import(configPath);
    const config: BenchmarkConfig = configModule.default;

    // 验证配置
    expect(() => validateConfig(config)).not.toThrow();

    // 验证基本结构
    expect(config.groups).toHaveLength(2);
    expect(config.groups[0].name).toBe("user-auth-group");
    expect(config.groups[1].name).toBe("posts-api-group");

    console.log("✅ 基础配置文件验证通过");
  });

  it("应该能正确加载和验证简单配置文件", async () => {
    const configPath = path.join(process.cwd(), "examples/simple-config.ts");
    const configModule = await import(configPath);
    const config: BenchmarkConfig = configModule.default;

    // 验证配置
    expect(() => validateConfig(config)).not.toThrow();

    // 验证基本结构
    expect(config.groups).toHaveLength(1);
    expect(config.groups[0].tests).toHaveLength(1);
    expect(config.groups[0].tests[0].weight).toBe(100);

    console.log("✅ 简单配置文件验证通过");
  });

  it("应该能正确加载和验证复杂配置文件", async () => {
    const configPath = path.join(process.cwd(), "examples/complex-config.ts");
    const configModule = await import(configPath);
    const config: BenchmarkConfig = configModule.default;

    // 验证配置
    expect(() => validateConfig(config)).not.toThrow();

    // 验证基本结构
    expect(config.groups).toHaveLength(4);

    // 验证各组的权重总和都是100
    config.groups.forEach((group) => {
      const totalWeight = group.tests.reduce((sum, test) => sum + test.weight, 0);
      expect(totalWeight).toBe(100);
    });

    console.log("✅ 复杂配置文件验证通过");
  });

  it("应该能正确加载和验证REST API配置文件", async () => {
    const configPath = path.join(process.cwd(), "examples/rest-api-config.ts");
    const configModule = await import(configPath);
    const config: BenchmarkConfig = configModule.default;

    // 验证配置
    expect(() => validateConfig(config)).not.toThrow();

    // 验证基本结构
    expect(config.groups).toHaveLength(2);

    // 验证包含不同的HTTP方法
    const allMethods = config.groups.flatMap((group) =>
      group.tests.map((test) => test.request.method)
    );
    expect(allMethods).toContain("GET");
    expect(allMethods).toContain("POST");
    expect(allMethods).toContain("PUT");
    expect(allMethods).toContain("PATCH");
    expect(allMethods).toContain("DELETE");

    // 验证包含不同类型的参数
    const hasQuery = config.groups.some((group) => group.tests.some((test) => test.request.query));
    const hasBody = config.groups.some((group) => group.tests.some((test) => test.request.body));
    const hasFormData = config.groups.some((group) =>
      group.tests.some((test) => test.request.formData)
    );

    expect(hasQuery).toBe(true);
    expect(hasBody).toBe(true);
    expect(hasFormData).toBe(true);

    console.log("✅ REST API配置文件验证通过");
  });

  it("应该能验证所有配置文件的权重分配", async () => {
    const configFiles = [
      "test-config.ts",
      "examples/simple-config.ts",
      "examples/complex-config.ts",
      "examples/rest-api-config.ts",
    ];

    for (const configFile of configFiles) {
      const configPath = path.join(process.cwd(), configFile);
      const configModule = await import(configPath);
      const config: BenchmarkConfig = configModule.default;

      // 验证每个组的权重总和
      config.groups.forEach((group) => {
        const totalWeight = group.tests.reduce((sum, test) => sum + test.weight, 0);
        expect(totalWeight).toBe(100);
      });
    }

    console.log("✅ 所有配置文件的权重分配都正确");
  });
});
