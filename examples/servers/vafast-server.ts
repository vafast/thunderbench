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

const server = new Server([
  // Hello World
  {
    method: "GET",
    path: "/",
    handler: () => new Response("Hello World"),
  },
  // 健康检查
  {
    method: "GET",
    path: "/health",
    handler: () => new Response("OK"),
  },
  // JSON API - 获取用户列表
  {
    method: "GET",
    path: "/api/users",
    handler: () =>
      new Response(JSON.stringify(users), {
        headers: { "Content-Type": "application/json" },
      }),
  },
  // 动态参数 - 获取单个用户
  {
    method: "GET",
    path: "/api/users/:id",
    handler: (req) => {
      const params = (req as unknown as { params: { id: string } }).params;
      const user = users.find((u) => u.id === parseInt(params.id));
      return new Response(JSON.stringify(user || { error: "Not found" }), {
        status: user ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      });
    },
  },
  // Query 参数 - 搜索
  {
    method: "GET",
    path: "/api/search",
    handler: (req) => {
      const url = new URL(req.url);
      const q = url.searchParams.get("q");
      const page = url.searchParams.get("page") || "1";
      const limit = url.searchParams.get("limit") || "10";

      return new Response(
        JSON.stringify({
          query: q,
          page: parseInt(page),
          limit: parseInt(limit),
          results: users.filter((u) => u.name.toLowerCase().includes((q || "").toLowerCase())),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    },
  },
  // POST JSON - 创建用户
  {
    method: "POST",
    path: "/api/users",
    handler: async (req) => {
      const body = await req.json();
      const newUser = { id: users.length + 1, ...body };
      return new Response(JSON.stringify(newUser), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
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
  // 构建 Request 对象
  const protocol = "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const url = `${protocol}://${host}${req.url}`;

  // 读取请求体
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

  // 调用 Vafast handler
  const response = await server.fetch(request);

  // 转换响应
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
}

// 创建 Node.js HTTP 服务器
const httpServer = createServer(handleRequest);

httpServer.listen(PORT, () => {
  console.log(`Vafast server running on http://localhost:${PORT}`);
});

export default { fetch: server.fetch };
