/**
 * WalletPanel.tsx
 * Connect / disconnect wallet UI + balance display.
 * Receives wallet state from useWallet hook via props.
 */
import type { WalletState, BalanceState } from '../hooks/useWallet'

interface WalletPanelProps {
  wallet: WalletState
  balance: BalanceState
  onConnect: () => void
  onDisconnect: () => void
  onRefreshBalance: () => void
}

// Shorten a Stellar public key for display
function shortKey(key: string): string {
  return `${key.slice(0, 4)}…${key.slice(-4)}`
}

export default function WalletPanel({
  wallet,
  balance,
  onConnect,
  onDisconnect,
  onRefreshBalance,
}: WalletPanelProps) {
  // ─── Not connected ─────────────────────────────────────────────────────────
  if (wallet.status === 'disconnected' || wallet.status === 'error') {
    return (
      <div className="wallet-status">
        {wallet.status === 'error' && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-coral)',
              maxWidth: 220,
              lineHeight: 1.3,
            }}
          >
            {wallet.message}
          </span>
        )}
        <button id="btn-connect-wallet" className="btn btn-primary btn-sm" onClick={onConnect}>
          Connect Wallet
        </button>
      </div>
    )
  }

  // ─── Connecting ────────────────────────────────────────────────────────────
  if (wallet.status === 'connecting') {
    return (
      <div className="wallet-status">
        <div className="spinner" />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
          Connecting…
        </span>
      </div>
    )
  }

  // ─── Connected ─────────────────────────────────────────────────────────────
  return (
    <div className="wallet-status">
      <div className="pulse-dot" title="Connected to Stellar Testnet" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
        <span className="wallet-address" title={wallet.publicKey}>
          {shortKey(wallet.publicKey)}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
          {wallet.network}
        </span>
      </div>

      {/* Balance */}
      <div
        style={{
          padding: '4px 10px',
          background: 'rgba(232, 213, 163, 0.08)',
          borderRadius: 8,
          border: '1px solid rgba(232, 213, 163, 0.12)',
          cursor: 'pointer',
        }}
        onClick={onRefreshBalance}
        title="Click to refresh balance"
      >
        {balance.status === 'loading' ? (
          <div className="spinner" style={{ width: 14, height: 14 }} />
        ) : balance.status === 'loaded' ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-starlight)' }}>
            {balance.xlm} <span style={{ color: 'var(--color-muted)' }}>XLM</span>
          </span>
        ) : (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>— XLM</span>
        )}
      </div>

      <button
        id="btn-disconnect-wallet"
        className="btn btn-danger btn-sm"
        onClick={onDisconnect}
      >
        Disconnect
      </button>
    </div>
  )
}
