/**
 * useWallet.ts
 * Freighter wallet integration (v6 API) — connect, disconnect, fetch balance.
 * Isolated from UI; returns pure state + actions.
 *
 * Freighter v6 API: isConnected, isAllowed, setAllowed, requestAccess,
 * getAddress, getNetwork, signTransaction
 */
import { useState, useCallback, useEffect } from 'react'
import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getNetwork,
} from '@stellar/freighter-api'
import { Horizon } from '@stellar/stellar-sdk'

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const server = new Horizon.Server(HORIZON_URL)

export type WalletState =
  | { status: 'disconnected' }
  | { status: 'connecting' }
  | { status: 'connected'; publicKey: string; network: string }
  | { status: 'error'; message: string }

export type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; xlm: string }
  | { status: 'error'; message: string }

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({ status: 'disconnected' })
  const [balance, setBalance] = useState<BalanceState>({ status: 'idle' })

  // Fetch XLM balance for a given public key
  const fetchBalance = useCallback(async (publicKey: string) => {
    setBalance({ status: 'loading' })
    try {
      const account = await server.loadAccount(publicKey)
      const nativeLumen = account.balances.find(
        (b) => b.asset_type === 'native'
      )
      const xlmAmount = nativeLumen ? parseFloat(nativeLumen.balance).toFixed(4) : '0.0000'
      setBalance({ status: 'loaded', xlm: xlmAmount })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load balance'
      // Account might not be funded on testnet yet
      if (msg.includes('404') || msg.includes('not found') || msg.includes('Not Found')) {
        setBalance({ status: 'loaded', xlm: '0.0000' })
      } else {
        setBalance({ status: 'error', message: msg })
      }
    }
  }, [])

  // Connect wallet
  const connect = useCallback(async () => {
    setWallet({ status: 'connecting' })
    try {
      // 1. Check if Freighter extension is installed
      const connResult = await isConnected()
      if (!connResult.isConnected) {
        setWallet({
          status: 'error',
          message: 'Freighter wallet not installed. Get it at freighter.app',
        })
        return
      }

      // 2. Check permission status
      const allowedResult = await isAllowed()
      if (!allowedResult.isAllowed) {
        // Request permission — user may deny
        const grantResult = await setAllowed()
        if (!grantResult.isAllowed) {
          setWallet({
            status: 'error',
            message: 'Permission denied — allow Orbit in the Freighter popup.',
          })
          return
        }
      }

      // 3. Request access (returns address)
      const accessResult = await requestAccess()
      if (accessResult.error) {
        setWallet({
          status: 'error',
          message: 'Connection rejected. Please try again.',
        })
        return
      }
      // requestAccess returns { address } in Freighter v6
      const publicKey = (accessResult as unknown as { address: string }).address

      // 4. Get current network
      const networkResult = await getNetwork()
      const network = networkResult.network || 'TESTNET'

      setWallet({ status: 'connected', publicKey, network })
      await fetchBalance(publicKey)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet connection failed'
      setWallet({ status: 'error', message: msg })
    }
  }, [fetchBalance])

  // Disconnect (client-side only — Freighter has no revoke API)
  const disconnect = useCallback(() => {
    setWallet({ status: 'disconnected' })
    setBalance({ status: 'idle' })
  }, [])

  // Refresh balance on demand
  const refreshBalance = useCallback(async () => {
    if (wallet.status === 'connected') {
      await fetchBalance(wallet.publicKey)
    }
  }, [wallet, fetchBalance])

  // Auto-refresh balance every 30 seconds when connected
  useEffect(() => {
    if (wallet.status !== 'connected') return
    const interval = setInterval(() => {
      if (wallet.status === 'connected') {
        fetchBalance(wallet.publicKey)
      }
    }, 30_000)
    return () => clearInterval(interval)
  }, [wallet, fetchBalance])

  return {
    wallet,
    balance,
    connect,
    disconnect,
    refreshBalance,
    isConnectedState: wallet.status === 'connected',
    publicKey: wallet.status === 'connected' ? wallet.publicKey : null,
  }
}
