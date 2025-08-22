import fs from "fs/promises";
import path from "path";
import { BenchmarkResult, BenchmarkConfig } from "../types";
import { JsonReportGenerator } from "./json-report-generator";
import { MarkdownReportGenerator } from "./markdown-report-generator";

export class ReportStorage {
  private jsonGenerator: JsonReportGenerator;
  private markdownGenerator: MarkdownReportGenerator;

  constructor() {
    this.jsonGenerator = new JsonReportGenerator();
    this.markdownGenerator = new MarkdownReportGenerator();
  }

  async saveTestResult(
    result: BenchmarkResult,
    config: BenchmarkConfig,
    basePath: string = "reports"
  ): Promise<string> {
    // 生成本地时间戳目录名
    const now = new Date();
    const timestamp =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      "-" +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      String(now.getSeconds()).padStart(2, "0");

    const reportDir = path.join(basePath, timestamp);

    // 创建时间戳目录
    await fs.mkdir(reportDir, { recursive: true });

    // 保存 k6 风格的 JSON 报告
    await this.saveK6StyleJsonReport(reportDir, result, config, timestamp);

    // 保存 Markdown 表格报告
    await this.saveMarkdownTableReport(reportDir, result, config, timestamp);

    return reportDir;
  }

  private async saveK6StyleJsonReport(
    reportDir: string,
    result: BenchmarkResult,
    config: BenchmarkConfig,
    timestamp: string
  ): Promise<void> {
    const reportData = this.jsonGenerator.generateK6StyleJsonReport(result, config, timestamp);

    await fs.writeFile(path.join(reportDir, "report.json"), JSON.stringify(reportData, null, 2));
  }

  private async saveMarkdownTableReport(
    reportDir: string,
    result: BenchmarkResult,
    config: BenchmarkConfig,
    timestamp: string
  ): Promise<void> {
    const markdownContent = this.markdownGenerator.generateMarkdownTableReport(
      result,
      config,
      timestamp
    );

    await fs.writeFile(path.join(reportDir, "report.md"), markdownContent);
  }
}
