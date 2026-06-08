/**
 * Free ports 3000/3001 from stale Next.js dev servers in this repo.
 * Dual instances corrupt the shared .next cache and make /api/* return HTML 404.
 */
import { execSync } from "node:child_process";
import { platform } from "node:process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PORTS = [3000, 3001];

function log(msg) {
  console.log(`[QuantAI dev] ${msg}`);
}

function killWindows(port) {
  let raw = "";
  try {
    raw = execSync(`netstat -ano -p tcp | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return;
  }

  const pids = new Set();
  for (const line of raw.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts.at(-1));
    if (Number.isFinite(pid) && pid > 0) pids.add(pid);
  }

  for (const pid of pids) {
    let cmdLine = "";
    try {
      cmdLine = execSync(
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      ).trim();
    } catch {
      continue;
    }

    const isNextServer =
      cmdLine.includes("start-server.js") &&
      cmdLine.replace(/\\/g, "/").includes(ROOT.replace(/\\/g, "/"));

    if (!isNextServer) continue;

    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      log(`Stopped stale Next.js listener on port ${port} (pid ${pid}).`);
    } catch {
      /* ignore */
    }
  }
}

function killUnix(port) {
  try {
    const pids = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: "utf8",
    })
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    for (const pid of pids) {
      let cmdLine = "";
      try {
        cmdLine = execSync(`ps -p ${pid} -o command= 2>/dev/null || true`, {
          encoding: "utf8",
        }).trim();
      } catch {
        continue;
      }

      if (!cmdLine.includes("start-server.js") || !cmdLine.includes(ROOT)) continue;

      try {
        execSync(`kill -9 ${pid}`, { stdio: "ignore" });
        log(`Stopped stale Next.js listener on port ${port} (pid ${pid}).`);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

for (const port of PORTS) {
  if (platform === "win32") killWindows(port);
  else killUnix(port);
}
