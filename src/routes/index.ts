import express from "express";
import authRoutes from "./auth.routes";
import companiesRoutes from "./companies.routes";
import usersRoutes from "./users.routes";
import jobsRoutes from "./jobs.routes";
import stocksRoutes from "./stocks.routes";
import inviteRoutes from "./invites.routes";
import v1Routes from "./v1/index";
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

