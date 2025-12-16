import express from "express";
import authRoutes from "./auth.routes.js";
import materialVariantsRoutes from "./material-variants.routes.js";
import companiesRoutes from "./companies.routes.js";

const v1Routes = express.Router();

// Register all v1 routes
v1Routes.use("/auth", authRoutes);
v1Routes.use("/companies", companiesRoutes);
v1Routes.use("/", materialVariantsRoutes);

export default v1Routes;