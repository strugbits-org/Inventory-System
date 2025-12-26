import express from "express";
import authRoutes from "./auth.routes.js";
import materialVariantsRoutes from "./material-variants.routes.js";
import companiesRoutes from "./companies.routes.js";
import jobsRoutes from "./jobs.routes.js";
import usersRoutes from "./users.routes.js";
import stocksRoutes from "./stocks.routes.js";
import inviteRoutes from "./invites.routes.js";

const v1Routes = express.Router();

// Register all v1 routes
v1Routes.use("/auth", authRoutes);
v1Routes.use("/companies", companiesRoutes);
v1Routes.use("/jobs", jobsRoutes);
v1Routes.use("/users", usersRoutes);
v1Routes.use("/stocks", stocksRoutes);
v1Routes.use("/invites", inviteRoutes);
v1Routes.use("/material-variants", materialVariantsRoutes);

export default v1Routes;