# Project Memory — Stellar Crowdfunding Platform

## Current Status
- Current level: Level 1 — White Belt
- Status: complete ✅ (all checklist items verified)
- Last updated: 2026-07-03

## Next Step
Level 1 is complete and pushed. Awaiting user approval to start Level 2 (Yellow Belt).
Level 2 work begins with: deploy Soroban crowdfunding contract to testnet using Stellar CLI.

## Architecture Snapshot
- Frontend entry point: `src/main.tsx`
- App root: `src/App.tsx`
- Wallet logic: `src/hooks/useWallet.ts` (Freighter v6 API)
- Transaction logic: `src/hooks/useTransaction.ts` (signTransaction → Horizon submit)
- 3D scene: `src/components/OrbitalScene.tsx` (Three.js via @react-three/fiber)
- Hero wrapper: `src/components/Hero.tsx` (WebGL check + lazy load)
- Wallet UI: `src/components/WalletPanel.tsx`
- Donation UI: `src/components/DonatePanel.tsx`
- Tx result: `src/components/TransactionResult.tsx`
- Contract(s) deployed: not yet deployed (Level 1 uses plain XLM transfer)
- Key libraries:
  - React 19 + TypeScript + Vite
  - Tailwind CSS v4 (@tailwindcss/vite plugin)
  - @stellar/stellar-sdk
  - @stellar/freighter-api v6.0.1
  - three, @react-three/fiber, @react-three/drei, @react-three/postprocessing
- Build: `npm run build` → passes cleanly
- Dev server: `npm run dev`
- Campaign address (testnet placeholder): GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554
- Git remote: https://github.com/subhadip890/Orbit.git

## Decisions Log (newest first)
- 2026-07-03 Used Freighter API v6.0.1 (not v1/v2). Correct exports: isConnected, isAllowed, setAllowed, requestAccess (returns { address }), getNetwork, signTransaction (returns { signedTxXdr }). requestAccess returns 'address' not 'publicKey' — we cast it.
- 2026-07-03 Removed manualChunks from vite.config.ts (caused TS type mismatch) — using default chunking instead.
- 2026-07-03 Design: deep space palette (#050A1A base, #E8D5A3 warm gold accent), Syne display font + Inter body + JetBrains Mono for hashes. Deliberately avoided purple-blue gradients and cream/sage AI aesthetics.
- 2026-07-03 3D scene: Three.js via @react-three/fiber. Central star glow scales with campaign progress (prop-driven). Three orbiting bodies on inclined elliptical paths with Trail effects. Orbit rings rendered as THREE.Line.
- 2026-07-03 Level 1 uses plain XLM transfer (no contract). Campaign address is a testnet placeholder. Progress bar is mock data (342/1000 XLM). Contract integration begins in Level 2.
- 2026-07-03 verbatimModuleSyntax is enabled in tsconfig — all type imports must use `import type`. Fixed all type-only imports.
- 2026-07-03 User requested: complete Level 1 fully, then ask before Level 2, then ask before Level 3.

## Known Issues / TODOs
- [ ] Screenshots for README need to be taken after running the app
- [ ] Level 2: Deploy Soroban contract, integrate Stellar Wallets Kit
- [ ] Level 3: Multi-campaign, escrow contract, CI/CD, tests

## Changelog (newest first)

### 2026-07-03 — Level 1 Complete
- Did: Full Level 1 build — React+TS+Vite scaffolded, Tailwind CSS v4, Three.js orbital scene, Freighter wallet integration, XLM transaction flow, all UI components, remem.md, README.md, .gitignore
- Files touched:
  - src/index.css (design system)
  - src/main.tsx (entry)
  - src/App.tsx (root)
  - src/hooks/useWallet.ts (Freighter v6)
  - src/hooks/useTransaction.ts (sign + submit)
  - src/components/OrbitalScene.tsx (Three.js)
  - src/components/Hero.tsx
  - src/components/WalletPanel.tsx
  - src/components/DonatePanel.tsx
  - src/components/TransactionResult.tsx
  - vite.config.ts
  - index.html
  - .gitignore
  - .env.example
  - public/orbit-icon.svg
  - README.md
  - remem.md
- Commits made: Initial commit + Level 1 complete commit
