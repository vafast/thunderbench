/**
 * Vafast 测试服务器
 * 使用 @vafast/node-server 优化适配器
 */

import { serve } from "@vafast/node-server";
import { Server } from "vafast";

const PORT = parseInt(process.env.PORT || "3001");

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// 使用简化的 handler，直接返回数据，让 mapResponse 自动处理
const server = new Server([
  // Hello World - 直接返回字符串
  {
    method: "GET",
    path: "/",
    handler: () => "Hello World",
  },
  // 健康检查
  {
    method: "GET",
    path: "/health",
    handler: () => "OK",
  },
  // JSON API - 直接返回对象
  {
    method: "GET",
    path: "/api/users",
    handler: () => users,
  },
  // 动态参数
  {
    method: "GET",
    path: "/api/users/:id",
    handler: (req) => {
      const params = (req as unknown as { params: { id: string } }).params;
      const user = users.find((u) => u.id === parseInt(params.id));
      return user || { error: "Not found" };
    },
  },
  // Query 参数
  {
    method: "GET",
    path: "/api/search",
    handler: (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      const page = url.searchParams.get("page") || "1";
      const limit = url.searchParams.get("limit") || "10";

      return {
        query: q,
        page: parseInt(page),
        limit: parseInt(limit),
        results: users.filter((u) =>
          u.name.toLowerCase().includes((q || "").toLowerCase())
        ),
      };
    },
  },
  // POST JSON
  {
    method: "POST",
    path: "/api/users",
    handler: async (req) => {
      const body = await req.json();
      return { id: users.length + 1, ...body };
    },
  },
]);

// 使用优化的 Node.js 适配器
serve({ fetch: server.fetch, port: PORT }, () => {
  console.log(`Vafast server running on http://localhost:${PORT}`);
});
