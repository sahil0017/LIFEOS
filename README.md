# LIFEOS

LIFEOS is a local-first personal intelligence prototype with a separate,
long-term AI research direction. See [milestones](./MILESTONES.md) for the
tracked product and research outcomes.

## Start the mobile prototype

Requirements: Node.js and npm, plus Expo Go on a device or an iOS/Android
simulator. Use an Expo-compatible Node version; see the Expo documentation.

```sh
cd apps/mobile
npm install
npm start
```

Open the displayed QR code in Expo Go, or choose an available simulator. The
prototype targets iOS and Android; web storage is not configured.

Run checks (the tests require Node.js 22.18 or newer):

```sh
npm run typecheck
npm test
```

The app stores goals, study check-ins, Personal Twin observations, scenarios,
and embeddings in on-device SQLite. It does not provide encryption, cloud
backup, or account recovery. Avoid entering sensitive data; deleting the app
may remove its data.

The Intelligence, Goals, Memory, Explore, Research, and Settings screens are
available for navigation. The Personal Twin can record routines, interests,
preferences, and behaviors; summarize repeated entries; and compare user-entered
time and cash-flow assumptions. Users can delete observations and scenarios.

The Personal Twin can send up to 25 observations, goal titles, and saved scenario
assumptions to Cloudflare only when the user opts in and taps **Update twin**.
Cloudflare Workers AI uses Gemma 4 for a reflection and BGE-M3 for embeddings;
the resulting embeddings are stored locally. Chat has a separate consent. The
time and cash-flow scenario totals are arithmetic estimates, not model forecasts.
This prototype does not include a trained temporal transformer or graph neural
network. See [Cloudflare Worker setup](./cloudflare-worker/README.md).
