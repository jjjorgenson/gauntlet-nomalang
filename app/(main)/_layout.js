import { Stack } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { useEffect } from 'react'
import { router } from 'expo-router'

export default function MainLayout() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      // User is not authenticated, redirect to login
      router.replace('/(auth)/login')
    }
  }, [user, loading])

  if (loading) {
    return null // Or a loading screen
  }

  if (!user) {
    return null // Will redirect
  }

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'NomaLang Chat',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="chat"
        options={{
          title: 'Chat',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="conversation"
        options={{
          title: 'Conversation',
          headerShown: true
        }}
      />
      <Stack.Screen
        name="new-chat"
        options={{
          title: 'New Chat',
          headerShown: true
        }}
      />
    </Stack>
  )
}
