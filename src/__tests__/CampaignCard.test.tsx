/**
 * CampaignCard.test.tsx — Level 3
 * UI tests for the CampaignCard component.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CampaignCard } from '../components/CampaignCard'
import type { Campaign, TxState } from '../hooks/useCampaigns'

const mockCampaign: Campaign = {
  id: 0,
  title: 'Save the Rainforest',
  description: 'Fund reforestation in the Amazon basin',
  goal: 10_000_000_000n,  // 1000 XLM
  raised: 2_000_000_000n,  // 200 XLM
  owner: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGCFL8X0S28AAYH3SZ9KDE',
  donorCount: 5,
  active: true,
  progress: 0.2,
}

const idleTxState: TxState = { status: 'idle' }

describe('CampaignCard', () => {
  it('renders campaign title', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText('Save the Rainforest')).toBeInTheDocument()
  })

  it('renders campaign description', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText(/Amazon basin/i)).toBeInTheDocument()
  })

  it('shows correct progress percentage (20%)', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText('20%')).toBeInTheDocument()
  })

  it('shows donor count', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows "Connect wallet to donate" when not connected', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText(/connect wallet/i)).toBeInTheDocument()
  })

  it('shows Donate button when wallet is connected', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={true}
        publicKey="GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGCFL8X0S28AAYH3SZ9KDE"
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /donate/i })).toBeInTheDocument()
  })

  it('shows Active badge for active campaigns', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={false}
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    expect(screen.getByText(/active/i)).toBeInTheDocument()
  })

  it('reveals amount input when Donate button is clicked', () => {
    render(
      <CampaignCard
        campaign={mockCampaign}
        isConnected={true}
        publicKey="GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGCFL8X0S28AAYH3SZ9KDE"
        txState={idleTxState}
        onDonate={vi.fn()}
        onClose={vi.fn()}
        onResetTx={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /donate/i }))
    expect(screen.getByPlaceholderText(/xlm amount/i)).toBeInTheDocument()
  })
})
