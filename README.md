# Orbit — Stellar Crowdfunding Platform

> A crowdfunding platform built on the Stellar network. Connect your Freighter wallet and send XLM directly to campaigns — transparent, instant, trustless.

---

## Project Status

| Level | Belt | Status |
|-------|------|--------|
| Level 1 | ⬜ White Belt | ✅ Complete |
| Level 2 | 🟡 Yellow Belt | 🔜 Pending |
| Level 3 | 🟠 Orange Belt | 🔜 Pending |

---

## Level 1 — White Belt

### What's built

A single-campaign donation page on Stellar Testnet:

- **Wallet connection** — Freighter wallet connect/disconnect flow
- **Balance display** — Fetches and displays connected wallet's XLM balance (auto-refreshes every 30s)
- **XLM transaction** — Sends XLM on Stellar Testnet to the campaign address
- **Transaction feedback** — Shows pending → awaiting signature → submitting → success/failure states
- **Transaction hash** — Displayed on success with clickable Stellar Expert explorer link
- **3D orbital scene** — Interactive Three.js star system in the hero section; central star glow scales with campaign progress

### Tech stack

| Tool | Purpose |
|------|---------|
| React 19 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS v4 | Utility styling |
| Three.js + @react-three/fiber | 3D orbital scene |
| @stellar/stellar-sdk | Stellar transactions |
| @stellar/freighter-api v6 | Wallet signing |

### Local setup

**Prerequisites**
- Node.js >= 18
- [Freighter wallet](https://freighter.app) browser extension installed
- Freighter configured for **Stellar Testnet** (Settings → Network → Testnet)

**Get testnet XLM**
Visit [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test) and fund your testnet address.

**Run locally**

```bash
git clone https://github.com/subhadip890/Orbit.git
cd Orbit
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` in your browser.

**Environment variables** (`.env`)

```env
VITE_CAMPAIGN_ADDRESS=GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

### Code structure

```
src/
├── hooks/
│   ├── useWallet.ts        # Freighter connect/disconnect/balance
│   └── useTransaction.ts   # XLM transfer: build → sign → submit
├── components/
│   ├── OrbitalScene.tsx    # Three.js 3D orbital star system
│   ├── Hero.tsx            # 3D scene wrapper (WebGL check + lazy load)
│   ├── WalletPanel.tsx     # Connect/disconnect/balance display
│   ├── DonatePanel.tsx     # Amount input + transaction flow
│   └── TransactionResult.tsx # Success/error feedback with tx hash
├── App.tsx                 # Root — assembles all components
├── main.tsx                # React entry point
└── index.css               # Design system (tokens, components, animations)
```

### Screenshots

> Screenshots to be added after first live session

- Wallet connected state
- Balance displayed
- Successful testnet transaction
- Transaction result shown to user

### Campaign address (testnet)

`GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554`

---

## Design decisions

**Color palette** — Deep space theme: `#050A1A` (void black) base with `#E8D5A3` (warm gold/starlight) as the primary accent. Deliberately avoids the overused purple-blue gradient AI aesthetic and cream/sage palette.

**Typography** — Syne (geometric display face with character) for headlines + Inter (clean, legible) for body + JetBrains Mono for transaction hashes/addresses.

**3D signature element** — Three.js orbital system where the central star's glow intensity scales proportionally to campaign progress. Three orbiting bodies on inclined elliptical paths with Trail effects represent campaign activity. Static gradient fallback if WebGL is unavailable. Respects `prefers-reduced-motion`.

---

## Contributing

This is a learning project built on Stellar Testnet. All transactions are simulated — no real funds involved.

---

*Orbit · Built on [Stellar](https://stellar.org) Testnet*
