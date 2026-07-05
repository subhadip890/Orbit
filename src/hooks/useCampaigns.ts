/**
 * useCampaigns.ts — Level 3
 * Reads all campaigns from CampaignsContract + platform total from LeaderboardContract.
 * Writes: donate(campaignId, amount) and createCampaign(owner, title, desc, goal).
 * Polls every 5s for real-time updates (event streaming).
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Networks,
  scValToNative,
  nativeToScVal,
  Contract,
  BASE_FEE,
  Horizon,
} from '@stellar/stellar-sdk'

const SOROBAN_RPC_URL = import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET
const CAMPAIGNS_ID = import.meta.env.VITE_CAMPAIGNS_CONTRACT_ID || ''
const LEADERBOARD_ID = import.meta.env.VITE_LEADERBOARD_CONTRACT_ID || ''
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const READ_ACCOUNT = 'GCH4CBE74CWK5NIT7BHM5LDOLWVTTTTXMVD5TM3IT4PCCELX24A2AF67'

const rpcServer = new SorobanRpc.Server(SOROBAN_RPC_URL)
const horizonServer = new Horizon.Server(HORIZON_URL)

// ── Stroop helpers (exported so tests can import) ─────────────────────────────
export const xlmToStroops = (xlm: number): bigint => BigInt(Math.round(xlm * 10_000_000))
export const stroopsToXlm = (stroops: bigint | number): string =>
  (Number(stroops) / 10_000_000).toFixed(2)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Campaign {
  id: number
  title: string
  description: string
  goal: bigint
  raised: bigint
  owner: string
  donorCount: number
  active: boolean
  progress: number // 0–1
}

export type TxState =
  | { status: 'idle' }
  | { status: 'building' }
  | { status: 'awaiting_signature' }
  | { status: 'submitting' }
  | { status: 'success'; hash: string }
  | { status: 'error'; message: string; code?: string }

// ── Internal: RPC simulation helper ──────────────────────────────────────────

async function simCall<T>(contractId: string, method: string, ...scArgs: ReturnType<typeof nativeToScVal>[]): Promise<T | null> {
  try {
    const contract = new Contract(contractId)
    const account = await horizonServer.loadAccount(READ_ACCOUNT)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...scArgs))
      .setTimeout(30)
      .build()

    const result = await rpcServer.simulateTransaction(tx)
    if (result && 'result' in result && (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result) {
      return scValToNative(
        (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
      ) as T
    }
    return null
  } catch {
    return null
  }
}

// Map raw Soroban struct (snake_case) to Campaign interface
function mapCampaign(raw: Record<string, unknown>): Campaign {
  const goal = BigInt(raw.goal as bigint | number)
  const raised = BigInt(raw.raised as bigint | number)
  return {
    id: Number(raw.id),
    title: String(raw.title || ''),
    description: String(raw.description || ''),
    goal,
    raised,
    owner: String(raw.owner || ''),
    donorCount: Number(raw.donor_count ?? 0),
    active: Boolean(raw.active),
    progress: goal > 0n ? Math.min(Number(raised) / Number(goal), 1) : 0,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCampaigns(
  signTxXDR?: (xdr: string, passphrase: string) => Promise<string>
) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [platformTotal, setPlatformTotal] = useState<bigint>(0n)
  const [txState, setTxState] = useState<TxState>({ status: 'idle' })
  const [isPolling, setIsPolling] = useState(false)
  const [loading, setLoading] = useState(true)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch all campaign data ─────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!CAMPAIGNS_ID) return
    try {
      const count = await simCall<number>(CAMPAIGNS_ID, 'get_campaign_count')
      const n = Number(count ?? 0)
      if (n > 0) {
        const fetches = Array.from({ length: n }, (_, i) =>
          simCall<Record<string, unknown>>(
            CAMPAIGNS_ID,
            'get_campaign',
            nativeToScVal(i, { type: 'u32' })
          )
        )
        const raws = await Promise.all(fetches)
        setCampaigns(raws.filter(Boolean).map((r) => mapCampaign(r!)))
      }
      if (LEADERBOARD_ID) {
        const total = await simCall<bigint>(LEADERBOARD_ID, 'get_platform_total')
        setPlatformTotal(BigInt(total ?? 0))
      }
    } catch {
      // Keep existing values on error
    } finally {
      setLoading(false)
    }
  }, [])

  // Real-time polling
  useEffect(() => {
    if (!CAMPAIGNS_ID) { setLoading(false); return }
    setIsPolling(true)
    fetchAll()
    pollingRef.current = setInterval(fetchAll, 5_000)
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null }
      setIsPolling(false)
    }
  }, [fetchAll])

  // ── Shared transaction helper ───────────────────────────────────────────────
  async function submitTx(
    senderPublicKey: string,
    contractId: string,
    method: string,
    args: ReturnType<typeof nativeToScVal>[]
  ): Promise<{ ok: boolean; hash?: string; error?: string }> {
    if (!signTxXDR) return { ok: false, error: 'Wallet not connected' }
    try {
      setTxState({ status: 'building' })
      const contract = new Contract(contractId)
      const account = await rpcServer.getAccount(senderPublicKey)
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call(method, ...args))
        .setTimeout(180)
        .build()

      const simResult = await rpcServer.simulateTransaction(tx)
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        const err = simResult.error.toLowerCase()
        if (err.includes('underfunded') || err.includes('insufficient')) {
          const msg = 'Insufficient XLM balance for this transaction.'
          setTxState({ status: 'error', message: msg, code: 'INSUFFICIENT_BALANCE' })
          return { ok: false, error: msg }
        }
        throw new Error(simResult.error)
      }

      const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build()

      setTxState({ status: 'awaiting_signature' })
      let signedXDR: string
      try {
        signedXDR = await signTxXDR(preparedTx.toXDR(), NETWORK_PASSPHRASE)
      } catch (sigErr) {
        const m = sigErr instanceof Error ? sigErr.message.toLowerCase() : ''
        const isRejected = m.includes('reject') || m.includes('cancel') || m.includes('denied')
        const msg = isRejected
          ? 'Transaction rejected — you cancelled the signature request.'
          : `Signing failed: ${sigErr instanceof Error ? sigErr.message : String(sigErr)}`
        setTxState({ status: 'error', message: msg, code: isRejected ? 'USER_REJECTED' : undefined })
        return { ok: false, error: msg }
      }

      setTxState({ status: 'submitting' })
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE)
      const sendResult = await rpcServer.sendTransaction(signedTx)
      if (sendResult.status === 'ERROR') {
        throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`)
      }

      // Poll for confirmation
      let getResult = await rpcServer.getTransaction(sendResult.hash)
      let attempts = 0
      while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20) {
        await new Promise<void>((r) => setTimeout(r, 1500))
        getResult = await rpcServer.getTransaction(sendResult.hash)
        attempts++
      }

      if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        setTxState({ status: 'success', hash: sendResult.hash })
        setTimeout(fetchAll, 2000)
        return { ok: true, hash: sendResult.hash }
      }
      throw new Error(`Transaction did not confirm: ${getResult.status}`)
    } catch (err) {
      let message = 'Transaction failed.'
      let code: string | undefined
      if (err instanceof Error) {
        const m = err.message.toLowerCase()
        if (m.includes('underfunded') || m.includes('insufficient')) {
          message = 'Insufficient XLM balance.'
          code = 'INSUFFICIENT_BALANCE'
        } else if (m.includes('op_low_reserve')) {
          message = 'This would drop your balance below the minimum reserve (1 XLM).'
          code = 'LOW_RESERVE'
        } else {
          message = err.message
        }
      }
      setTxState({ status: 'error', message, code })
      return { ok: false, error: message }
    }
  }

  // ── Donate to a specific campaign ──────────────────────────────────────────
  const donate = useCallback(
    async (senderPublicKey: string, campaignId: number, amountXLM: number) => {
      if (amountXLM <= 0) {
        const msg = 'Please enter a valid amount greater than 0 XLM.'
        setTxState({ status: 'error', message: msg })
        return { ok: false, error: msg }
      }
      return submitTx(senderPublicKey, CAMPAIGNS_ID, 'donate', [
        nativeToScVal(senderPublicKey, { type: 'address' }),
        nativeToScVal(campaignId, { type: 'u32' }),
        nativeToScVal(xlmToStroops(amountXLM), { type: 'i128' }),
      ])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signTxXDR, fetchAll]
  )

  // ── Create a new campaign ──────────────────────────────────────────────────
  const createCampaign = useCallback(
    async (ownerPublicKey: string, title: string, description: string, goalXLM: number) => {
      if (!title.trim() || goalXLM <= 0) {
        const msg = 'Please fill in all fields with valid values.'
        setTxState({ status: 'error', message: msg })
        return { ok: false, error: msg }
      }
      return submitTx(ownerPublicKey, CAMPAIGNS_ID, 'create_campaign', [
        nativeToScVal(ownerPublicKey, { type: 'address' }),
        nativeToScVal(title, { type: 'string' }),
        nativeToScVal(description, { type: 'string' }),
        nativeToScVal(xlmToStroops(goalXLM), { type: 'i128' }),
      ])
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signTxXDR, fetchAll]
  )

  const resetTx = useCallback(() => setTxState({ status: 'idle' }), [])

  return {
    campaigns,
    platformTotal,
    txState,
    isPolling,
    loading,
    hasContract: Boolean(CAMPAIGNS_ID),
    donate,
    createCampaign,
    resetTx,
    fetchAll,
    CAMPAIGNS_ID,
    LEADERBOARD_ID,
  }
}
