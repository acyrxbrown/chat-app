'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'
import { format } from 'date-fns'
import ThemeToggle from '@/components/ThemeToggle'

interface Status {
  id: string
  user_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  expires_at: string
  created_at: string
  user?: Profile
  view_count?: number
  has_viewed?: boolean
}

export default function StatusPage() {
  const [user, setUser] = useState<any>(null)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [myStatuses, setMyStatuses] = useState<Status[]>([])
  const [selectedStatus, setSelectedStatus] = useState<Status | null>(null)
  const [viewingIndex, setViewingIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.push('/')
        return
      }

      setUser(session.user)
      await fetchStatuses(session.user.id)
      setLoading(false)
    }

    loadData()
  }, [router])

  const fetchStatuses = async (userId: string) => {
    try {
      // Get all statuses from contacts (people you chat with)
      const { data: allStatuses } = await supabase
        .from('status')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (!allStatuses) return

      // Get user profiles and view counts
      const statusesWithData = await Promise.all(
        allStatuses.map(async (status) => {
          const [profile, views, myView] = await Promise.all([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', status.user_id)
              .single(),
            supabase
              .from('status_views')
              .select('id', { count: 'exact' })
              .eq('status_id', status.id),
            supabase
              .from('status_views')
              .select('id')
              .eq('status_id', status.id)
              .eq('viewer_id', userId)
              .single(),
          ])

          return {
            ...status,
            user: profile.data || undefined,
            view_count: views.count || 0,
            has_viewed: !!myView.data,
          }
        })
      )

      // Separate my statuses and others
      const my = statusesWithData.filter((s) => s.user_id === userId)
      const others = statusesWithData.filter((s) => s.user_id !== userId)

      setMyStatuses(my)
      setStatuses(others)
    } catch (error) {
      console.error('Error fetching statuses:', error)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setUploadFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setUploadPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      } else {
        alert('Please select an image or video file')
      }
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return

    setUploading(true)
    try {
      const fileExt = uploadFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `status/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('status-media')
        .upload(filePath, uploadFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('status-media')
        .getPublicUrl(filePath)

      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // Status expires in 24 hours

      const { error: insertError } = await supabase.from('status').insert({
        user_id: user.id,
        media_url: publicUrl,
        media_type: uploadFile.type.startsWith('video/') ? 'video' : 'image',
        caption: caption.trim() || null,
        expires_at: expiresAt.toISOString(),
      })

      if (insertError) throw insertError

      setShowUploadModal(false)
      setUploadFile(null)
      setUploadPreview(null)
      setCaption('')
      await fetchStatuses(user.id)
    } catch (error) {
      console.error('Error uploading status:', error)
      alert('Failed to upload status')
    } finally {
      setUploading(false)
    }
  }

  const handleViewStatus = async (status: Status) => {
    if (!user || status.has_viewed) return

    try {
      await supabase.from('status_views').insert({
        status_id: status.id,
        viewer_id: user.id,
      })

      setStatuses((prev) =>
        prev.map((s) =>
          s.id === status.id ? { ...s, has_viewed: true, view_count: (s.view_count || 0) + 1 } : s
        )
      )
    } catch (error) {
      console.error('Error recording view:', error)
    }
  }

  const handleDeleteStatus = async (statusId: string) => {
    if (!confirm('Are you sure you want to delete this status?')) return

    try {
      const { error } = await supabase.from('status').delete().eq('id', statusId)

      if (error) throw error

      setMyStatuses((prev) => prev.filter((s) => s.id !== statusId))
    } catch (error) {
      console.error('Error deleting status:', error)
      alert('Failed to delete status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/chat')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold dark:text-white">Status</h1>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              >
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        {/* My Status */}
        {myStatuses.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 dark:text-white">My Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {myStatuses.map((status) => (
                <div key={status.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                    {status.media_type === 'image' ? (
                      <img
                        src={status.media_url}
                        alt="Status"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <video
                        src={status.media_url}
                        className="w-full h-full object-cover"
                        controls
                      />
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteStatus(status.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <p>{status.view_count || 0} views</p>
                    <p>{format(new Date(status.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Others Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4 dark:text-white">Recent Updates</h2>
          {statuses.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">No status updates</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => {
                    setSelectedStatus(status)
                    setViewingIndex(0)
                    handleViewStatus(status)
                  }}
                  className="w-full flex items-center space-x-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
                >
                  <div className="relative">
                    {status.user?.avatar_url ? (
                      <img
                        src={status.user.avatar_url}
                        alt={status.user.full_name || ''}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {(status.user?.full_name || status.user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!status.has_viewed && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold dark:text-white">
                      {status.user?.full_name || status.user?.email || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(status.created_at), 'MMM d, h:mm a')}
                    </p>
                    {status.caption && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{status.caption}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Create Status</h2>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!uploadPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors"
              >
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600">Click to select image or video</p>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  {uploadFile?.type.startsWith('video/') ? (
                    <video src={uploadPreview} className="w-full rounded-lg" controls />
                  ) : (
                    <img src={uploadPreview} alt="Preview" className="w-full rounded-lg" />
                  )}
                  <button
                    onClick={() => {
                      setUploadPreview(null)
                      setUploadFile(null)
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            )}

            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadPreview(null)
                  setUploadFile(null)
                  setCaption('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!uploadFile || uploading}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Viewer Modal */}
      {selectedStatus && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setSelectedStatus(null)}
            className="absolute top-4 left-4 text-white p-2 hover:bg-white hover:bg-opacity-20 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-2xl w-full p-4">
            {selectedStatus.media_type === 'image' ? (
              <img
                src={selectedStatus.media_url}
                alt="Status"
                className="w-full rounded-lg"
              />
            ) : (
              <video
                src={selectedStatus.media_url}
                className="w-full rounded-lg"
                controls
                autoPlay
              />
            )}
            {selectedStatus.caption && (
              <p className="text-white mt-4 text-center">{selectedStatus.caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}

