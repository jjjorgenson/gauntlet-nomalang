import { Button, View, Text } from 'react-native'
import { useAuth, signOut } from '../../lib/auth'
import { router } from 'expo-router'

export default function MainScreen() {
  const { user } = useAuth()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome, {user?.email}</Text>
      <Button 
        title="Go to Chat" 
        onPress={() => router.push('/(main)/chat')}
        style={{ marginBottom: 10 }}
      />
      <Button title="Logout" onPress={signOut} />
    </View>
  )
}
