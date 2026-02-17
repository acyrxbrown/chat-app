import { supabase } from './supabase'
import { Notification } from './types'

export async function requestNotificationPermission() {
  if (typeof window === 'undefined') return
  
  if ('Notification' in window && typeof Notification !== 'undefined') {
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error)
    }
  }
}

export async function showBrowserNotification(title: string, body: string, icon?: string) {
  if (typeof window === 'undefined') return
  
  if ('Notification' in window && typeof Notification !== 'undefined') {
    try {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          badge: '/favicon.ico',
        })
      }
    } catch (error) {
      console.error('Error showing browser notification:', error)
    }
  }
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data || []
}

export async function markNotificationAsRead(notificationId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
}

export async function markAllNotificationsAsRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false)
}

export function subscribeToNotifications(
  userId: string,
  onNotification: (notification: Notification) => void
) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as Notification
        onNotification(notification)
        
        // Show browser notification
        showBrowserNotification(notification.title, notification.body || '')
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
