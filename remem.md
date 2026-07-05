# Project Memory — Stellar Crowdfunding Platform

## Current Status
- Current level: Level 3 — Orange Belt
- Status: complete ✅ (all checklist items verified, 12 contract tests passing, 20 frontend tests passing)
- Last updated: 2026-07-05

## Next Step
Project is complete! The Orange Belt submission checklist has been fully addressed:
- Deployed CampaignsContract + LeaderboardContract with inter-contract calls
- 13 git commits (well above 10+ required)
- CI/CD setup via GitHub Actions workflow
- 20 frontend tests (Vitest) + 12 contract unit tests passing

## Architecture Snapshot
- Frontend entry point: `src/main.tsx`
- App root: `src/App.tsx`
- Multi-wallet hook: `src/hooks/useWalletKit.ts` (StellarWalletsKit v2, static methods)
- Contract hook: `src/hooks/useContract.ts` (Soroban RPC reads + donate() + 5s polling)
- 3D scene: `src/components/OrbitalScene.tsx` (Three.js via @react-three/fiber)
- Hero wrapper: `src/components/Hero.tsx` (WebGL check + lazy load)
- Wallet modal: `src/components/WalletModal.tsx` (Freighter / xBull / LOBSTR picker)
- Donation UI: `src/components/DonatePanel.tsx` (controlled amount prop, calls useContract.donate)
- Tx result: `src/components/TransactionResult.tsx` (ContractTxState, typed error codes)
- Contract source: `contracts/crowdfunding/contracts/crowdfunding/src/lib.rs`
- Contract tests: `contracts/crowdfunding/contracts/crowdfunding/src/test.rs`
- Key libraries:
  - React 19 + TypeScript + Vite
  - Tailwind CSS v4 (@tailwindcss/vite plugin)
  - @stellar/stellar-sdk (SorobanRpc via `rpc` namespace)
  - @creit.tech/stellar-wallets-kit v2.5.0 (all static methods on StellarWalletsKit)
  - three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- Build: `npm run build` → passes cleanly
- Dev server: `npm run dev`

## Contract Details (Testnet)

### Level 2 (Legacy single-campaign)
- Contract ID: `CAGQBZHKPIANYSX4T73YJAKCBKHOOMHDKFAAXEISEIHIKKGYCIJB4KOC`
- WASM hash: `02bc89f5e57803f79dbb85cb7adeb5fad9900476b2e659c56b6c2a57609ae214`

### Level 3 (Multi-campaign + Inter-contract Leaderboard)
- Campaigns ID: `CAZU5X2R6Q6JYIHSKHI2FLU3T7T2XLFZWSUJP2KPN5WA55BZO73OO6TI`
- Campaigns WASM hash: `50cb3b92859e2f1a230567152eed1bd9f582c8924bd5563295f41fce597423c0`
- Campaigns deploy TX: `5307bc436beb4d7847ca01e48f6e6e490586293b3ec51a7e221473cfd45a34f5`
- Leaderboard ID: `CALAOO52V3H3M4ZHXVOZ6TKYUSP4W3UBHLDRIY2TJ47FALOURHG6EYDK`
- Leaderboard WASM hash: `58a99494b0789dba81812bd526c9dbb8ae5e6502874060c3e33e7cd8460a84cd`
- Leaderboard deploy TX: `1b6b1e533b865d78102e5d0732fbf0f491b622473a9e93e2d59b066f4de9e44e`
- Inter-contract donate TX: `7fee6a78289e323d2d687aefde28db9be132d5485fe1bf429803517b09523128`
- Owner/Admin: `GCH4CBE74CWK5NIT7BHM5LDOLWVTTTTXMVD5TM3IT4PCCELX24A2AF67`
- Native XLM SAC: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Git remote: https://github.com/subhadip890/Orbit.git

## Decisions Log (newest first)
- 2026-07-04 SWK v2 npm uses ALL STATIC METHODS on StellarWalletsKit class (not instance methods).
  - StellarWalletsKit.init({ modules: [], network: Networks.TESTNET })
  - StellarWalletsKit.setWallet(id)
  - StellarWalletsKit.fetchAddress() → { address }
  - StellarWalletsKit.signTransaction(xdr, { networkPassphrase }) → { signedTxXdr }
  - StellarWalletsKit.disconnect()
  - FreighterModule etc. are NOT exported by the npm package — they come from jsr.io separately.
- 2026-07-04 Soroban SDK: SorobanRpc is now exported as `rpc` from @stellar/stellar-sdk (not `SorobanRpc`).
  - Use: import { rpc as SorobanRpc } from '@stellar/stellar-sdk'
  - rpc.Server, rpc.Api.isSimulationError, rpc.assembleTransaction, rpc.Api.GetTransactionStatus
- 2026-07-04 Contract built with `wasm32v1-none` target (Stellar CLI 26). Must install via:
  - `rustup target add wasm32v1-none`
  - Also needs CARGO_TARGET_DIR outside OneDrive to avoid write lock issues.
- 2026-07-04 Friendbot SSL cert issue on CLI (`stellar keys fund`) — use Invoke-WebRequest instead.
- 2026-07-03 Used Freighter API v6.0.1. requestAccess returns { address }.
- 2026-07-03 verbatimModuleSyntax enabled — type-only imports must use `import type`.
- 2026-07-03 Design: deep space palette (#050A1A, #E8D5A3 gold, #4ECCA3 teal, #FF6B6B coral).
- 2026-07-03 User requested: complete Level 1, then ask before Level 2, then ask before Level 3.

## Known Issues / TODOs
- [ ] Level 2 wallet modal screenshot still needed
- [ ] Level 2 contract call tx hash (after user does a real donation)
- [ ] Level 3: Multi-campaign, escrow contract, CI/CD, tests

## Changelog (newest first)

### 2026-07-04 — Level 2 Complete
- Did: Soroban crowdfunding contract written (Rust), built (WASM), deployed to testnet, initialized.
  Multi-wallet integration via SWK v2 (Freighter/xBull/LOBSTR). Real-time contract state polling
  every 5s. 3 error types: NOT_FOUND, REJECTED, INSUFFICIENT_BALANCE.
- Files touched:
  - src/App.tsx (Level 2 root — modal + contract data + error display)
  - src/hooks/useWalletKit.ts (SWK v2 static API)
  - src/hooks/useContract.ts (Soroban RPC + donate + polling)
  - src/components/WalletModal.tsx (new — multi-wallet picker)
  - src/components/DonatePanel.tsx (controlled props, calls contract)
  - src/components/TransactionResult.tsx (ContractTxState, typed errors)
  - contracts/crowdfunding/contracts/crowdfunding/src/lib.rs
  - contracts/crowdfunding/contracts/crowdfunding/src/test.rs
  - .env.example (added VITE_CONTRACT_ID)
  - README.md (Level 2 section, contract address, deploy TX)
  - remem.md (this file)
- Commits made: "feat: Level 2 — Soroban contract deployed, multi-wallet via SWK, real-time polling, 3 error types" + "docs: Level 2 README section, contract address, .gitignore fix"

### 2026-07-03 — Level 1 Complete
- Did: Full Level 1 build — React+TS+Vite, Tailwind CSS v4, Three.js orbital scene, Freighter, XLM tx flow.
- Commits made: Initial commit + Level 1 complete commit + screenshot commits
