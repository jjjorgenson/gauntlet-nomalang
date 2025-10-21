import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Surface, Text, Button, Card, ActivityIndicator } from 'react-native-paper'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function VerifyEmailScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadStoredEmail()
  }, [])

  const loadStoredEmail = async () => {
    try {
      const storedEmail = await AsyncStorage.getItem('signup_email')
      if (storedEmail) {
        setEmail(storedEmail)
      }
    } catch (error) {
      console.error('Error loading stored email:', error)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setMessage('No email found. Please try signing up again.')
      return
    }

    try {
      setResendLoading(true)
      setMessage('')

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage('Verification email sent! Check your inbox.')
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleBackToLogin = () => {
    router.replace('/(auth)/login')
  }

  return (
    <Surface style={styles.container} elevation={4}>
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Text variant="headlineMedium" style={styles.title}>
              Check Your Email
            </Text>
            
            <Text variant="bodyLarge" style={styles.subtitle}>
              We've sent a verification link to:
            </Text>
            
            <Text variant="bodyMedium" style={styles.email}>
              {email || 'Loading...'}
            </Text>
            
            <Text variant="bodyMedium" style={styles.instructions}>
              Click the link in your email to verify your account and start chatting!
            </Text>

            {message && (
              <Text 
                variant="bodyMedium" 
                style={[
                  styles.message,
                  message.includes('Error') ? styles.errorMessage : styles.successMessage
                ]}
              >
                {message}
              </Text>
            )}

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handleResendVerification}
                loading={resendLoading}
                disabled={resendLoading || !email}
                style={styles.button}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </Button>

              <Button
                mode="outlined"
                onPress={handleBackToLogin}
                style={styles.button}
              >
                Back to Login
              </Button>
            </View>
          </Card.Content>
        </Card>
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
  card: {
    elevation: 8,
  },
  cardContent: {
    alignItems: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#2E7D32',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.8,
  },
  email: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1976D2',
  },
  instructions: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
    lineHeight: 20,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  successMessage: {
    backgroundColor: '#E8F5E8',
    color: '#2E7D32',
  },
  errorMessage: {
    backgroundColor: '#FFEBEE',
    color: '#C62828',
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    marginBottom: 12,
    paddingVertical: 8,
  },
})
