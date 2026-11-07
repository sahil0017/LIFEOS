# Cloudflare Worker Deployment

## Prerequisites
- Node.js, npm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account

## Deploy
```sh
cd cloudflare-worker
npm install
npx wrangler deploy
```

## Migrations
```sh
npx wrangler d1 migrations apply lifeos-data
```

## Environment
Set `PYTHON_BACKEND_URL` to your Python backend URL (e.g., Fly.io).
