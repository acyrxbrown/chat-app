'use client'

import { ReactNode, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

interface QueryProviderProps {
  children: ReactNode
}

export default function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60,
            gcTime: 1000 * 60 * 60,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  const [persister, setPersister] = useState<
    ReturnType<typeof createSyncStoragePersister> | null
  >(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPersister(
        createSyncStoragePersister({
          storage: window.localStorage,
          key: 'chat-app-query-cache',
        })
      )
    }
  }, [])

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  )
}

