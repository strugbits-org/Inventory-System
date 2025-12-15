import express from "express";
import authRoutes from "./auth.routes.js";
import companiesRoutes from "./companies.routes.js";
import usersRoutes from "./users.routes.js";
import jobsRoutes from "./jobs.routes.js";
import stocksRoutes from "./stocks.routes.js";
import inviteRoutes from "./invites.routes.js";
import v1Routes from "./v1/index.js";
const router = express.Router();

// All v1 Routes
router.use("/v1", v1Routes);


// Register all routes
router.use("/companies", companiesRoutes);
router.use("/users", usersRoutes);
router.use("/jobs", jobsRoutes);
router.use("/stocks", stocksRoutes);
router.use("/invites", inviteRoutes);

export default router;

