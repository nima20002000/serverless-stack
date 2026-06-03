# Security Policy

## Public Release Credential Rotation

This repository was converted from a private application. Before making any
history public, rotate every credential that may have appeared in previous
commits, CI logs, deployment scripts, local docs, or environment files.

At minimum, rotate Supabase API keys, Cloudflare R2 access keys, payment provider
keys, email service keys, Redis tokens, OAuth secrets, webhook secrets, SSH keys,
and deployment tokens. Do not rely on this scrubbed working tree as evidence that
previously exposed credentials are still safe.

## Reporting Vulnerabilities

For your own fork, publish a project-specific security contact before accepting
external reports. Do not include personal email addresses in this boilerplate.
