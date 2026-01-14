/**
 * Vafast 测试服务器
 * 使用 Bun 原生 serve（最高性能）
 */

import { Server, defineRoute, defineRoutes } from "vafast";

const PORT = parseInt(process.env.PORT || "3001");

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// 使用 defineRoutes 定义路由
const routes = defineRoutes([
  // Hello World - 直接返回字符串
  defineRoute({
    method: "GET",
    path: "/",
    handler: () => "Hello World",
  }),
  // 健康检查
  defineRoute({
    method: "GET",
    path: "/health",
    handler: () => "OK",
  }),
  // JSON API - 直接返回对象
  defineRoute({
    method: "GET",
    path: "/api/users",
    handler: () => users,
  }),
  // 动态参数
  defineRoute({
    method: "GET",
    path: "/api/users/:id",
    handler: ({ params }) => {
      const user = users.find((u) => u.id === parseInt(params.id));
      return user || { error: "Not found" };
    },
  }),
  // Query 参数
  defineRoute({
    method: "GET",
    path: "/api/search",
    handler: ({ query }) => {
      const q = query.q || "";
      const page = parseInt(query.page || "1");
      const limit = parseInt(query.limit || "10");

      return {
        query: q,
        page,
        limit,
        results: users.filter((u) =>
          u.name.toLowerCase().includes(q.toLowerCase()),
        ),
      };
    },
  }),
  // POST JSON
  defineRoute({
    method: "POST",
    path: "/api/users",
    handler: ({ body }) => ({ id: users.length + 1, ...body }),
  }),
]);

const server = new Server(routes);

// 使用 Bun 原生 serve（最高性能）
export default {
  port: PORT,
  fetch: server.fetch,
};

console.log(`Vafast server running on http://localhost:${PORT}`);
