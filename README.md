# Orbit — Stellar Crowdfunding Platform

> A crowdfunding platform built on the Stellar network. Connect your Freighter wallet and send XLM directly to campaigns — transparent, instant, trustless.

---

## Project Status

| Level | Belt | Status |
|-------|------|--------|
| Level 1 | ⬜ White Belt | ✅ Complete |
| Level 2 | 🟡 Yellow Belt | ✅ Complete |
| Level 3 | 🟠 Orange Belt | 🔜 Pending |

---

## Level 1 — White Belt

### What's built

A single-campaign donation page on Stellar Testnet:

- **Wallet connection** — Freighter wallet connect/disconnect flow with Testnet detection
- **Balance display** — Fetches and displays connected wallet's XLM balance (auto-refreshes every 30s)
- **XLM transaction** — Sends XLM on Stellar Testnet to the campaign address via signed transaction
- **Transaction feedback** — Shows `building → awaiting_signature → submitting → success/failure` states
- **Transaction hash** — Displayed on success with clickable Stellar Expert explorer link
- **Error handling** — Specific messages for: Freighter not installed, permission denied, user rejected, insufficient balance
- **3D orbital scene** — Interactive Three.js star system; central star glow scales with campaign progress

---

### Screenshots

**1. Wallet connected state**

![Wallet Connected](public/screenshots/conectedpic.png)

*Nav bar: wallet address `GAMX…5QCM`, TESTNET badge, `9644.7172 XLM` balance, Disconnect button*

---

**2. Balance displayed**

![Balance Displayed](public/screenshots/conectedpic.png)

*Balance shown in nav chip (`9644.7172 XLM`) and in the "Available" field inside the donate card*

---

**3. Successful testnet transaction**

> 📸 Screenshot coming soon — green "Donation Confirmed" panel with transaction hash

---

**4. Transaction result shown to user**

> 📸 Screenshot coming soon — full donation flow result (success/error state)

---

### Tech stack

| Tool | Version | Purpose |
|------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5 | Type safety |
| Vite | 8 | Build tool |
| Tailwind CSS | v4 | Utility styling |
| Three.js + @react-three/fiber | latest | 3D orbital scene |
| @stellar/stellar-sdk | latest | Stellar transactions & Horizon API |
| @stellar/freighter-api | v6.0.1 | Wallet signing (Freighter extension) |

---

### Local setup

**Prerequisites**
- Node.js >= 18
- [Freighter wallet](https://freighter.app) browser extension installed
- Freighter configured for **Stellar Testnet** (Settings → Network → Testnet)

**Get testnet XLM**

Visit [Stellar Laboratory Friendbot](https://laboratory.stellar.org/#account-creator?network=test) and fund your testnet address before donating.

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

---

### Code structure

```
src/
├── hooks/
│   ├── useWallet.ts        # Freighter connect/disconnect/balance (isolated from UI)
│   └── useTransaction.ts   # XLM transfer: build → sign → submit (isolated from UI)
├── components/
│   ├── OrbitalScene.tsx    # Three.js 3D orbital star system
│   ├── Hero.tsx            # 3D scene wrapper (WebGL detection + lazy load)
│   ├── WalletPanel.tsx     # Connect/disconnect/balance display UI
│   ├── DonatePanel.tsx     # Amount input + transaction state machine UI
│   └── TransactionResult.tsx # Success/error feedback with tx hash
├── App.tsx                 # Root — assembles all components
├── main.tsx                # React entry point
└── index.css               # Design system (color tokens, typography, components)
```

### Campaign address (testnet)

`GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554`

Verify donations on [Stellar Expert Testnet](https://stellar.expert/explorer/testnet/account/GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554).

---

## Level 2 — Yellow Belt

### What's built

Multi-wallet integration with a deployed Soroban smart contract on Stellar Testnet:

- **Multi-wallet support** — Stellar Wallets Kit (SWK) supports Freighter, xBull, and LOBSTR via a unified modal
- **Wallet selection modal** — Click "Connect Wallet" to see all 3 wallet options with names, icons, and descriptions
- **Soroban contract** — Crowdfunding contract deployed on testnet; tracks goal, raised amount, and donor count on-chain
- **Contract read** — Fetches `get_goal`, `get_raised`, `get_donor_count` from contract via Soroban RPC simulation
- **Contract write** — `donate()` builds a Soroban transaction, simulates, signs via selected wallet, submits
- **Real-time sync** — Polls contract state every 5 seconds; live progress bar and donor count update without page refresh
- **Transaction status** — Shows `building → awaiting_signature → submitting → success/failure` pipeline
- **3 error types handled:**
  - 🔍 `NOT_FOUND` — wallet extension not installed
  - 🚫 `REJECTED` — user dismissed the connection/signing popup
  - 💸 `INSUFFICIENT_BALANCE` — detected during Soroban simulation before signing

---

### Screenshots

**Wallet selection modal (3 wallet options)**

![Wallet Options Modal](public/screenshots/walletmodal.png)

---

### Deployed contract

| Item | Value |
|------|-------|
| **Contract ID** | `CAGQBZHKPIANYSX4T73YJAKCBKHOOMHDKFAAXEISEIHIKKGYCIJB4KOC` |
| **Network** | Stellar Testnet |
| **Deploy TX** | [`3f7384718cbcc4d5…`](https://stellar.expert/explorer/testnet/tx/3f7384718cbcc4d5128a204f9ac2d4311b3b5014a5af875e2314b0ab13ffb07c) |
| **Init TX** | [`9edb16213ff9b6a8…`](https://stellar.expert/explorer/testnet/tx/9edb16213ff9b6a86998423d48ff9522bae0508f75cc11b5a08b828706932ffe) |
| **Contract Call TX** | [`225b4c444c8dc182…`](https://stellar.expert/explorer/testnet/tx/225b4c444c8dc182bfe801c8f4faac0f5f0f0237c250f0ca215f2dafe8b4d392) (verifiable on Stellar Explorer) |
| **Goal** | 10,000 XLM |
| **Token** | Native XLM (SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`) |

View on Stellar Explorer:
[Contract](https://stellar.expert/explorer/testnet/contract/CAGQBZHKPIANYSX4T73YJAKCBKHOOMHDKFAAXEISEIHIKKGYCIJB4KOC) · [Lab](https://lab.stellar.org/r/testnet/contract/CAGQBZHKPIANYSX4T73YJAKCBKHOOMHDKFAAXEISEIHIKKGYCIJB4KOC)

---

### Contract functions

| Function | Args | Returns | Description |
|----------|------|---------|-------------|
| `initialize` | `owner`, `goal`, `token` | — | One-time setup |
| `donate` | `donor: Address`, `amount: i128` | `i128` total raised | Transfers XLM, emits event |
| `get_goal` | — | `i128` | Campaign goal in stroops |
| `get_raised` | — | `i128` | Total raised so far |
| `get_donor_count` | — | `u32` | Unique donor count |
| `get_donor_amount` | `donor: Address` | `i128` | Individual donation total |
| `withdraw` | — | — | Owner-only, when goal met |

---

### New code added in Level 2

```
src/
├── hooks/
│   ├── useWalletKit.ts     # SWK multi-wallet: connect/disconnect/sign (replaces useWallet.ts)
│   └── useContract.ts      # Soroban RPC reads + donate() write + 5s polling
├── components/
│   ├── WalletModal.tsx     # Multi-wallet picker modal (Freighter / xBull / LOBSTR)
│   ├── DonatePanel.tsx     # Updated — calls contract donate(), no publicKey arg needed
│   └── TransactionResult.tsx  # Updated — typed error codes (INSUFFICIENT_BALANCE, USER_REJECTED)
└── App.tsx                 # Level 2 root — modal, contract data, live progress, wallet error UI

contracts/
└── crowdfunding/
    └── contracts/crowdfunding/src/
        ├── lib.rs           # Soroban contract (initialize, donate, views, withdraw)
        └── test.rs          # 3 passing unit tests
```

---

## Design decisions

**Color palette** — Deep space theme: `#050A1A` (void black) base with `#E8D5A3` (warm gold/starlight) primary accent, `#4ECCA3` success/teal, `#FF6B6B` error/coral. Deliberately avoids the overused purple-blue gradient AI aesthetic.

**Typography** — `Syne` (geometric display face) for headlines + `Inter` (clean, legible) for body + `JetBrains Mono` for transaction hashes/addresses.

**3D signature element** — Three.js orbital system where the central star's glow intensity scales proportionally to campaign progress (0–1 prop). Three orbiting bodies on inclined elliptical paths with Trail effects. Static gradient fallback if WebGL is unavailable. Respects `prefers-reduced-motion`.

**Code separation** — Wallet logic (`useWallet.ts`), transaction logic (`useTransaction.ts`), and each UI element are fully decoupled. Components receive only props they need.

---

## Contributing

This is a learning project built on Stellar Testnet. All transactions use testnet funds — no real XLM involved.

---

*Orbit · Built on [Stellar](https://stellar.org) Testnet · White Belt Level 1 · Yellow Belt Level 2*
