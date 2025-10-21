import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { TextInput, Button, Text, Surface, ActivityIndicator } from 'react-native-paper'
import { Link, router } from 'expo-router'
import { useAuth } from '../../lib/auth'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }

    console.log({ email, password })
    setLoading(true)
    try {
      const { data, error } = await signIn(email, password)

      if (error) {
        Alert.alert('Error', error.message)
      }
      // Success is handled by AuthProvider's onAuthStateChange
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Surface style={styles.container} elevation={4}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome to NomaLang
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Sign in to continue
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          style={styles.input}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          autoComplete="password"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSignIn}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">
            Don't have an account?{' '}
            <Link href="/(auth)/signup" style={styles.link}>
              Sign up
            </Link>
          </Text>
        </View>
      </View>
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    opacity: 0.7,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 8,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  link: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
})
