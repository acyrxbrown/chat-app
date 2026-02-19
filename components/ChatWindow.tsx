'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Message, Chat, Profile } from '@/lib/types'
import { format, isSameDay, isToday, isYesterday } from 'date-fns'
import AddParticipantsModal from './AddParticipantsModal'
import EmojiPicker from './EmojiPicker'
import ReplyPreview from './ReplyPreview'
import GifPicker from './GifPicker'
import StickerPicker from './StickerPicker'
import { uploadFile, getFileType } from '@/lib/storage'
import { requestNotificationPermission } from '@/lib/notifications'
import { detectAITag, extractAIPrompt, getAIResponse } from '@/lib/ai'

const ASSISTANT_EMAIL = 'assistant@ai.local'

interface ChatWindowProps {
  chatId: string
  userId: string
  onShowProfile?: () => void
}

export default function ChatWindow({ chatId, userId, onShowProfile }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [chat, setChat] = useState<Chat | null>(null)
  const [otherParticipant, setOtherParticipant] = useState<Profile | null>(null)
  const [participantsCount, setParticipantsCount] = useState(0)
  const [newMessage, setNewMessage] = useState('')
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showAddParticipants, setShowAddParticipants] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single()

      if (error) throw error
      setChat(data)

      // Get participants
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)

      setParticipantsCount(participants?.length || 0)

      // Get other participant for direct chats
      if (data.type === 'direct') {
        const otherUserId = participants?.find(p => p.user_id !== userId)?.user_id
        if (otherUserId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single()
          setOtherParticipant(profile || null)
        }
      }
    } catch (error) {
      console.error('Error fetching chat:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      // Fetch messages (simple select avoids FK/relation issues with profiles)
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const raw = Array.isArray(messagesData) ? messagesData : []
      const ordered = [...raw].reverse()

      const senderIds = Array.from(new Set(raw.map((m: any) => m.sender_id).filter(Boolean)))
      const profilesMap: Record<string, any> = {}
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds)
        if (profiles) profiles.forEach((p: any) => { profilesMap[p.id] = p })
      }

      const messageById: Record<string, any> = {}
      raw.forEach((m: any) => { messageById[m.id] = m })

      const messagesWithData = ordered.map((message: any) => {
        const sender = profilesMap[message.sender_id]
        const repliedRaw = message.reply_to ? messageById[message.reply_to] : null
        const replied_to_message = repliedRaw
          ? { ...repliedRaw, sender: profilesMap[repliedRaw.sender_id] || undefined }
          : undefined
        return {
          ...message,
          sender: sender || undefined,
          replied_to_message,
        }
      })

      setMessages(messagesWithData)
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!chatId) return

    setLoading(true)
    setMessages([])
    setChat(null)
    setOtherParticipant(null)

    fetchChat()
    fetchMessages()
    requestNotificationPermission()

    // Subscribe to new messages
    const messageSubscription = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.deleted_at) return // Skip deleted messages
          
          // Fetch sender and replied-to message
          const [sender, repliedTo] = await Promise.all([
            supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .single(),
            newMsg.reply_to
              ? supabase
                  .from('messages')
                  .select('*, sender:profiles!messages_sender_id_fkey(*)')
                  .eq('id', newMsg.reply_to)
                  .single()
              : Promise.resolve({ data: null }),
          ])

          const repliedToMessage = repliedTo.data
            ? {
                ...repliedTo.data,
                sender: repliedTo.data.sender || undefined,
              }
            : undefined

          setMessages((prev) => [
            ...prev,
            {
              ...newMsg,
              sender: sender.data || undefined,
              replied_to_message: repliedToMessage,
            },
          ])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message
          if (updatedMsg.deleted_at) {
            // Remove deleted message from UI
            setMessages((prev) => prev.filter((msg) => msg.id !== updatedMsg.id))
          } else {
            // Update message in UI
            setMessages((prev) =>
              prev.map((msg) => (msg.id === updatedMsg.id ? { ...msg, ...updatedMsg } : msg))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
    }
  }, [chatId])

  const handleSendMessage = async (e?: React.FormEvent, messageType: Message['message_type'] = 'text', fileData?: { url: string; name: string; size: number; type: string }) => {
    e?.preventDefault()
    if ((!newMessage.trim() && !fileData) || sending || uploadingFile) return

    const messageContent = newMessage.trim() || (messageType === 'gif' ? 'GIF' : messageType === 'sticker' ? 'Sticker' : 'File')
    const isAITagged = detectAITag(messageContent)

    setSending(true)
    try {
      const messageData: any = {
        chat_id: chatId,
        sender_id: userId,
        content: messageContent,
        message_type: messageType,
        reply_to: replyingTo?.id || null,
      }

      if (fileData) {
        messageData.file_url = fileData.url
        messageData.file_name = fileData.name
        messageData.file_size = fileData.size
        messageData.file_type = fileData.type
      }

      const { error } = await supabase.from('messages').insert(messageData)

      if (error) throw error

      // Update chat's updated_at timestamp
      await supabase
        .from('chats')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatId)

      setNewMessage('')
      setReplyingTo(null)
      setShowEmojiPicker(false)
      setShowGifPicker(false)
      setShowStickerPicker(false)

      // If message contains @assistant tag, get AI response
      if (isAITagged) {
        try {
          const aiPrompt = extractAIPrompt(messageContent)
          
          // Get recent messages for context (last 10 messages)
          const recentMessages = messages.slice(-10)
          const chatHistory = recentMessages.map(msg => ({
            role: msg.sender_id === userId ? 'user' : 'assistant',
            content: msg.content,
          }))

          const aiResponse = await getAIResponse(aiPrompt, chatHistory)

          // Look up assistant user ID by email
          const { data: assistantProfile, error: assistantError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', ASSISTANT_EMAIL)
            .single()

          if (assistantError || !assistantProfile) {
            console.error('Assistant profile not found:', assistantError)
            return
          }

          // Insert AI response as a message using the assistant's ID from the database
          const aiMessageData: any = {
            chat_id: chatId,
            sender_id: assistantProfile.id,
            content: aiResponse,
            message_type: 'text',
          }

          const { error: aiError } = await supabase.from('messages').insert(aiMessageData)

          if (aiError) {
            console.error('Error inserting AI message:', aiError)
            // If AI user doesn't exist, create a placeholder message
            // For now, we'll just log the error
          }

          // Update chat's updated_at timestamp
          await supabase
            .from('chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId)
        } catch (aiError) {
          console.error('Error getting AI response:', aiError)
          // Don't show error to user, just log it
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true)
    try {
      const uploadResult = await uploadFile(file, chatId, userId)
      if (!uploadResult) {
        alert('Failed to upload file')
        return
      }

      const fileType = getFileType(file.name)
      await handleSendMessage(undefined, fileType, {
        url: uploadResult.url,
        name: file.name,
        size: file.size,
        type: file.type,
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return

    setDeletingMessageId(messageId)
    try {
      const { error } = await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('sender_id', userId) // Only allow deleting own messages

      if (error) throw error

      // Remove from UI immediately
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
    } catch (error) {
      console.error('Error deleting message:', error)
      alert('Failed to delete message')
    } finally {
      setDeletingMessageId(null)
    }
  }

  const handleGifSelect = (gifUrl: string) => {
    handleSendMessage(undefined, 'gif', {
      url: gifUrl,
      name: 'gif',
      size: 0,
      type: 'image/gif',
    })
  }

  const handleStickerSelect = (sticker: string) => {
    handleSendMessage(undefined, 'sticker', {
      url: sticker,
      name: 'sticker',
      size: 0,
      type: 'text/plain',
    })
  }

  const handleEmojiClick = (emoji: string) => {
    setNewMessage((prev) => prev + emoji)
    inputRef.current?.focus()
  }

  const formatDateSeparator = (date: Date) => {
    if (isToday(date)) {
      return 'Today'
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'MMM d, yyyy')
    }
  }

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true
    return !isSameDay(new Date(currentMessage.created_at), new Date(previousMessage.created_at))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Chat not found</div>
      </div>
    )
  }

  const chatName = chat.type === 'group' 
    ? chat.name 
    : otherParticipant?.full_name || otherParticipant?.email || 'Unknown User'

  const chatAvatar = chat.type === 'group' 
    ? null 
    : otherParticipant?.avatar_url

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Chat Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <button
            onClick={() => {}}
            className="p-2 hover:bg-gray-100 rounded-full lg:hidden"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          {chatAvatar ? (
            <img
              src={chatAvatar ?? ''}
              alt={chatName ?? 'Chat'}
              className="w-10 h-10 rounded-full object-cover cursor-pointer"
              onClick={onShowProfile}
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold cursor-pointer"
              onClick={onShowProfile}
            >
              {(chatName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          
          <div className="flex-1 min-w-0" onClick={onShowProfile}>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">{chatName ?? 'Chat'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {chat.type === 'group' ? `${participantsCount} participants` : 'Last seen 10 min ago'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          {chat.type === 'group' && (
            <button
              onClick={() => setShowAddParticipants(true)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          <button 
            onClick={onShowProfile}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwn = message.sender_id === userId
            const isAI = message.sender?.email === ASSISTANT_EMAIL
            const previousMessage = index > 0 ? messages[index - 1] : null
            const showDateSeparator = shouldShowDateSeparator(message, previousMessage)
            const showAvatar = (!isOwn && !isAI) && chat.type === 'group' && 
              (index === 0 || !previousMessage || previousMessage.sender_id !== message.sender_id)

            return (
              <div key={message.id}>
                {showDateSeparator && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-full">
                      {formatDateSeparator(new Date(message.created_at))}
                    </span>
                  </div>
                )}
                
                <div 
                  className={`flex items-end space-x-2 group ${isOwn ? 'justify-end' : 'justify-start'}`}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setReplyingTo(message)
                  }}
                >
                  {showAvatar && (
                    <img
                      src={message.sender?.avatar_url || ''}
                      alt={message.sender?.full_name || ''}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  )}
                  {!showAvatar && !isOwn && chat.type === 'group' && <div className="w-6" />}
                  
                  <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                    {!isOwn && chat.type === 'group' && (
                      <span className="text-xs text-gray-600 dark:text-gray-300 mb-1 px-2">
                        {message.sender?.full_name || message.sender?.email || 'Unknown'}
                      </span>
                    )}
                    
                    <div
                      className={`relative px-3 py-2 rounded-lg group ${
                        isOwn
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
                      }`}
                    >
                      {/* Delete button for own messages */}
                      {isOwn && (
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                          className="absolute -left-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded-full transition-opacity disabled:opacity-50"
                          title="Delete message"
                        >
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      
                      {/* Reply button */}
                      <button
                        onClick={() => setReplyingTo(message)}
                        className="absolute -right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full transition-opacity"
                        title="Reply"
                      >
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>
                      {/* Reply Preview */}
                      {message.replied_to_message && (
                        <div
                          className={`mb-2 pb-2 border-l-4 pl-2 ${
                            isOwn ? 'border-blue-300' : 'border-gray-300'
                          }`}
                        >
                          <p className={`text-xs font-semibold ${
                            isOwn ? 'text-blue-100' : 'text-gray-600'
                          }`}>
                            {message.replied_to_message.sender?.full_name || 
                             message.replied_to_message.sender?.email || 
                             'Unknown'}
                          </p>
                          <p className={`text-xs truncate ${
                            isOwn ? 'text-blue-200' : 'text-gray-500'
                          }`}>
                            {message.replied_to_message.content}
                          </p>
                        </div>
                      )}
                      
                      {/* Message Content Based on Type */}
                      {message.message_type === 'gif' && message.file_url && (
                        <img
                          src={message.file_url}
                          alt="GIF"
                          className="max-w-xs rounded-lg"
                        />
                      )}
                      {message.message_type === 'sticker' && (
                        <div className="text-6xl">{message.content}</div>
                      )}
                      {message.message_type === 'image' && message.file_url && (
                        <img
                          src={message.file_url}
                          alt={message.file_name || 'Image'}
                          className="max-w-xs rounded-lg cursor-pointer"
                          onClick={() => window.open(message.file_url!, '_blank')}
                        />
                      )}
                      {message.message_type === 'file' && message.file_url && (
                        <a
                          href={message.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 p-2 bg-black bg-opacity-10 rounded hover:bg-opacity-20"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{message.file_name || 'File'}</p>
                            {message.file_size && (
                              <p className="text-xs opacity-75">
                                {(message.file_size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                        </a>
                      )}
                      {message.message_type === 'text' && (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content.split(/(@assistant\b)/gi).map((part, index) =>
                            /@assistant\b/i.test(part) ? (
                              <span key={index} className="text-blue-500 font-semibold">
                                {part}
                              </span>
                            ) : (
                              <span key={index}>{part}</span>
                            )
                          )}
                        </p>
                      )}
                       <div className={`flex items-center justify-end space-x-1 mt-1 ${
                         isOwn ? 'text-blue-100' : isAI ? 'text-purple-100' : 'text-gray-500'
                       }`}>
                         <span className="text-xs">
                           {format(new Date(message.created_at), 'h:mm a')}
                         </span>
                         {isOwn && (
                           <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                         )}
                       </div>
                    </div>
                    
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <ReplyPreview
          message={replyingTo}
          onClose={() => setReplyingTo(null)}
        />
      )}

      {/* Message Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={(e) => handleSendMessage(e)} className="flex items-end space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                handleFileUpload(file)
              }
              e.target.value = '' // Reset input
            }}
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
          
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={() => {
                setShowGifPicker(!showGifPicker)
                setShowStickerPicker(false)
                setShowEmojiPicker(false)
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              title="GIF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowStickerPicker(!showStickerPicker)
                setShowGifPicker(false)
                setShowEmojiPicker(false)
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              title="Sticker"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFile}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full disabled:opacity-50"
              title="Attach file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message or @assistant to ask AI"
              className="w-full px-4 py-2 pr-10 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              onFocus={() => {
                setShowEmojiPicker(false)
                setShowGifPicker(false)
                setShowStickerPicker(false)
              }}
            />
            <div className="absolute right-2 bottom-2">
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker)
                  setShowGifPicker(false)
                  setShowStickerPicker(false)
                }}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <div className="relative">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                />
                <GifPicker
                  onGifSelect={handleGifSelect}
                  isOpen={showGifPicker}
                  onClose={() => setShowGifPicker(false)}
                />
                <StickerPicker
                  onStickerSelect={handleStickerSelect}
                  isOpen={showStickerPicker}
                  onClose={() => setShowStickerPicker(false)}
                />
              </div>
            </div>
          </div>
          
          {(newMessage.trim() || uploadingFile) ? (
            <button
              type="submit"
              disabled={sending || uploadingFile}
              className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {uploadingFile ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          ) : null}
        </form>
      </div>

      {showAddParticipants && (
        <AddParticipantsModal
          chatId={chatId}
          onClose={() => setShowAddParticipants(false)}
        />
      )}
    </div>
  )
}
