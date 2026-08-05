const { spawn } = require("node:child_process");
const path = require("node:path");

const nextBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

const args = process.argv.slice(2);
const child = spawn(nextBin, args, {
  env: {
    ...process.env,
    BROWSERSLIST_IGNORE_OLD_DATA: "true",
    BASELINE_BROWSER_MAPPING_IGNORE_OLD_DATA: "true",
  },
  stdio: ["inherit", "pipe", "pipe"],
});

const ignoredWarnings = ["[baseline-browser-mapping]"];

function pipeFiltered(source, target) {
  let buffer = "";

  source.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!ignoredWarnings.some((warning) => line.includes(warning))) {
        target.write(`${line}\n`);
      }
    }
  });

  source.on("end", () => {
    if (
      buffer &&
      !ignoredWarnings.some((warning) => buffer.includes(warning))
    ) {
      target.write(buffer);
    }
  });
}

pipeFiltered(child.stdout, process.stdout);
pipeFiltered(child.stderr, process.stderr);

child.on("close", (code) => {
  process.exit(code ?? 1);
});
