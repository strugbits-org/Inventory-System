import express from "express";
import authRoutes from "./auth.routes";

const v1Routes = express.Router();

// Register all v1 routes
v1Routes.use("/auth", authRoutes);

export default v1Routes;