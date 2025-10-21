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
    </Stack>
  )
}
