#!/usr/bin/env node
// Hint-only postinstall — no filesystem writes; safe under --ignore-scripts / CI.
const bold = (s) => `\x1b[1m${s}\x1b[0m`
process.stdout.write(
  `\n  memory-atlas installed (the past — architecture memory).\n` +
    `  Per-repo: ${bold('npx atlas init')} then ${bold('atlas wire')}\n` +
    `  Pair with agentic-sage (the present — fleet sessions):\n` +
    `    npm i -g agentic-sage && sage init\n` +
    `  Stay current: ${bold('atlas gate')} / ${bold('sage gate')} (soft nudges by default)\n\n`,
)
