/**
 * useContract.ts
 * Soroban crowdfunding contract integration.
 * Reads: goal, raised, donor count from contract via RPC simulation.
 * Writes: donate() — builds, signs via SWK, submits to Soroban RPC.
 * Polls every 5s for real-time campaign updates.
 *
 * Error codes: INSUFFICIENT_BALANCE | USER_REJECTED | LOW_RESERVE
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

const SOROBAN_RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org'
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || ''
const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'

// Public Horizon account used for read-only simulation (fee payer doesn't matter for simulations)
const READ_ACCOUNT = 'GCH4CBE74CWK5NIT7BHM5LDOLWVTTTTXMVD5TM3IT4PCCELX24A2AF67'

const rpcServer = new SorobanRpc.Server(SOROBAN_RPC_URL)
const horizonServer = new Horizon.Server(HORIZON_URL)

// Stroop conversion: 1 XLM = 10_000_000 stroops
export const xlmToStroops = (xlm: number): bigint =>
  BigInt(Math.round(xlm * 10_000_000))

export const stroopsToXlm = (stroops: bigint | number): string =>
  (Number(stroops) / 10_000_000).toFixed(4)

export interface CampaignData {
  goal: bigint
  raised: bigint
  donorCount: number
  progress: number // 0–1
}

export type ContractTxState =
  | { status: 'idle' }
  | { status: 'building' }
  | { status: 'awaiting_signature' }
  | { status: 'submitting' }
  | { status: 'success'; hash: string }
  | { status: 'error'; message: string; code?: string }

// Helper: simulate a read-only contract call and return the native value
async function readContract<T>(contractId: string, method: string): Promise<T | null> {
  try {
    const contract = new Contract(contractId)
    const account = await horizonServer.loadAccount(READ_ACCOUNT)
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(method))
      .setTimeout(30)
      .build()

    const result = await rpcServer.simulateTransaction(tx)
    if (
      result &&
      'result' in result &&
      (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result
    ) {
      return scValToNative(
        (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
      ) as T
    }
    return null
  } catch {
    return null
  }
}

export function useContract(
  signTxXDR?: (xdr: string, passphrase: string) => Promise<string>
) {
  const [campaign, setCampaign] = useState<CampaignData>({
    goal: BigInt(100_000_000_000),  // 10,000 XLM — matches initialized contract
    raised: BigInt(0),
    donorCount: 0,
    progress: 0,
  })
  const [txState, setTxState] = useState<ContractTxState>({ status: 'idle' })
  const [isPolling, setIsPolling] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasContract = Boolean(CONTRACT_ID)

  // Read live campaign data from the contract
  const fetchCampaignData = useCallback(async () => {
    if (!hasContract) return

    try {
      const [rawGoal, rawRaised, rawCount] = await Promise.all([
        readContract<bigint>(CONTRACT_ID, 'get_goal'),
        readContract<bigint>(CONTRACT_ID, 'get_raised'),
        readContract<number>(CONTRACT_ID, 'get_donor_count'),
      ])

      const goal = rawGoal ? BigInt(rawGoal) : BigInt(100_000_000_000)
      const raised = rawRaised ? BigInt(rawRaised) : BigInt(0)
      const donorCount = rawCount ? Number(rawCount) : 0
      const progress = goal > 0n ? Math.min(Number(raised) / Number(goal), 1) : 0

      setCampaign({ goal, raised, donorCount, progress })
    } catch {
      // RPC error — keep current values
    }
  }, [hasContract])

  // Donate via Soroban contract
  const donate = useCallback(
    async (
      senderPublicKey: string,
      amountXLM: number
    ): Promise<{ ok: boolean; hash?: string; error?: string }> => {
      if (!hasContract) {
        return { ok: false, error: 'Contract not deployed yet' }
      }
      if (!signTxXDR) {
        return { ok: false, error: 'Wallet not connected' }
      }
      if (amountXLM <= 0) {
        const msg = 'Please enter a valid amount greater than 0 XLM.'
        setTxState({ status: 'error', message: msg })
        return { ok: false, error: msg }
      }

      try {
        // 1. Build the transaction
        setTxState({ status: 'building' })
        const contract = new Contract(CONTRACT_ID)
        const amountStroops = xlmToStroops(amountXLM)

        const account = await rpcServer.getAccount(senderPublicKey)
        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            contract.call(
              'donate',
              nativeToScVal(senderPublicKey, { type: 'address' }),
              nativeToScVal(amountStroops, { type: 'i128' })
            )
          )
          .setTimeout(180)
          .build()

        // 2. Simulate to get footprint + fee
        const simResult = await rpcServer.simulateTransaction(tx)

        if (SorobanRpc.Api.isSimulationError(simResult)) {
          const errMsg = simResult.error.toLowerCase()
          if (errMsg.includes('underfunded') || errMsg.includes('insufficient')) {
            const msg = 'Insufficient XLM balance for this donation.'
            setTxState({ status: 'error', message: msg, code: 'INSUFFICIENT_BALANCE' })
            return { ok: false, error: msg }
          }
          throw new Error(simResult.error)
        }

        const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build()

        // 3. Sign via wallet
        setTxState({ status: 'awaiting_signature' })
        let signedXDR: string
        try {
          signedXDR = await signTxXDR(preparedTx.toXDR(), NETWORK_PASSPHRASE)
        } catch (sigErr) {
          const sigMsg = sigErr instanceof Error ? sigErr.message : String(sigErr)
          const isRejected =
            sigMsg.toLowerCase().includes('reject') ||
            sigMsg.toLowerCase().includes('cancel') ||
            sigMsg.toLowerCase().includes('denied')

          const msg = isRejected
            ? 'Transaction rejected — you cancelled the signature request.'
            : `Signing failed: ${sigMsg}`
          setTxState({
            status: 'error',
            message: msg,
            code: isRejected ? 'USER_REJECTED' : undefined,
          })
          return { ok: false, error: msg }
        }

        // 4. Submit to network
        setTxState({ status: 'submitting' })
        const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE)
        const sendResult = await rpcServer.sendTransaction(signedTx)

        if (sendResult.status === 'ERROR') {
          throw new Error(`Submit failed: ${JSON.stringify(sendResult.errorResult)}`)
        }

        // 5. Poll for confirmation
        let getResult = await rpcServer.getTransaction(sendResult.hash)
        let attempts = 0
        while (
          getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
          attempts < 20
        ) {
          await new Promise<void>((r) => setTimeout(r, 1500))
          getResult = await rpcServer.getTransaction(sendResult.hash)
          attempts++
        }

        if (getResult.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
          setTxState({ status: 'success', hash: sendResult.hash })
          // Refresh campaign data after a short delay
          setTimeout(fetchCampaignData, 2000)
          return { ok: true, hash: sendResult.hash }
        }

        throw new Error(`Transaction did not confirm: ${getResult.status}`)
      } catch (err) {
        let message = 'Donation failed.'
        let code: string | undefined

        if (err instanceof Error) {
          const m = err.message.toLowerCase()
          if (m.includes('underfunded') || m.includes('insufficient')) {
            message = 'Insufficient XLM balance for this donation.'
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
    },
    [hasContract, signTxXDR, fetchCampaignData]
  )

  const resetTx = useCallback(() => setTxState({ status: 'idle' }), [])

  // Real-time polling — starts on mount, cleans up on unmount
  useEffect(() => {
    if (!hasContract) return
    setIsPolling(true)
    fetchCampaignData()
    pollingRef.current = setInterval(fetchCampaignData, 5_000)
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setIsPolling(false)
    }
  }, [hasContract, fetchCampaignData])

  return {
    campaign,
    txState,
    isPolling,
    hasContract,
    donate,
    resetTx,
    fetchCampaignData,
    CONTRACT_ID,
  }
}
