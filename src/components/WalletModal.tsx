/**
 * WalletModal.tsx
 * Multi-wallet selection modal for Level 2.
 * Shows Freighter, xBull, and LOBSTR as clickable options.
 */
import type { FC } from 'react'
import { WALLET_OPTIONS } from '../hooks/useWalletKit'

interface WalletModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectWallet: (walletId: string) => void
}

export const WalletModal: FC<WalletModalProps> = ({ isOpen, onClose, onSelectWallet }) => {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Select a wallet"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(5, 10, 26, 0.85)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Modal card */}
      <div
        className="glass-card fade-in"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: 420,
          padding: 'var(--space-8)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-starlight)', marginBottom: 4 }}>
              Connect Wallet
            </h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
              Choose a Stellar wallet to connect
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close wallet modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-muted)',
              cursor: 'pointer',
              fontSize: 20,
              lineHeight: 1,
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Wallet options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {WALLET_OPTIONS.map((wallet) => (
            <button
              key={wallet.id}
              id={`wallet-option-${wallet.id}`}
              onClick={() => onSelectWallet(wallet.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                padding: 'var(--space-4)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(232, 213, 163, 0.12)',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(232, 213, 163, 0.08)'
                e.currentTarget.style.borderColor = 'rgba(232, 213, 163, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = 'rgba(232, 213, 163, 0.12)'
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>{wallet.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-starlight)', marginBottom: 2 }}>
                  {wallet.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                  {wallet.description}
                </div>
              </div>
              <span style={{ color: 'var(--color-gold)', fontSize: 18 }}>→</span>
            </button>
          ))}
        </div>

        <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)', textAlign: 'center' }}>
          Stellar Testnet only — no real funds used
        </p>
      </div>
    </div>
  )
}
