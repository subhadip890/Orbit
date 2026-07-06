import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

if (import.meta.env.DEV) {
  (window as any).stellarPubkey = {
    isConnected: async () => ({ isConnected: true }),
    isAllowed: async () => ({ isAllowed: true }),
    setAllowed: async () => ({ isAllowed: true }),
    requestAccess: async () => ({ address: 'GCH4CBE74CWK5NIT7BHM5LDOLWVTTTTXMVD5TM3IT4PCCELX24A2AF67' }),
    signTransaction: async (xdr: string) => ({ signedTxXdr: xdr })
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
