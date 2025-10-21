import { Stack } from 'expo-router'
import { AuthProvider } from '../lib/auth'

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="(main)"
          options={{
            headerShown: false
          }}
        />
      </Stack>
    </AuthProvider>
  )
}
