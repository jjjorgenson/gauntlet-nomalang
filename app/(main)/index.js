import { Button, View, Text } from 'react-native'
import { useAuth, signOut } from '../../lib/auth'

export default function MainScreen() {
  const { user } = useAuth()

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome, {user?.email}</Text>
      <Button title="Logout" onPress={signOut} />
    </View>
  )
}
