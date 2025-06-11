import { Hono } from "hono";
import { handle } from "hono/vercel";
import auth from "@/features/auth/server/route";
import workspaces from "@/features/workspaces/server/route";
import members from "@/features/members/server/route";
import services from "@/features/services/server/route";
import tasks from "@/features/tasks/server/route";
import taskHistory from "@/features/tasks/server/history-route";
import taskMessages from "@/features/tasks/server/messages-route";
import users from "@/features/users/server/route";

const app = new Hono().basePath("/api");

const routes = app
  .route("/auth", auth)
  .route("/workspaces", workspaces)
  .route("/members", members)
  .route("/services", services)
  .route("/tasks", tasks)
  .route("/task-history", taskHistory)
  .route("/tasks/messages", taskMessages)
  .route("/users", users)

export const GET = handle(routes);
export const POST = handle(routes);
export const PATCH = handle(routes);
export const DELETE = handle(routes);

export type Apptype = typeof routes;