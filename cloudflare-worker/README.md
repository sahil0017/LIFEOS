# LIFEOS Cloudflare Workers AI

This Worker provides `/chat`, `/twin/analyze`, and `/vision/analyze` using the Workers AI binding. Captured images are stored by the mobile app on-device; this Worker does not provide image storage.

## Deploy

1. In this directory, run `npm install`.
2. Authenticate Wrangler with `npx wrangler login`.
3. Run `npm run deploy` and note the deployed Worker URL.
4. In `apps/mobile`, create `.env.local` with:

   ```env
   EXPO_PUBLIC_WORKERS_AI_URL=https://<your-worker>.<your-subdomain>.workers.dev/chat
   ```

5. Restart Expo so it reads the environment variable.

Chat, Twin and Visual Intelligence each have separate permissions in the app's Privacy section. Requests are made only when a user starts the corresponding action. Twin analysis can include up to 25 observations, goal titles and scenario assumptions. Embeddings are saved on-device, and the Worker does not persist request data. The visual route processes a compressed image and question for a response; the app keeps its local photo copy. AI usage may incur charges.

The endpoint limits request size, message count, and message length, and applies an approximate limit of 10 requests per minute per client IP. It does not authenticate callers; the rate limit is not a strict global quota and users sharing an IP may share a limit. It is a prototype integration, not a production private service.
