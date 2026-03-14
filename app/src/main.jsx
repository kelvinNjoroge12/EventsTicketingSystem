import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import './index.css'
import App from './App.jsx'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes standard freshness
      refetchOnWindowFocus: false, // Don't refetch just because user tabbed away and back
      retry: 1, // Only retry failed requests once
      gcTime: 1000 * 60 * 60 * 24, // keep cache for 24h (pairs with persistence)
    },
  },
})

const persister = createSyncStoragePersister({
  storage: window.sessionStorage,
  key: 'eventhub-cache-v2',
  throttleTime: 1000,
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
