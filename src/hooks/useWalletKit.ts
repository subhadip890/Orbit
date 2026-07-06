/**
 * useWalletKit.ts — Level 2 multi-wallet hook
 *
 * Shows a 3-wallet selection modal (Freighter / xBull / LOBSTR).
 * Uses each wallet's native browser API for connection & signing.
 *
 * Error types (all 3 required by Level 2):
 *   NOT_FOUND   — wallet extension not installed in browser
 *   REJECTED    — user dismissed the connection or signing popup
 *   UNKNOWN     — any other unexpected error
 */
import { useState, useCallback, useEffect } from 'react'
import {
  isConnected as freighterIsConnected,
  requestAccess as freighterRequestAccess,
  signTransaction as freighterSignTransaction,
} from '@stellar/freighter-api'
import { Horizon } from '@stellar/stellar-sdk'

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const horizonServer = new Horizon.Server(HORIZON_URL)

// ── Wallet option definitions ────────────────────────────────────────────────

export interface WalletOption {
  id: string
  name: string
  description: string
  icon: string
  installUrl: string
}

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Official Stellar wallet by SDF',
    icon: '🚀',
    installUrl: 'https://freighter.app',
  },
  {
    id: 'xbull',
    name: 'xBull',
    description: 'Feature-rich Stellar wallet extension',
    icon: '🐂',
    installUrl: 'https://xbull.app',
  },
  {
    id: 'lobstr',
    name: 'LOBSTR',
    description: 'Popular Stellar wallet',
    icon: '🦞',
    installUrl: 'https://lobstr.co',
  },
]

// ── State types ──────────────────────────────────────────────────────────────

export type WalletStatus =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; publicKey: string; walletId: string; walletName: string }
  | { status: 'error'; message: string; code: 'NOT_FOUND' | 'REJECTED' | 'UNKNOWN' }

export type BalanceStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; xlm: string }
  | { status: 'error'; message: string }

// ── Wallet detection helpers ─────────────────────────────────────────────────

function isXBullInstalled(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>)['xBullSDK']
}

function isLOBSTRInstalled(): boolean {
  return (
    typeof window !== 'undefined' &&
    (!!(window as unknown as Record<string, unknown>)['lobstr'] ||
      !!(window as unknown as Record<string, unknown>)['lobstrProvider'])
  )
}

async function isFreighterInstalled(): Promise<boolean> {
  try {
    const result = await freighterIsConnected()
    return result.isConnected
  } catch {
    return false
  }
}

// ── Main hook ────────────────────────────────────────────────────────────────

export function useWalletKit() {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ status: 'disconnected' })
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus>({ status: 'idle' })
  const [showModal, setShowModal] = useState(false)

  // ── Balance fetch ──────────────────────────────────────────────────────────

  const fetchBalance = useCallback(async (publicKey: string) => {
    setBalanceStatus({ status: 'loading' })
    try {
      const account = await horizonServer.loadAccount(publicKey)
      const native = account.balances.find((b) => b.asset_type === 'native')
      setBalanceStatus({ status: 'loaded', xlm: native ? parseFloat(native.balance).toFixed(4) : '0.0000' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // 404 = account not funded on testnet yet
      setBalanceStatus({ status: 'loaded', xlm: '0.0000' })
      void msg
    }
  }, [])

  // ── Connect Freighter ──────────────────────────────────────────────────────

  const connectFreighter = useCallback(async () => {
    // Error type 1: NOT_FOUND — Freighter not installed
    const installed = await isFreighterInstalled()
    if (!installed) {
      setWalletStatus({
        status: 'error',
        message: 'Freighter is not installed. Visit freighter.app to install it.',
        code: 'NOT_FOUND',
      })
      return
    }

    try {
      // Request access — opens Freighter popup if not allowed and retrieves address
      const accessResult = await freighterRequestAccess()
      if (accessResult.error) {
        setWalletStatus({
          status: 'error',
          message: 'Connection rejected — you dismissed the Freighter popup.',
          code: 'REJECTED',
        })
        return
      }

      const address = (accessResult as unknown as { address: string }).address
      if (!address) {
        setWalletStatus({
          status: 'error',
          message: 'Could not get address from Freighter.',
          code: 'UNKNOWN',
        })
        return
      }

      setWalletStatus({
        status: 'connected',
        publicKey: address,
        walletId: 'freighter',
        walletName: 'Freighter',
      })
      await fetchBalance(address)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied') || lower.includes('closed')) {
        setWalletStatus({ status: 'error', message: 'Connection rejected — you dismissed the Freighter popup.', code: 'REJECTED' })
      } else {
        setWalletStatus({ status: 'error', message: `Freighter error: ${msg}`, code: 'UNKNOWN' })
      }
    }
  }, [fetchBalance])

  // ── Connect xBull ──────────────────────────────────────────────────────────

  const connectXBull = useCallback(async () => {
    // Error type 1: NOT_FOUND
    if (!isXBullInstalled()) {
      setWalletStatus({
        status: 'error',
        message: 'xBull Wallet is not installed. Visit xbull.app to install it.',
        code: 'NOT_FOUND',
      })
      return
    }

    try {
      // xBull exposes window.xBullSDK.connect()
      const xBull = (window as any)['xBullSDK']
      const { publicKey } = await xBull.connect({ canRequestPublicKey: true, canRequestSign: true })
      if (!publicKey) {
        setWalletStatus({ status: 'error', message: 'xBull did not return a public key.', code: 'UNKNOWN' })
        return
      }
      setWalletStatus({ status: 'connected', publicKey, walletId: 'xbull', walletName: 'xBull' })
      await fetchBalance(publicKey)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      // Error type 2: REJECTED
      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
        setWalletStatus({ status: 'error', message: 'Connection rejected — you dismissed the xBull popup.', code: 'REJECTED' })
      } else {
        setWalletStatus({ status: 'error', message: `xBull error: ${msg}`, code: 'UNKNOWN' })
      }
    }
  }, [fetchBalance])

  // ── Connect LOBSTR ─────────────────────────────────────────────────────────

  const connectLOBSTR = useCallback(async () => {
    // Error type 1: NOT_FOUND
    if (!isLOBSTRInstalled()) {
      setWalletStatus({
        status: 'error',
        message: 'LOBSTR Wallet is not installed. Visit lobstr.co to install it.',
        code: 'NOT_FOUND',
      })
      return
    }

    try {
      const lobstr = (window as any)['lobstr'] || (window as any)['lobstrProvider']
      const result = await lobstr.connect()
      const publicKey = result?.publicKey || result?.address
      if (!publicKey) {
        setWalletStatus({ status: 'error', message: 'LOBSTR did not return a public key.', code: 'UNKNOWN' })
        return
      }
      setWalletStatus({ status: 'connected', publicKey, walletId: 'lobstr', walletName: 'LOBSTR' })
      await fetchBalance(publicKey)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()
      // Error type 2: REJECTED
      if (lower.includes('reject') || lower.includes('cancel') || lower.includes('denied')) {
        setWalletStatus({ status: 'error', message: 'Connection rejected — you dismissed the LOBSTR popup.', code: 'REJECTED' })
      } else {
        setWalletStatus({ status: 'error', message: `LOBSTR error: ${msg}`, code: 'UNKNOWN' })
      }
    }
  }, [fetchBalance])

  // ── Unified connect ────────────────────────────────────────────────────────

  const connectWallet = useCallback(async (walletId: string) => {
    setWalletStatus({ status: 'connecting' })
    setShowModal(false)

    if (walletId === 'freighter') {
      await connectFreighter()
    } else if (walletId === 'xbull') {
      await connectXBull()
    } else if (walletId === 'lobstr') {
      await connectLOBSTR()
    } else {
      setWalletStatus({ status: 'error', message: `Unknown wallet: ${walletId}`, code: 'UNKNOWN' })
    }
  }, [connectFreighter, connectXBull, connectLOBSTR])

  // ── Sign transaction ───────────────────────────────────────────────────────

  const signTxXDR = useCallback(async (xdr: string, networkPassphrase: string): Promise<string> => {
    if (walletStatus.status !== 'connected') {
      throw new Error('No wallet connected')
    }

    const { walletId } = walletStatus

    if (walletId === 'freighter') {
      const result = await freighterSignTransaction(xdr, {
        networkPassphrase,
      })
      if (result.error) throw new Error(result.error)
      return result.signedTxXdr
    }

    if (walletId === 'xbull') {
      const xBull = (window as any)['xBullSDK']
      const result = await xBull.sign({ xdr, publicKey: walletStatus.publicKey, network: 'TESTNET' })
      return result.signedXDR
    }

    if (walletId === 'lobstr') {
      const lobstr = (window as any)['lobstr'] || (window as any)['lobstrProvider']
      const result = await lobstr.sign({ xdr })
      return result.signedXDR || result.signedTxXdr
    }

    throw new Error('Signing not supported for this wallet')
  }, [walletStatus])

  // ── Disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    setWalletStatus({ status: 'disconnected' })
    setBalanceStatus({ status: 'idle' })
  }, [])

  // ── Auto-refresh balance every 15s ─────────────────────────────────────────

  useEffect(() => {
    if (walletStatus.status !== 'connected') return
    const pk = walletStatus.publicKey
    const interval = setInterval(() => fetchBalance(pk), 15_000)
    return () => clearInterval(interval)
  }, [walletStatus, fetchBalance])

  return {
    walletStatus,
    balanceStatus,
    showModal,
    setShowModal,
    connectWallet,
    disconnect,
    signTxXDR,
    isConnected: walletStatus.status === 'connected',
    publicKey: walletStatus.status === 'connected' ? walletStatus.publicKey : null,
    xlmBalance: balanceStatus.status === 'loaded' ? balanceStatus.xlm : null,
    WALLET_OPTIONS,
  }
}
