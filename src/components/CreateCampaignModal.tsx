/**
 * CreateCampaignModal.tsx — Level 3
 * Modal form for creating a new fundraising campaign.
 */
import { useState, useCallback, useEffect, useRef } from 'react'

interface Props {
  isOpen: boolean
  isBusy: boolean
  onClose: () => void
  onCreate: (title: string, description: string, goalXLM: number) => void
}

export function CreateCampaignModal({ isOpen, isBusy, onClose, onCreate }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [goal, setGoal] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => titleRef.current?.focus(), 50)
    } else {
      setTitle('')
      setDescription('')
      setGoal('')
    }
  }, [isOpen])

  const handleSubmit = useCallback(() => {
    const goalNum = parseFloat(goal)
    if (!title.trim() || !description.trim() || isNaN(goalNum) || goalNum <= 0) return
    onCreate(title.trim(), description.trim(), goalNum)
  }, [title, description, goal, onCreate])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-box__header">
          <h2 className="modal-box__title">✦ Create Campaign</h2>
          <button className="btn-ghost btn-icon" onClick={onClose} aria-label="Close">✕</button>
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
        </div>

        <div className="modal-box__footer">
          <button
            className="btn-ghost"
            onClick={onClose}
            disabled={isBusy}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={isBusy || !title.trim() || !description.trim() || !goal || parseFloat(goal) <= 0}
          >
            {isBusy ? (
              <><div className="spinner-sm" /> Creating…</>
            ) : (
              '✦ Launch Campaign'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
