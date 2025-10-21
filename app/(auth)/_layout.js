import { Stack } from 'expo-router'
import { useAuth } from '../../lib/auth'
import { useEffect } from 'react'
import { router } from 'expo-router'

export default function AuthLayout() {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect to main app
        router.replace('/(main)')
      }
      // If not authenticated, stay on auth screens
    }
  }, [user, loading])

  if (loading) {
    return null // Or a loading screen
  }

  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
          headerShown: false
        }}
      />
      <Stack.Screen
        name="signup"
        options={{
          title: 'Create Account',
          headerShown: false
        }}
      />
    </Stack>
  )
}
