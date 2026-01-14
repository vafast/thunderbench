import { Server, defineRoute, defineRoutes } from "vafast";
const routes = defineRoutes([defineRoute({ method: "GET", path: "/", handler: () => "test" })]);
const s = new Server(routes);
