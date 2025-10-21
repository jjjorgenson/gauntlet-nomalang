import React, { useState } from 'react'
import { View, StyleSheet, Alert } from 'react-native'
import { TextInput, Button, Text, Surface } from 'react-native-paper'
import { Link, router } from 'expo-router'
import { useAuth } from '../../lib/auth'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password')
      return
    }

    if (!displayName) {
      Alert.alert('Error', 'Please enter display name')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    console.log({ email, password, displayName })
    setLoading(true)
    try {
      const { data, error } = await signUp(email, password, displayName)

      if (error) {
        Alert.alert('Error', error.message)
      } else {
        Alert.alert(
          'Success',
          'Account created! Please check your email for confirmation link.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        )
      }
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
          Create Account
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Join NomaLang today
        </Text>

        <TextInput
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          mode="outlined"
          autoCapitalize="words"
          style={styles.input}
        />

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
          autoComplete="password-new"
          style={styles.input}
        />

        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          secureTextEntry
          autoComplete="password-new"
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSignUp}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <View style={styles.footer}>
          <Text variant="bodyMedium">
            Already have an account?{' '}
            <Link href="/(auth)/login" style={styles.link}>
              Sign in
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
