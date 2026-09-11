import { defineApp } from "convex/server";
import convexVapi from "../../src/component/convex.config.js";

const app = defineApp();
app.use(convexVapi);

export default app;
