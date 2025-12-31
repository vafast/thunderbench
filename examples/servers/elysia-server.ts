/**
 * Elysia 测试服务器
 * 注意: Elysia 原生支持 Bun，使用其内置 listen 方法
 * 该方法在 Bun 运行时下工作，不直接调用 Bun API
 */

import { Elysia } from "elysia";

const PORT = parseInt(process.env.PORT || "3004");

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

const app = new Elysia()
  // Hello World
  .get("/", () => "Hello World")
  // 健康检查
  .get("/health", () => "OK")
  // JSON API - 获取用户列表
  .get("/api/users", () => users)
  // 动态参数 - 获取单个用户
  .get("/api/users/:id", ({ params, set }) => {
    const user = users.find((u) => u.id === parseInt(params.id));
    if (user) {
      return user;
    }
    set.status = 404;
    return { error: "Not found" };
  })
  // Query 参数 - 搜索
  .get("/api/search", ({ query }) => {
    const q = (query.q as string) || "";
    const page = parseInt((query.page as string) || "1");
    const limit = parseInt((query.limit as string) || "10");

    return {
      query: q,
      page,
      limit,
      results: users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())),
    };
  })
  // POST JSON - 创建用户
  .post("/api/users", ({ body, set }) => {
    const newUser = { id: users.length + 1, ...(body as object) };
    set.status = 201;
    return newUser;
  })
  .listen(PORT);

console.log(`Elysia server running on http://localhost:${PORT}`);

export default app;
