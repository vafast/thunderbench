import { Server } from "vafast"; const s = new Server([{ method: "GET" as const, path: "/", handler: () => "test" }]);
