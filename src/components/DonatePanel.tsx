/**
 * DonatePanel.tsx
 * Donation input + submit. Drives the transaction flow.
 * Level 2: accepts controlled amount/onAmountChange props,
 * supports calling onDonate() without publicKey arg (App manages it).
 */
import type { FC } from 'react'
import type { ContractTxState } from '../hooks/useContract'

interface DonatePanelProps {
  isWalletConnected: boolean
  publicKey: string | null
  balance: string | null
  txState: ContractTxState
  onDonate: () => Promise<void>
  onConnectWallet: () => void
  onReset: () => void
  campaignAddress: string
  amount: string
  onAmountChange: (val: string) => void
}

const PRESETS = ['1', '5', '10', '25', '50']

export const DonatePanel: FC<DonatePanelProps> = ({
  isWalletConnected,
  publicKey,
  balance,
  txState,
  onDonate,
  onConnectWallet,
  onReset,
  campaignAddress,
  amount,
  onAmountChange,
}) => {
  const isPending =
    txState.status === 'building' ||
    txState.status === 'awaiting_signature' ||
    txState.status === 'submitting'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isWalletConnected || !amount) return
    await onDonate()
  }

  const handlePreset = (val: string) => {
    onAmountChange(val)
    onReset()
  }

  const pendingLabel: Record<string, string> = {
    building: 'Building transaction…',
    awaiting_signature: 'Approve in wallet…',
    submitting: 'Submitting to testnet…',
  }

  function shortAddress(addr: string) {
    if (!addr || addr.length < 10) return addr
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }

  return (
    <div className="donate-card glass-card fade-in fade-in-delay-3" style={{ padding: 'var(--space-6)' }}>
      {/* Campaign info */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <span className="section-label">Active Campaign</span>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-white)',
            marginTop: 8,
            marginBottom: 6,
          }}
        >
          Fund the Orbit Mission
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', lineHeight: 1.5 }}>
          Help build open tools for Stellar developers. Every XLM moves us closer to
          testnet → mainnet launch.
        </p>
      </div>

      {/* Contract / Campaign address */}
      <div
        className="glass-card-inner"
        style={{ padding: '10px 14px', marginBottom: 'var(--space-4)' }}
      >
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
          Campaign address (Testnet)
        </span>
        <span
          className="mono"
          style={{ color: 'var(--color-starlight)', fontSize: '0.7rem', wordBreak: 'break-all' }}
          title={campaignAddress}
        >
          {shortAddress(campaignAddress)}
        </span>
      </div>

      <div className="divider" />

      {/* Donation form */}
      {!isWalletConnected ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-4)' }}>
            Connect a Stellar wallet to donate XLM on testnet.
          </p>
          <button
            id="btn-connect-from-donate"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={onConnectWallet}
          >
            Connect Wallet to Donate
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Balance available */}
          {balance && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>Available</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-starlight)' }}>
                {balance} XLM
              </span>
            </div>
          )}

          {/* Amount input */}
          <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
            <input
              id="input-donation-amount"
              className="input-field"
              type="number"
              min="0.0000001"
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                onAmountChange(e.target.value)
              }}
              disabled={isPending}
              aria-label="Donation amount in XLM"
              style={{ paddingRight: 50 }}
            />
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-starlight)',
              }}
            >
              XLM
            </span>
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-ghost btn-sm ${amount === p ? 'btn-primary' : ''}`}
                style={amount === p ? { background: 'var(--color-starlight)', color: 'var(--color-space)' } : {}}
                onClick={() => handlePreset(p)}
                disabled={isPending}
                aria-label={`Preset ${p} XLM`}
              >
                {p} XLM
              </button>
            ))}
          </div>

          {/* Submit / pending */}
          <button
            id="btn-donate"
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={isPending || !amount || parseFloat(amount) <= 0}
          >
            {isPending ? (
              <>
                <div className="spinner" />
                {pendingLabel[txState.status] ?? 'Processing…'}
              </>
            ) : (
              'Fund This Campaign →'
            )}
          </button>

          {/* Sender info */}
          {publicKey && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', textAlign: 'center', marginTop: 10 }}>
              Sending from {shortAddress(publicKey)}
            </p>
          )}
        </form>
      )}
    </div>
  )
}
