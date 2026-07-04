/**
 * TransactionResult.tsx
 * Shows success (tx hash + explorer link) or error (typed message) result.
 * Level 2: uses ContractTxState type, named export.
 */
import type { FC } from 'react'
import type { ContractTxState } from '../hooks/useContract'

interface TransactionResultProps {
  txState: ContractTxState
  onReset: () => void
}

export const TransactionResult: FC<TransactionResultProps> = ({ txState, onReset }) => {
  if (txState.status !== 'success' && txState.status !== 'error') return null

  const isSuccess = txState.status === 'success'

  const errorIcon =
    txState.status === 'error' && txState.code === 'INSUFFICIENT_BALANCE'
      ? '💸'
      : txState.status === 'error' && txState.code === 'USER_REJECTED'
      ? '🚫'
      : '⚠️'

  const errorTitle =
    txState.status === 'error' && txState.code === 'INSUFFICIENT_BALANCE'
      ? 'Insufficient Balance'
      : txState.status === 'error' && txState.code === 'USER_REJECTED'
      ? 'Transaction Rejected'
      : 'Transaction Failed'

  return (
    <div
      className="glass-card fade-in"
      style={{
        padding: 'var(--space-6)',
        border: `1px solid ${isSuccess ? 'rgba(78, 204, 163, 0.3)' : 'rgba(255, 107, 107, 0.3)'}`,
        background: isSuccess
          ? 'rgba(78, 204, 163, 0.05)'
          : 'rgba(255, 107, 107, 0.05)',
      }}
    >
      {isSuccess ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-teal)', fontWeight: 700 }}>
                Donation Confirmed
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                Your XLM has been sent via the Soroban contract on Stellar Testnet.
              </div>
            </div>
          </div>

          {txState.status === 'success' && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 6 }}>
                Transaction hash
              </span>
              <span
                className="mono"
                style={{ fontSize: 10, color: 'var(--color-starlight)', wordBreak: 'break-all', display: 'block', marginBottom: 10 }}
              >
                {txState.hash}
              </span>
              <a
                href={`https://stellar.expert/explorer/testnet/tx/${txState.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--color-teal)',
                  fontSize: 'var(--text-xs)',
                  textDecoration: 'none',
                  border: '1px solid rgba(78, 204, 163, 0.3)',
                  padding: '6px 12px',
                  borderRadius: 6,
                }}
              >
                View on Stellar Expert ↗
              </a>
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 'var(--space-4)' }}>
            <span style={{ fontSize: 24 }}>{errorIcon}</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-error)', fontWeight: 700 }}>
                {errorTitle}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 4 }}>
                {txState.status === 'error' ? txState.message : ''}
              </div>
            </div>
          </div>
        </>
      )}

      <button
        className="btn btn-ghost btn-sm"
        onClick={onReset}
        style={{ marginTop: isSuccess ? 0 : 'var(--space-2)' }}
      >
        {isSuccess ? 'Make another donation' : 'Try again'}
      </button>
    </div>
  )
}
