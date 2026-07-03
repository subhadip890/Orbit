/**
 * useTransaction.ts
 * XLM transfer logic — build, sign via Freighter v6, and submit to Horizon.
 * All Stellar SDK operations are isolated here.
 *
 * Freighter v6: signTransaction(txXDR, opts) → { signedTxXdr, signerAddress, error? }
 */
import { useState, useCallback } from 'react'
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  BASE_FEE,
} from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

const HORIZON_URL = import.meta.env.VITE_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || Networks.TESTNET
const CAMPAIGN_ADDRESS =
  import.meta.env.VITE_CAMPAIGN_ADDRESS ||
  'GCKFBEIYV2U22IO2BJ4KVJOIP7XPWQGQFKKWXR6DUSVTFHJDQB7C554'

const server = new Horizon.Server(HORIZON_URL)

export type TxState =
  | { status: 'idle' }
  | { status: 'building' }
  | { status: 'awaiting_signature' }
  | { status: 'submitting' }
  | { status: 'success'; hash: string }
  | { status: 'error'; message: string; code?: string }

export type DonationResult =
  | { ok: true; hash: string }
  | { ok: false; error: string }

export function useTransaction() {
  const [txState, setTxState] = useState<TxState>({ status: 'idle' })

  const sendDonation = useCallback(
    async (senderPublicKey: string, amountXLM: string): Promise<DonationResult> => {
      // Input validation
      const amount = parseFloat(amountXLM)
      if (isNaN(amount) || amount <= 0) {
        const msg = 'Please enter a valid amount greater than 0 XLM.'
        setTxState({ status: 'error', message: msg })
        return { ok: false, error: msg }
      }

      try {
        // 1. Build transaction
        setTxState({ status: 'building' })
        const account = await server.loadAccount(senderPublicKey)

        const tx = new TransactionBuilder(account, {
          fee: BASE_FEE,
          networkPassphrase: NETWORK_PASSPHRASE,
        })
          .addOperation(
            Operation.payment({
              destination: CAMPAIGN_ADDRESS,
              asset: Asset.native(),
              amount: amount.toFixed(7),
            })
          )
          .setTimeout(180)
          .build()

        const txXDR = tx.toXDR()

        // 2. Sign via Freighter v6 — opens extension popup for user approval
        setTxState({ status: 'awaiting_signature' })
        let signedTxXdr: string

        try {
          const signResult = await signTransaction(txXDR, {
            networkPassphrase: NETWORK_PASSPHRASE,
          })

          if (signResult.error) {
            const errMsg = String(signResult.error)
            const isRejected =
              errMsg.toLowerCase().includes('reject') ||
              errMsg.toLowerCase().includes('denied') ||
              errMsg.toLowerCase().includes('cancel') ||
              errMsg.toLowerCase().includes('user declined')

            const msg = isRejected
              ? 'Transaction rejected — you cancelled the signature request.'
              : `Signing failed: ${errMsg}`
            const code = isRejected ? 'USER_REJECTED' : undefined
            setTxState({ status: 'error', message: msg, code })
            return { ok: false, error: msg }
          }

          signedTxXdr = signResult.signedTxXdr
        } catch (sigErr) {
          const sigMsg = sigErr instanceof Error ? sigErr.message : String(sigErr)
          const isRejected =
            sigMsg.toLowerCase().includes('reject') ||
            sigMsg.toLowerCase().includes('denied') ||
            sigMsg.toLowerCase().includes('cancel')

          const msg = isRejected
            ? 'Transaction rejected — you cancelled the signature request.'
            : `Signing error: ${sigMsg}`
          const code = isRejected ? 'USER_REJECTED' : undefined
          setTxState({ status: 'error', message: msg, code })
          return { ok: false, error: msg }
        }

        // 3. Submit signed transaction to Horizon
        setTxState({ status: 'submitting' })
        const signedTx = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
        const response = await server.submitTransaction(signedTx)

        setTxState({ status: 'success', hash: response.hash })
        return { ok: true, hash: response.hash }
      } catch (err) {
        let message = 'Transaction failed.'
        let code: string | undefined

        if (err instanceof Error) {
          const msg = err.message
          if (msg.includes('op_underfunded') || msg.includes('INSUFFICIENT_BALANCE')) {
            message = 'Insufficient XLM balance to complete this donation.'
            code = 'INSUFFICIENT_BALANCE'
          } else if (msg.includes('op_low_reserve')) {
            message = 'This would drop your balance below the minimum reserve (1 XLM).'
            code = 'LOW_RESERVE'
          } else if (msg.includes('tx_bad_seq')) {
            message = 'Sequence mismatch — please refresh and try again.'
            code = 'BAD_SEQ'
          } else {
            message = msg
          }
        }

        setTxState({ status: 'error', message, code })
        return { ok: false, error: message }
      }
    },
    []
  )

  const resetTx = useCallback(() => {
    setTxState({ status: 'idle' })
  }, [])

  return {
    txState,
    sendDonation,
    resetTx,
    campaignAddress: CAMPAIGN_ADDRESS,
  }
}
