/**
 * Express 测试服务器
 */

import express, { Request, Response } from "express";

const PORT = parseInt(process.env.PORT || "3002");
const app = express();

app.use(express.json());

const users = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];

// Hello World
app.get("/", (_req: Request, res: Response) => {
  res.send("Hello World");
});

// 健康检查
app.get("/health", (_req: Request, res: Response) => {
  res.send("OK");
});

// JSON API - 获取用户列表
app.get("/api/users", (_req: Request, res: Response) => {
  res.json(users);
});

// 动态参数 - 获取单个用户
app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// Query 参数 - 搜索
app.get("/api/search", (req: Request, res: Response) => {
  const q = (req.query.q as string) || "";
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");

  res.json({
    query: q,
    page,
    limit,
    results: users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase())),
  });
});

// POST JSON - 创建用户
app.post("/api/users", (req: Request, res: Response) => {
  const newUser = { id: users.length + 1, ...req.body };
  res.status(201).json(newUser);
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

