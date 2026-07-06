/**
 * App.tsx — Level 3 (Orange Belt)
 * Advanced multi-campaign dApp with inter-contract communication.
 * Level 2 features preserved + new Level 3 additions:
 *  - Multi-campaign grid from CampaignsContract
 *  - Leaderboard sidebar from LeaderboardContract (inter-contract)
 *  - Create campaign modal
 *  - Mobile responsive layout
 *  - Real-time event streaming via polling
 */
import { useState, useCallback, Suspense, lazy } from 'react'
import { useWalletKit } from './hooks/useWalletKit'
import { useContract, stroopsToXlm } from './hooks/useContract'
import { useCampaigns } from './hooks/useCampaigns'
import { WalletModal } from './components/WalletModal'
import { DonatePanel } from './components/DonatePanel'
import { TransactionResult } from './components/TransactionResult'
import { CampaignCard } from './components/CampaignCard'
import { Leaderboard } from './components/Leaderboard'
import { CreateCampaignModal } from './components/CreateCampaignModal'

const Hero = lazy(() => import('./components/Hero'))

export default function App() {
  const {
    walletStatus,
    showModal,
    setShowModal,
    connectWallet,
    disconnect,
    signTxXDR,
    isConnected,
    publicKey,
    xlmBalance,
  } = useWalletKit()

  const { campaign, txState, isPolling, hasContract, donate, resetTx, CONTRACT_ID } =
    useContract(isConnected ? signTxXDR : undefined)

  // ── Level 3: Multi-campaign hook ──────────────────────────────────────────
  const {
    campaigns,
    platformTotal,
    txState: campaignTxState,
    isPolling: campaignPolling,
    loading: campaignLoading,
    donate: donateToCampaign,
    createCampaign,
    closeCampaign,
    resetTx: resetCampaignTx,
    CAMPAIGNS_ID,
    LEADERBOARD_ID,
  } = useCampaigns(isConnected ? signTxXDR : undefined)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [donateAmount, setDonateAmount] = useState('')

  const handleDonate = useCallback(async () => {
    if (!publicKey || !donateAmount) return
    const amount = parseFloat(donateAmount)
    await donate(publicKey, amount)
  }, [publicKey, donateAmount, donate])

  const handleReset = useCallback(() => {
    resetTx()
    setDonateAmount('')
  }, [resetTx])

  // Derived state
  const goalXLM = stroopsToXlm(campaign.goal)
  const raisedXLM = stroopsToXlm(campaign.raised)
  const progressPct = Math.round(campaign.progress * 100)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-space)', color: 'var(--color-white)' }}>
      {/* ── Wallet Selection Modal ──────────────────────────────────────────── */}
      <WalletModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelectWallet={connectWallet}
      />

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="nav-blur" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div
          className="content-section"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4) var(--space-6)',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="star-glow" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-gold)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-starlight)', letterSpacing: '-0.02em' }}>
              Orbit
            </span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', marginLeft: 4 }}>
              Stellar Testnet · Level 2
            </span>
          </div>

          {/* Wallet status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {walletStatus.status === 'connected' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="pulse-dot" />
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                      {walletStatus.publicKey.slice(0, 4)}…{walletStatus.publicKey.slice(-4)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-muted)', opacity: 0.7 }}>
                      {walletStatus.walletId} · TESTNET
                    </div>
                  </div>
                </div>
                {xlmBalance && (
                  <div
                    className="balance-chip"
                    onClick={() => {}}
                    title="XLM Balance"
                    style={{ cursor: 'default' }}
                  >
                    <span className="balance-amount" style={{ fontSize: 'var(--text-sm)' }}>{xlmBalance}</span>
                    <span className="balance-unit">XLM</span>
                  </div>
                )}
                <button className="btn-ghost btn-sm" onClick={disconnect} style={{ color: 'var(--color-error)' }}>
                  Disconnect
                </button>
              </>
            ) : walletStatus.status === 'connecting' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                Connecting…
              </div>
            ) : (
              <button
                id="connect-wallet-btn"
                className="btn-primary btn-sm"
                onClick={() => setShowModal(true)}
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <Suspense fallback={<div style={{ height: '60vh' }} />}>
        <Hero />
      </Suspense>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          marginTop: '-40vh',
          paddingBottom: 'var(--space-24)',
        }}
      >
        <div className="content-section">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
              gap: 'var(--space-8)',
              alignItems: 'start',
            }}
          >
            {/* ── Left: Campaign info ─────────────────────────────────────── */}
            <div>
              <p
                className="fade-in fade-in-delay-2"
                style={{
                  fontSize: 'var(--text-xs)',
                  letterSpacing: '0.15em',
                  color: 'var(--color-gold)',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--space-3)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Stellar Testnet · Level 2
              </p>

              <h1
                className="fade-in fade-in-delay-1"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: '-0.03em',
                  marginBottom: 'var(--space-6)',
                }}
              >
                Fund the future{' '}
                <span style={{ color: 'var(--color-gold)' }}>of Stellar.</span>
              </h1>

              <p
                className="fade-in fade-in-delay-2"
                style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-muted)',
                  lineHeight: 1.7,
                  maxWidth: 440,
                  marginBottom: 'var(--space-8)',
                }}
              >
                Orbit is powered by a Soroban smart contract on Stellar Testnet.
                Every donation is recorded on-chain, transparent, and instant.
              </p>

              {/* Campaign progress card */}
              <div
                className="glass-card fade-in fade-in-delay-3"
                style={{ padding: 'var(--space-6)', maxWidth: 420 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
                      Total raised
                    </span>
                    <div className="balance-display">
                      <span className="balance-amount">{parseFloat(raisedXLM).toLocaleString()}</span>
                      <span className="balance-unit">XLM</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
                      Goal
                    </span>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                      <span style={{ fontSize: 'var(--text-xl)', color: 'var(--color-starlight)' }}>
                        {parseFloat(goalXLM).toLocaleString()}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginLeft: 4 }}>XLM</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="progress-track" style={{ marginBottom: 8 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${progressPct}%`, transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-gold)' }}>
                    {progressPct}% funded
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isPolling && <div className="pulse-dot" style={{ background: 'var(--color-teal)' }} />}
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                      {campaign.donorCount} donor{campaign.donorCount !== 1 ? 's' : ''} · live
                    </span>
                  </div>
                </div>

                {/* Contract address */}
                {hasContract && (
                  <div className="divider" style={{ marginTop: 16, marginBottom: 12 }} />
                )}
                {hasContract && (
                  <div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
                      Contract ID (Testnet)
                    </span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-gold)', textDecoration: 'none', wordBreak: 'break-all' }}
                    >
                      {CONTRACT_ID.slice(0, 8)}…{CONTRACT_ID.slice(-8)} ↗
                    </a>
                  </div>
                )}

                {/* Stats */}
                <div className="divider" style={{ marginTop: 16 }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                  {[
                    { label: 'Network', value: 'Testnet' },
                    { label: 'Asset', value: 'XLM' },
                    { label: 'Protocol', value: 'Soroban' },
                  ].map((s) => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block' }}>{s.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-starlight)' }}>
                        {s.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error display for wallet errors */}
              {walletStatus.status === 'error' && (
                <div
                  className="fade-in"
                  style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: 'rgba(255, 107, 107, 0.08)',
                    border: '1px solid rgba(255, 107, 107, 0.25)',
                    borderRadius: 10,
                    maxWidth: 420,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>
                      {walletStatus.code === 'NOT_FOUND' ? '🔍' : walletStatus.code === 'REJECTED' ? '🚫' : '⚠️'}
                    </span>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', fontWeight: 600, marginBottom: 4 }}>
                        {walletStatus.code === 'NOT_FOUND'
                          ? 'Wallet Not Found'
                          : walletStatus.code === 'REJECTED'
                          ? 'Connection Rejected'
                          : 'Connection Error'}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>{walletStatus.message}</div>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => setShowModal(true)}
                        style={{ marginTop: 8, fontSize: 'var(--text-xs)' }}
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: Donate panel ─────────────────────────────────────── */}
            <div style={{ position: 'sticky', top: 88 }}>
              {txState.status === 'success' || txState.status === 'error' ? (
                <TransactionResult
                  txState={txState}
                  onReset={handleReset}
                />
              ) : (
                <DonatePanel
                  isWalletConnected={isConnected}
                  publicKey={publicKey}
                  balance={xlmBalance}
                  txState={txState}
                  onDonate={handleDonate}
                  onConnectWallet={() => setShowModal(true)}
                  onReset={handleReset}
                  campaignAddress={CONTRACT_ID || 'Contract not yet deployed'}
                  amount={donateAmount}
                  onAmountChange={setDonateAmount}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Level 3: Multi-Campaign Section ───────────────────────────────── */}
      <section className="campaigns-section">
        <div className="content-section">
          {/* Section header */}
          <div className="campaigns-section__header">
            <div>
              <h2 className="campaigns-section__title">✦ Live Campaigns</h2>
              <p className="campaigns-section__subtitle">
                Multi-campaign crowdfunding powered by{' '}
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${CAMPAIGNS_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-gold"
                >
                  CampaignsContract
                </a>
                {' + '}
                <a
                  href={`https://stellar.expert/explorer/testnet/contract/${LEADERBOARD_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-gold"
                >
                  LeaderboardContract
                </a>
                {' via inter-contract calls'}
              </p>
            </div>
            {isConnected && (
              <button
                className="btn-primary"
                onClick={() => setShowCreateModal(true)}
                disabled={campaignTxState.status !== 'idle' && campaignTxState.status !== 'success' && campaignTxState.status !== 'error'}
              >
                + New Campaign
              </button>
            )}
          </div>

          {/* Main layout: campaign grid + leaderboard sidebar */}
          <div className="campaigns-layout">
            {/* Campaign grid */}
            <div className="campaigns-grid-wrap">
              {campaignLoading ? (
                <div className="campaigns-loading">
                  <div className="spinner" />
                  <p>Loading campaigns from Stellar testnet…</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="campaigns-empty">
                  <div className="campaigns-empty__icon">🚀</div>
                  <p>No campaigns yet.</p>
                  {isConnected && (
                    <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
                      Create the first campaign
                    </button>
                  )}
                </div>
              ) : (
                <div className="campaigns-grid">
                  {campaigns.map((c) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      isConnected={isConnected}
                      publicKey={publicKey ?? undefined}
                      txState={campaignTxState}
                      onDonate={(id, amt) => publicKey && donateToCampaign(publicKey, id, amt)}
                      onClose={(id) => publicKey && closeCampaign(publicKey, id)}
                      onResetTx={resetCampaignTx}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Leaderboard sidebar */}
            <Leaderboard
              platformTotal={platformTotal}
              campaignCount={campaigns.length}
              isPolling={campaignPolling}
              leaderboardId={LEADERBOARD_ID}
            />
          </div>
        </div>
      </section>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        isBusy={campaignTxState.status !== 'idle' && campaignTxState.status !== 'success' && campaignTxState.status !== 'error'}
        onClose={() => setShowCreateModal(false)}
        onCreate={(title, desc, goalXLM) => {
          if (!publicKey) return
          setShowCreateModal(false)
          createCampaign(publicKey, title, desc, goalXLM)
        }}
      />

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: 'var(--space-8) 0' }}>
        <div className="content-section" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
            Orbit · Built on{' '}
            <a href="https://stellar.org" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', textDecoration: 'none' }}>
              Stellar
            </a>{' '}
            Testnet · Orange Belt Level 3
          </span>
        </div>
      </footer>
    </div>
  )
}
