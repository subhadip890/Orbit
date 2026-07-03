/**
 * App.tsx
 * Root component — assembles nav, hero, and donate section.
 * Wires together useWallet and useTransaction hooks.
 */
import { lazy, Suspense } from 'react'
import { useWallet } from './hooks/useWallet'
import { useTransaction } from './hooks/useTransaction'
import WalletPanel from './components/WalletPanel'
import DonatePanel from './components/DonatePanel'

const Hero = lazy(() => import('./components/Hero'))

// Progress is driven by a mock goal for Level 1 (no contract yet).
// This will become contract-driven in Level 2.
const CAMPAIGN_GOAL_XLM = 1000
const CAMPAIGN_RAISED_MOCK = 342 // placeholder until contract

export default function App() {
  const { wallet, balance, connect, disconnect, refreshBalance, publicKey } = useWallet()
  const { txState, sendDonation, resetTx, campaignAddress } = useTransaction()

  const progress = CAMPAIGN_RAISED_MOCK / CAMPAIGN_GOAL_XLM

  const handleDonate = async (senderKey: string, amount: string) => {
    await sendDonation(senderKey, amount)
    // Refresh balance after a donation attempt
    await refreshBalance()
  }

  const balanceXLM =
    balance.status === 'loaded' ? balance.xlm : null

  return (
    <div className="app-layout">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="nav" role="navigation" aria-label="Main navigation">
        <div className="nav-logo">
          <div className="nav-logo-dot" aria-hidden="true" />
          Orbit
        </div>

        <WalletPanel
          wallet={wallet}
          balance={balance}
          onConnect={connect}
          onDisconnect={disconnect}
          onRefreshBalance={refreshBalance}
        />
      </nav>

      {/* ── Hero / 3D scene ──────────────────────────────────────────────── */}
      <Suspense fallback={
        <div style={{ minHeight: '100vh', background: 'var(--color-space)' }} />
      }>
        <Hero progress={progress} />
      </Suspense>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main
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
            {/* Left: campaign stats */}
            <div>
              <div className="fade-in">
                <span className="section-label">Stellar Testnet · Level 1</span>
              </div>
              <h1 className="hero-title fade-in fade-in-delay-1" style={{ marginTop: 12 }}>
                Fund the <span>future</span><br />of Stellar.
              </h1>
              <p
                className="fade-in fade-in-delay-2"
                style={{
                  fontSize: 'var(--text-lg)',
                  color: 'var(--color-muted)',
                  maxWidth: 460,
                  marginTop: 16,
                  marginBottom: 32,
                  lineHeight: 1.6,
                }}
              >
                Orbit is an open crowdfunding platform built on the Stellar network.
                Connect your Freighter wallet and send XLM directly to campaigns
                — transparent, instant, trustless.
              </p>

              {/* Campaign progress */}
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
                      <span className="balance-amount">{CAMPAIGN_RAISED_MOCK.toLocaleString()}</span>
                      <span className="balance-unit">XLM</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
                      Goal
                    </span>
                    <div className="balance-display">
                      <span className="balance-amount" style={{ fontSize: 'var(--text-xl)' }}>
                        {CAMPAIGN_GOAL_XLM.toLocaleString()}
                      </span>
                      <span className="balance-unit">XLM</span>
                    </div>
                  </div>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(progress * 100, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Campaign progress"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                    {Math.round(progress * 100)}% funded
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="pulse-dot" />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>Testnet live</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="divider" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Network', value: 'Testnet' },
                    { label: 'Asset', value: 'XLM' },
                    { label: 'Protocol', value: 'Stellar' },
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

              {/* How it works — informational, not decorative */}
              <div className="fade-in fade-in-delay-4" style={{ marginTop: 'var(--space-8)', maxWidth: 420 }}>
                <span className="section-label" style={{ marginBottom: 16, display: 'block' }}>How donations work</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    {
                      step: 'Connect',
                      desc: 'Freighter wallet signs in — your keys never leave your browser.',
                    },
                    {
                      step: 'Enter amount',
                      desc: 'Choose any amount in XLM. Minimum is 1 stroop (0.0000001 XLM).',
                    },
                    {
                      step: 'Approve & send',
                      desc: 'Freighter shows you the exact transaction before it goes to testnet.',
                    },
                  ].map(({ step, desc }) => (
                    <div key={step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          color: 'var(--color-starlight)',
                          minWidth: 56,
                          paddingTop: 2,
                        }}
                      >
                        {step}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: donate panel */}
            <div style={{ position: 'sticky', top: 88 }}>
              <DonatePanel
                isWalletConnected={wallet.status === 'connected'}
                publicKey={publicKey}
                balance={balanceXLM}
                txState={txState}
                onDonate={handleDonate}
                onConnectWallet={connect}
                onReset={resetTx}
                campaignAddress={campaignAddress}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer
          style={{
            textAlign: 'center',
            padding: 'var(--space-8)',
            borderTop: '1px solid var(--color-glass-border)',
            marginTop: 'var(--space-16)',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
            Orbit · Built on{' '}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--color-starlight)' }}
            >
              Stellar
            </a>{' '}
            Testnet · White Belt Level 1
          </p>
        </footer>
      </main>
    </div>
  )
}
