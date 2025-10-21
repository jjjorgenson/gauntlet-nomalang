import { Text, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { router } from 'expo-router';
import { useEffect } from 'react';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect to main app
        router.replace('/(main)');
      } else {
        // User is not authenticated, redirect to login
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Welcome to NomaLang!</Text>
    </View>
  );
}
