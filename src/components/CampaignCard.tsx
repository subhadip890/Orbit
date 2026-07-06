/**
 * CampaignCard.tsx — Level 3
 * Displays a single fundraising campaign with animated progress bar,
 * donate input, and close button (owner only).
 */
import { useState, useCallback, memo } from 'react'
import type { Campaign, TxState } from '../hooks/useCampaigns'
import { stroopsToXlm } from '../hooks/useCampaigns'

interface Props {
  campaign: Campaign
  isConnected: boolean
  publicKey?: string
  txState: TxState
  onDonate: (campaignId: number, amountXLM: number) => void
  onClose: (campaignId: number) => void
  onResetTx: () => void
}

export const CampaignCard = memo(function CampaignCard({
  campaign,
  isConnected,
  publicKey,
  txState,
  onDonate,
  onClose,
  onResetTx,
}: Props) {
  const [amount, setAmount] = useState('')
  const [showDonate, setShowDonate] = useState(false)

  const isOwner = isConnected && publicKey === campaign.owner
  const isTargetTx = txState.campaignId === campaign.id
  const isBusy =
    isTargetTx && (
      txState.status === 'building' ||
      txState.status === 'awaiting_signature' ||
      txState.status === 'submitting'
    )

  const progressPct = Math.round(campaign.progress * 100)
  const raisedXLM = stroopsToXlm(campaign.raised)
  const goalXLM = stroopsToXlm(campaign.goal)

  const handleDonate = useCallback(() => {
    const n = parseFloat(amount)
    if (!isNaN(n) && n > 0) {
      onDonate(campaign.id, n)
      setAmount('')
      setShowDonate(false)
    }
  }, [amount, campaign.id, onDonate])

  const statusColor =
    txState.status === 'success'
      ? 'var(--color-success)'
      : txState.status === 'error'
        ? 'var(--color-error)'
        : 'var(--color-gold)'

  return (
    <div className="campaign-card" data-active={campaign.active}>
      {/* Header */}
      <div className="campaign-card__header">
        <div className="campaign-card__badge" data-active={campaign.active}>
          {campaign.active ? '● Active' : '✓ Closed'}
        </div>
        <span className="campaign-card__id">#{campaign.id}</span>
      </div>

      {/* Title & description */}
      <h3 className="campaign-card__title">{campaign.title}</h3>
      <p className="campaign-card__desc">{campaign.description}</p>

      {/* Progress bar */}
      <div className="campaign-card__progress-wrap">
        <div className="campaign-card__progress-bar">
          <div
            className="campaign-card__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="campaign-card__progress-labels">
          <span>{raisedXLM} XLM raised</span>
          <span className="campaign-card__pct">{progressPct}%</span>
          <span>of {goalXLM} XLM</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="campaign-card__stats">
        <div className="campaign-card__stat">
          <span className="stat-value">{campaign.donorCount}</span>
          <span className="stat-label">Donors</span>
        </div>
        <div className="campaign-card__stat">
          <span className="stat-value">{raisedXLM}</span>
          <span className="stat-label">Raised (XLM)</span>
        </div>
        <div className="campaign-card__stat">
          <span className="stat-value">{goalXLM}</span>
          <span className="stat-label">Goal (XLM)</span>
        </div>
      </div>

      {/* Tx status */}
      {isTargetTx && (txState.status === 'success' || txState.status === 'error') && (
        <div className="campaign-card__tx-status" style={{ borderColor: statusColor }}>
          <span style={{ color: statusColor }}>
            {txState.status === 'success' && txState.hash
              ? `✅ TX: ${txState.hash.slice(0, 8)}…${txState.hash.slice(-8)}`
              : `❌ ${txState.message || 'Transaction failed.'}`}
          </span>
          <button className="btn-ghost btn-sm" onClick={onResetTx}>✕</button>
        </div>
      )}
      {isBusy && (
        <div className="campaign-card__tx-status" style={{ borderColor: 'var(--color-gold)' }}>
          <div className="spinner-sm" />
          <span style={{ color: 'var(--color-gold)', fontSize: '0.8rem' }}>
            {txState.status === 'building' && 'Building transaction…'}
            {txState.status === 'awaiting_signature' && 'Waiting for wallet signature…'}
            {txState.status === 'submitting' && 'Submitting to Stellar…'}
          </span>
        </div>
      )}

      {/* Actions */}
      {campaign.active && (
        <div className="campaign-card__actions">
          {isConnected ? (
            showDonate ? (
              <div className="campaign-card__donate-row">
                <input
                  className="input-sm"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="XLM amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDonate()}
                  disabled={isBusy}
                  autoFocus
                />
                <button
                  className="btn-primary btn-sm"
                  onClick={handleDonate}
                  disabled={isBusy || !amount || parseFloat(amount) <= 0}
                >
                  Donate
                </button>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => { setShowDonate(false); setAmount('') }}
                  disabled={isBusy}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="campaign-card__btn-row">
                <button
                  className="btn-primary"
                  onClick={() => setShowDonate(true)}
                  disabled={isBusy}
                >
                  ✦ Donate XLM
                </button>
                {isOwner && (
                  <button
                    className="btn-ghost"
                    onClick={() => onClose(campaign.id)}
                    disabled={isBusy}
                    title="Close campaign and withdraw funds"
                  >
                    Close & Withdraw
                  </button>
                )}
              </div>
            )
          ) : (
            <p className="campaign-card__connect-hint">Connect wallet to donate</p>
          )}
        </div>
      )}
    </div>
  )
})
