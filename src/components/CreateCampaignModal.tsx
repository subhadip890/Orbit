/**
 * CreateCampaignModal.tsx — Level 3
 * Modal form for creating a new fundraising campaign.
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import type { TxState } from '../hooks/useCampaigns'

interface Props {
  isOpen: boolean
  txState: TxState
  onClose: () => void
  onCreate: (title: string, description: string, goalXLM: number) => void
  onResetTx: () => void
}

export function CreateCampaignModal({ isOpen, txState, onClose, onCreate, onResetTx }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  const isBusy =
    txState.status === 'building' ||
    txState.status === 'awaiting_signature' ||
    txState.status === 'submitting' ||
    txState.status === 'success'

  const handleClose = useCallback(() => {
    onClose()
    onResetTx()
  }, [onClose, onResetTx])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 50)
    } else {
      setTitle('')
      setDescription('')
      setGoal('')
    }
  }, [isOpen])

  useEffect(() => {
    if (txState.status === 'success') {
      const timer = setTimeout(() => {
        handleClose()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [txState.status, handleClose])

  const handleSubmit = useCallback(() => {
    const goalNum = parseFloat(goal)
    if (!title.trim() || !description.trim() || isNaN(goalNum) || goalNum <= 0) return
    onCreate(title.trim(), description.trim(), goalNum)
  }, [title, description, goal, onCreate])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-box__header">
          <h2 className="modal-box__title">✦ Create Campaign</h2>
          <button className="btn-ghost btn-icon" onClick={handleClose} aria-label="Close" disabled={isBusy}>✕</button>
        </div>

        <p className="modal-box__subtitle">
          Launch a new fundraising campaign on Stellar testnet.
        </p>

        <div className="modal-box__form">
          <label className="form-label">
            Campaign Title
            <input
              ref={titleRef}
              className="form-input"
              type="text"
              placeholder="e.g. Save the Rainforest"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isBusy}
              maxLength={80}
            />
          </label>

          <label className="form-label">
            Description
            <textarea
              className="form-input form-textarea"
              placeholder="What is this campaign for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isBusy}
              rows={3}
              maxLength={200}
            />
          </label>

          <label className="form-label">
            Fundraising Goal (XLM)
            <div className="form-input-wrap">
              <input
                className="form-input"
                type="number"
                min="1"
                step="1"
                placeholder="500"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                disabled={isBusy}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <span className="form-input-suffix">XLM</span>
            </div>
          </label>

          {/* Transaction status inside modal */}
          {txState.status === 'error' && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(255, 107, 107, 0.08)',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              borderRadius: 8,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-error)'
            }}>
              ⚠️ {txState.message || 'Failed to launch campaign. Please try again.'}
            </div>
          )}

          {txState.status === 'success' && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)',
              background: 'rgba(46, 204, 113, 0.08)',
              border: '1px solid rgba(46, 204, 113, 0.25)',
              borderRadius: 8,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-success)',
              textAlign: 'center',
              fontWeight: 600
            }}>
              🚀 Campaign Launched Successfully! Redirecting...
            </div>
          )}
        </div>

        <div className="modal-box__footer">
          <button
            className="btn-ghost"
            onClick={handleClose}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isBusy || !title.trim() || !description.trim() || !goal || parseFloat(goal) <= 0}
          >
            {isBusy && txState.status !== 'success' ? (
              <>
                <div className="spinner-sm" />
                {txState.status === 'building' && 'Building…'}
                {txState.status === 'awaiting_signature' && 'Sign in wallet…'}
                {txState.status === 'submitting' && 'Submitting…'}
              </>
            ) : txState.status === 'success' ? (
              'Launched! ✓'
            ) : (
              '✦ Launch Campaign'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
