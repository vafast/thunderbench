/**
 * Hono 测试服务器
 * 使用 @hono/node-server
 */

import { Hono } from "hono";
import { serve } from "@hono/node-server";

const PORT = parseInt(process.env.PORT || "3003");
const app = new Hono();

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// Hello World
app.get("/", (c) => c.text("Hello World"));

// 健康检查
app.get("/health", (c) => c.text("OK"));

// JSON API - 获取用户列表
app.get("/api/users", (c) => c.json(users));

// 动态参数 - 获取单个用户
app.get("/api/users/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const user = users.find((u) => u.id === id);
  if (user) {
    return c.json(user);
  }
  return c.json({ error: "Not found" }, 404);
});

// Query 参数 - 搜索
app.get("/api/search", (c) => {
  const q = c.req.query("q") || "";
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");

  return c.json({
    query: q,
    page,
    limit,
    results: users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())),
  });
});

// POST JSON - 创建用户
app.post("/api/users", async (c) => {
  const body = await c.req.json();
  const newUser = { id: users.length + 1, ...body };
  return c.json(newUser, 201);
});

// 使用 @hono/node-server 启动
serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Hono server running on http://localhost:${PORT}`);

export default app;
