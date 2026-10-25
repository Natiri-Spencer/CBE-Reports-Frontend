import { defineConfig } from "vite";
import base from "./vite.config.mjs";

export default defineConfig({ ...base, test: { ...base.test, include: ["verification/**/*.test.jsx"], testTimeout: 30000 } });
