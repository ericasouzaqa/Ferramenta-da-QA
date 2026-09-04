const { spawnSync } = require("child_process");
const path = require("path");

const blocker = path.join(__dirname, "network-blocker.cjs");
const currentOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : "";
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(command, ["exec", "vitest", "run"], {
  cwd: path.join(__dirname, ".."),
  env: { ...process.env, NODE_OPTIONS: `${currentOptions}--require=${blocker}` },
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
