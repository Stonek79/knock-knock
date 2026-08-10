# Nemo Messenger

Nemo is a self-hosted messaging application with an installable web client,
PocketBase backend, realtime updates, and encrypted media handling.

The project is under active development and is not currently approved for a
public production release. The cryptographic lifecycle and server-side access
rules are being reviewed; see `docs/ARCHITECTURE_AUDIT.md` before making E2EE or
zero-knowledge claims.

## What is included

- React + TypeScript web client in `app/`;
- PocketBase schema and hooks in `infra/prod/`;
- VPS deployment templates in `infra/prod/`;
- Docker-based build files.

The public repository contains only the files required to build and run a
release. Secrets, databases, media, local indexes, and development machine
configuration are intentionally excluded.

## Storage model

PocketBase stores application data. Media files are stored in an S3-compatible
MinIO bucket. Dev and Prod use separate buckets and separate access keys.
The reference deployment keeps MinIO on a private home server and reaches it
from the VPS through an authenticated FRP tunnel. If the home server is down,
media operations may be temporarily unavailable.

## Local development

```bash
cd app
cp .env.example .env.local
npm ci
npm run dev
```

Set `VITE_PB_URL` in `.env.local` to a PocketBase instance you control. Do not
commit `.env` files or credentials.

## Deployment

The public repository does not contain production secrets and does not deploy
to a server automatically. Prepare the environment files on the target
machine, review the Compose and Nginx configuration, and deploy manually over
SSH. Keep the exact image digest and configuration used for each release.

## Security notes

This project is provided for review and self-hosting. Review the code and
configuration for your environment, keep PocketBase and MinIO administration
interfaces private, restrict firewall ports, and maintain tested backups.
