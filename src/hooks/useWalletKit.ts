/**
 * useWalletKit.ts
 * Multi-wallet support using @creit.tech/stellar-wallets-kit v2 (npm).
 * v2 uses ALL STATIC METHODS on StellarWalletsKit:
 *   StellarWalletsKit.init({ modules, network })
 *   StellarWalletsKit.setWallet(id)    — select active wallet
 *   StellarWalletsKit.fetchAddress()   — gets address from selected wallet
 *   StellarWalletsKit.getAddress()     — gets cached address
 *   StellarWalletsKit.signTransaction() — signs XDR
 *   StellarWalletsKit.disconnect()     — clears state
 *
 * Error types handled:
 *   NOT_FOUND   — wallet extension not installed
 *   REJECTED    — user dismissed the popup
 *   UNKNOWN     — any other error
 */
import { useState, useCallback, useEffect } from 'react'
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit'
import { Horizon } from '@stellar/stellar-sdk'

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const server = new Horizon.Server(HORIZON_URL)
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET

// Wallet IDs — these are the productId strings each module uses
export const FREIGHTER_WALLET_ID = 'freighter'
export const XBULL_WALLET_ID = 'xbull'
export const LOBSTR_WALLET_ID = 'lobstr'

export interface WalletOption {
  id: string
  name: string
  description: string
  icon: string
  installUrl: string
}

export const WALLET_OPTIONS: WalletOption[] = [
  {
    id: FREIGHTER_WALLET_ID,
    name: 'Freighter',
    description: 'Official Stellar browser wallet by SDF',
    icon: '🚀',
    installUrl: 'https://freighter.app',
  },
  {
    id: XBULL_WALLET_ID,
    name: 'xBull',
    description: 'Feature-rich Stellar wallet extension',
    icon: '🐂',
    installUrl: 'https://xbull.app',
  },
  {
    id: LOBSTR_WALLET_ID,
    name: 'LOBSTR',
    description: 'Mobile-first Stellar wallet',
    icon: '🦞',
    installUrl: 'https://lobstr.co',
  },
]

export type WalletStatus =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; publicKey: string; walletId: string; network: string }
  | { status: 'error'; message: string; code?: 'NOT_FOUND' | 'REJECTED' | 'UNKNOWN' }

export type BalanceStatus =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; xlm: string }
  | { status: 'error'; message: string }

// Init SWK once at module load — no modules array needed for npm v2
// The npm package's static methods directly call the extension APIs
let initialized = false
function ensureKit() {
  if (!initialized) {
    StellarWalletsKit.init({
      modules: [],  // npm v2 manages modules internally via browser extensions
      network: Networks.TESTNET,
    })
    initialized = true
  }
}

export function useWalletKit() {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ status: 'disconnected' })
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus>({ status: 'idle' })
  const [showModal, setShowModal] = useState(false)

  // Fetch XLM balance from Horizon
  const fetchBalance = useCallback(async (publicKey: string) => {
    setBalanceStatus({ status: 'loading' })
    try {
      const account = await server.loadAccount(publicKey)
      const native = account.balances.find((b) => b.asset_type === 'native')
      const xlm = native ? parseFloat(native.balance).toFixed(4) : '0.0000'
      setBalanceStatus({ status: 'loaded', xlm })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Unfunded account on testnet shows 404
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        setBalanceStatus({ status: 'loaded', xlm: '0.0000' })
      } else {
        setBalanceStatus({ status: 'error', message: msg })
      }
    }
  }, [])

  // Connect to a specific wallet by ID
  const connectWallet = useCallback(async (walletId: string) => {
    ensureKit()
    setWalletStatus({ status: 'connecting' })
    setShowModal(false)

    let publicKey: string

    try {
      // Select the wallet module
      StellarWalletsKit.setWallet(walletId)
    } catch {
      // Module not found — wallet extension not installed or not registered
      setWalletStatus({
        status: 'error',
        message: `Wallet not installed. Install the ${walletId} extension and try again.`,
        code: 'NOT_FOUND',
      })
      return
    }

    try {
      // Try to get address (will open extension popup if needed)
      const result = await StellarWalletsKit.fetchAddress()
      publicKey = result.address
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lower = msg.toLowerCase()

      const isNotFound =
        lower.includes('not installed') ||
        lower.includes('not found') ||
        lower.includes('undefined') ||
        lower.includes('no wallet') ||
        lower.includes('not existing module')

      const isRejected =
        lower.includes('reject') ||
        lower.includes('denied') ||
        lower.includes('cancel') ||
        lower.includes('user closed') ||
        lower.includes('declined')

      if (isNotFound) {
        setWalletStatus({
          status: 'error',
          message: `${walletId} is not installed. Install it and try again.`,
          code: 'NOT_FOUND',
        })
      } else if (isRejected) {
        setWalletStatus({
          status: 'error',
          message: 'Connection rejected — you dismissed the wallet popup.',
          code: 'REJECTED',
        })
      } else {
        setWalletStatus({
          status: 'error',
          message: `Connection failed: ${msg}`,
          code: 'UNKNOWN',
        })
      }
      return
    }

    setWalletStatus({
      status: 'connected',
      publicKey,
      walletId,
      network: 'TESTNET',
    })
    await fetchBalance(publicKey)
  }, [fetchBalance])

  // Sign a transaction XDR via selected wallet
  const signTxXDR = useCallback(async (xdr: string, networkPassphrase: string): Promise<string> => {
    const result = await StellarWalletsKit.signTransaction(xdr, { networkPassphrase })
    return result.signedTxXdr
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await StellarWalletsKit.disconnect()
    } catch {
      // ignore
    }
    setWalletStatus({ status: 'disconnected' })
    setBalanceStatus({ status: 'idle' })
  }, [])

  const refreshBalance = useCallback(async () => {
    if (walletStatus.status === 'connected') {
      await fetchBalance(walletStatus.publicKey)
    }
  }, [walletStatus, fetchBalance])

  // Auto-refresh balance every 15s while connected
  useEffect(() => {
    if (walletStatus.status !== 'connected') return
    const interval = setInterval(() => {
      if (walletStatus.status === 'connected') {
        fetchBalance(walletStatus.publicKey)
      }
    }, 15_000)
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
    refreshBalance,
    isConnected: walletStatus.status === 'connected',
    publicKey: walletStatus.status === 'connected' ? walletStatus.publicKey : null,
    xlmBalance: balanceStatus.status === 'loaded' ? balanceStatus.xlm : null,
    WALLET_OPTIONS,
    NETWORK_PASSPHRASE,
  }
}
