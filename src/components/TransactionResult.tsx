/**
 * TransactionResult.tsx
 * Shows success (with tx hash + explorer link) or failure state
 * after a donation attempt. Intentionally separate from DonatePanel.
 */
import type { TxState } from '../hooks/useTransaction'

interface TransactionResultProps {
  txState: TxState
  onDismiss: () => void
}

const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet/tx/'

export default function TransactionResult({ txState, onDismiss }: TransactionResultProps) {
  if (txState.status === 'idle') return null

  if (txState.status === 'success') {
    return (
      <div className="tx-result tx-result-success slide-up" role="status">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-success)' }}>
              Donation Confirmed
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onDismiss}
            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 10 }}>
          Your XLM has been sent to the campaign on Stellar Testnet.
        </p>

        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
            Transaction hash
          </span>
          <a
            id="tx-hash-link"
            className="tx-hash"
            href={`${EXPLORER_BASE}${txState.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View on Stellar Expert"
          >
            {txState.hash}
          </a>
        </div>

        <a
          href={`${EXPLORER_BASE}${txState.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-sm"
          style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}
        >
          View on Stellar Expert ↗
        </a>
      </div>
    )
  }

  if (txState.status === 'error') {
    return (
      <div className="tx-result tx-result-error slide-up" role="alert">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✕</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-coral)' }}>
              Transaction Failed
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onDismiss}
            style={{ padding: '2px 8px', fontSize: 'var(--text-xs)' }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
          {txState.message}
        </p>
        {txState.code === 'USER_REJECTED' && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 6 }}>
            Open your Freighter extension and approve the transaction to donate.
          </p>
        )}
        {txState.code === 'INSUFFICIENT_BALANCE' && (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginTop: 6 }}>
            You need more XLM. Get testnet funds at{' '}
            <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-starlight)' }}>
              Stellar Laboratory
            </a>.
          </p>
        )}
      </div>
    )
  }

  return null
}
