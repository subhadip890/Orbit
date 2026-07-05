/**
 * Leaderboard.tsx — Level 3
 * Shows platform-wide donation total from LeaderboardContract.
 * Updates every 5s via the useCampaigns polling loop.
 */
import { memo } from 'react'
import { stroopsToXlm } from '../hooks/useCampaigns'

interface Props {
  platformTotal: bigint
  campaignCount: number
  isPolling: boolean
  leaderboardId: string
}

export const Leaderboard = memo(function Leaderboard({
  platformTotal,
  campaignCount,
  isPolling,
  leaderboardId,
}: Props) {
  const totalXLM = stroopsToXlm(platformTotal)

  return (
    <aside className="leaderboard">
      <div className="leaderboard__header">
        <h2 className="leaderboard__title">
          <span className="leaderboard__icon">🏆</span>
          Platform Stats
        </h2>
        {isPolling && (
          <span className="leaderboard__live">
            <span className="pulse-dot" /> Live
          </span>
        )}
      </div>

      {/* Total raised */}
      <div className="leaderboard__total">
        <div className="leaderboard__total-value">{totalXLM}</div>
        <div className="leaderboard__total-label">Total XLM Raised</div>
        <div className="leaderboard__total-subtitle">
          across {campaignCount} campaign{campaignCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats grid */}
      <div className="leaderboard__stats">
        <div className="leaderboard__stat-card">
          <div className="leaderboard__stat-icon">📊</div>
          <div className="leaderboard__stat-info">
            <div className="leaderboard__stat-val">{campaignCount}</div>
            <div className="leaderboard__stat-lbl">Campaigns</div>
          </div>
        </div>
        <div className="leaderboard__stat-card">
          <div className="leaderboard__stat-icon">💎</div>
          <div className="leaderboard__stat-info">
            <div className="leaderboard__stat-val">{totalXLM}</div>
            <div className="leaderboard__stat-lbl">XLM Total</div>
          </div>
        </div>
      </div>

      {/* Inter-contract badge */}
      <div className="leaderboard__badge">
        <div className="leaderboard__badge-icon">⚡</div>
        <div className="leaderboard__badge-text">
          <strong>Inter-Contract Live</strong>
          <p>
            Totals updated via{' '}
            <code>env.invoke_contract</code> on every donation
          </p>
        </div>
      </div>

      {/* Contract links */}
      <div className="leaderboard__links">
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${leaderboardId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="leaderboard__link"
        >
          View Leaderboard Contract ↗
        </a>
      </div>
    </aside>
  )
})
