'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// AI is now at the top of the chat list as "Assistant" - redirect to chat with assistant open
export default function AIPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/chat?assistant=1')
  }, [router])
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Redirecting to Assistant...</div>
    </div>
  )
}
