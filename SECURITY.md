# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| latest 0.x on npm / main | Yes |
| older | No — please upgrade first |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately via
[GitHub's private security advisory](https://github.com/muslewski/memory-atlas/security/advisories/new)
or email **10kento10@gmail.com** with the subject line `[SECURITY] memory-atlas`.

Include:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

You will receive a response within **72 hours**. We aim to ship a patch within
**14 days** of a confirmed vulnerability.

## Scope

memory-atlas is a local Node CLI that reads git history and writes markdown vaults. Primary risk: path traversal via untrusted vault paths, symlink races during install, or injected shell via hooks.

Out of scope: issues in Node.js / Python / the OS, third-party CLIs this tool
launches, or GitHub Actions runners themselves.

## Local secrets

Do not commit `.env` files. This repo ships a gitleaks pre-commit hook (`.pre-commit-config.yaml`). Install with `pre-commit install` if you use pre-commit; otherwise run `gitleaks detect` before push.
