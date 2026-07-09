#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInit } from '../lib/init.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))

const USAGE = `atlas — code-verified knowledge base for a repository

Usage:
  atlas <command> [options]

Commands:
  atlas init        Scaffold a new Atlas vault in this repository
  atlas check       (coming soon) verify zone claims against the tree
  atlas stamp       (coming soon) re-stamp verifiedAt for reviewed zones
  atlas status      (coming soon) summarize vault health

Options:
  --help, -h        Show this help
  --version, -v     Show the installed version
`

const PLACEHOLDER_COMMANDS = new Set(['check', 'stamp', 'status'])

const COMMANDS = {
  init: (args) => runInit(args, { cwd: process.cwd() }),
}

function main(argv) {
  const args = argv.slice(2)
  const command = args[0]

  if (!command || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)
    return 0
  }

  if (command === '--version' || command === '-v') {
    process.stdout.write(`atlas ${pkg.version}\n`)
    return 0
  }

  if (PLACEHOLDER_COMMANDS.has(command)) {
    process.stdout.write(`atlas ${command}: coming soon (see Plan 003)\n`)
    return 0
  }

  const handler = COMMANDS[command]
  if (!handler) {
    process.stderr.write(`atlas: unknown command "${command}"\n\n${USAGE}`)
    return 1
  }

  return handler(args.slice(1))
}

process.exit(main(process.argv))
