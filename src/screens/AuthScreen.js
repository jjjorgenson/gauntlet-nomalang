import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  TextInput, 
  Button, 
  Paragraph,
  Switch,
  Divider,
  IconButton
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isLogin && !username) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await signIn(email, password);
        if (error) {
          Alert.alert('Sign In Error', error.message);
        }
      } else {
        const { data, error } = await signUp(email, password, {
          username,
          native_language: nativeLanguage,
        });
        if (error) {
          Alert.alert('Sign Up Error', error.message);
        } else {
          Alert.alert('Success', 'Please check your email to verify your account');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>
            {isLogin ? 'Welcome Back' : 'Join NomaLang'}
          </Title>
          <Paragraph style={styles.subtitle}>
            {isLogin 
              ? 'Sign in to continue your conversations' 
              : 'Start connecting across languages'
            }
          </Paragraph>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            mode="outlined"
            autoComplete="email"
            textColor="#1F2937"
            activeOutlineColor="#8B5CF6"
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            autoComplete="password"
            textColor="#1F2937"
            activeOutlineColor="#8B5CF6"
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />

          {!isLogin && (
            <>
              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                mode="outlined"
                autoComplete="username"
                textColor="#1F2937"
                activeOutlineColor="#8B5CF6"
              />

              <TextInput
                label="Native Language"
                value={nativeLanguage}
                onChangeText={setNativeLanguage}
                style={styles.input}
                mode="outlined"
                placeholder="en, es, fr, de, etc."
                autoComplete="off"
                textColor="#1F2937"
                activeOutlineColor="#8B5CF6"
              />
            </>
          )}

          <Button
            mode="contained"
            onPress={handleAuth}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </Button>

          <Divider style={styles.divider} />

          <Button
            mode="text"
            onPress={() => setIsLogin(!isLogin)}
            style={styles.switchButton}
          >
            {isLogin 
              ? "Don't have an account? Sign Up" 
              : 'Already have an account? Sign In'
            }
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    color: '#1F2937',
    marginBottom: 8,
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    color: '#6B7280',
    marginBottom: 24,
    fontSize: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  button: {
    marginTop: 8,
    backgroundColor: '#8B5CF6',
  },
  divider: {
    marginVertical: 16,
    backgroundColor: '#E5E7EB',
  },
  switchButton: {
    marginTop: 8,
  },
});
