import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function useChat(conversationId) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  
  const channelRef = useRef(null)
  const retryTimeoutRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Load messages from Supabase
  const loadMessages = useCallback(async () => {
    if (!conversationId || !user) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          message_status (
            id,
            delivered,
            read,
            delivered_at,
            read_at
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error loading messages:', error)
        return
      }

      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }, [conversationId, user])

  // Send message with reliable delivery
  const sendMessage = useCallback(async (content) => {
    if (!conversationId || !user || !content.trim()) return

    const messageId = crypto.randomUUID()
    const message = {
      id: messageId,
      content: content.trim(),
      sender_id: user.id,
      conversation_id: conversationId,
      created_at: new Date().toISOString()
    }

    try {
      // Save to local storage as pending
      await savePendingMessage(message)

      // Try to send to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert(message)
        .select()
        .single()

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      // Remove from pending messages
      await removePendingMessage(messageId)
      
      // Update local state
      setMessages(prev => [...prev, data])
      
    } catch (error) {
      console.error('Error sending message:', error)
      // Message will be retried on reconnect
    }
  }, [conversationId, user])

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user) return

    try {
      // Get unread messages for this user
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .not('message_status', 'cs', `[{"recipient_id":"${user.id}","read":true}]`)

      if (unreadMessages && unreadMessages.length > 0) {
        // Update message status
        const statusUpdates = unreadMessages.map(msg => ({
          message_id: msg.id,
          recipient_id: user.id,
          read: true,
          read_at: new Date().toISOString()
        }))

        await supabase
          .from('message_status')
          .upsert(statusUpdates, { 
            onConflict: 'message_id,recipient_id' 
          })
      }
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [conversationId, user])

  // Setup realtime subscription
  const setupRealtimeSubscription = useCallback(() => {
    if (!conversationId || !user) return

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Create new channel
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('New message received:', payload.new)
        setMessages(prev => [...prev, payload.new])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'message_status'
      }, (payload) => {
        console.log('Message status updated:', payload.new)
        // Update message status in local state
        setMessages(prev => prev.map(msg => {
          if (msg.id === payload.new.message_id) {
            return {
              ...msg,
              message_status: [payload.new]
            }
          }
          return msg
        }))
      })
      .subscribe((status) => {
        console.log('Channel status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
  }, [conversationId, user])

  // Retry pending messages
  const retryPendingMessages = useCallback(async () => {
    try {
      const pendingMessages = await getPendingMessages()
      
      for (const message of pendingMessages) {
        try {
          const { error } = await supabase
            .from('messages')
            .insert(message)
            .select()
            .single()

          if (!error) {
            await removePendingMessage(message.id)
          }
        } catch (error) {
          console.error('Error retrying message:', error)
        }
      }
    } catch (error) {
      console.error('Error retrying pending messages:', error)
    }
  }, [])

  // Local storage helpers
  const savePendingMessage = async (message) => {
    try {
      const pending = await getPendingMessages()
      pending.push(message)
      await AsyncStorage.setItem('pending_messages', JSON.stringify(pending))
    } catch (error) {
      console.error('Error saving pending message:', error)
    }
  }

  const getPendingMessages = async () => {
    try {
      const pending = await AsyncStorage.getItem('pending_messages')
      return pending ? JSON.parse(pending) : []
    } catch (error) {
      console.error('Error getting pending messages:', error)
      return []
    }
  }

  const removePendingMessage = async (messageId) => {
    try {
      const pending = await getPendingMessages()
      const filtered = pending.filter(msg => msg.id !== messageId)
      await AsyncStorage.setItem('pending_messages', JSON.stringify(filtered))
    } catch (error) {
      console.error('Error removing pending message:', error)
    }
  }

  // Handle connection state changes
  useEffect(() => {
    const handleConnectionChange = () => {
      if (isConnected) {
        retryPendingMessages()
      }
    }

    handleConnectionChange()
  }, [isConnected, retryPendingMessages])

  // Initialize chat
  useEffect(() => {
    if (conversationId && user) {
      loadMessages()
      setupRealtimeSubscription()
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [conversationId, user, loadMessages, setupRealtimeSubscription])

  return {
    messages,
    loading,
    sendMessage,
    markAsRead,
    typingUsers,
    isConnected
  }
}
