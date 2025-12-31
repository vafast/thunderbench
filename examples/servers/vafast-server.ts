/**
 * Vafast 测试服务器
 * 使用 Node.js 标准 API
 */

import { createServer } from "node:http";
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

/**
 * 将 Web Response 转换为 Node.js 响应
 */
async function handleRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse
) {
  const protocol = "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `${protocol}://${host}${req.url}`;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const request = new Request(url, {
    method: req.method,
    headers: req.headers as Record<string, string>,
    body: body && req.method !== "GET" && req.method !== "HEAD" ? body : undefined,
  });

  const response = await server.fetch(request);

  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
}

const httpServer = createServer(handleRequest);

httpServer.listen(PORT, () => {
  console.log(`Vafast server running on http://localhost:${PORT}`);
});
