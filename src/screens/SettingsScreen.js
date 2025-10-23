import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Switch, 
  List, 
  Button,
  Divider,
  Text
} from 'react-native-paper';

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // TODO: Load user settings from Supabase
    setUser({
      username: 'Demo User',
      email: 'demo@example.com',
      nativeLanguage: 'en'
    });
  }, []);

  const handleSignOut = () => {
    // TODO: Implement sign out
    console.log('Sign out');
  };

  const handleLanguageChange = () => {
    // TODO: Open language selection
    console.log('Change language');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Profile</Title>
          <Paragraph>Username: {user?.username || 'Loading...'}</Paragraph>
          <Paragraph>Email: {user?.email || 'Loading...'}</Paragraph>
          <Paragraph>Native Language: {user?.nativeLanguage || 'English'}</Paragraph>
          <Button 
            mode="outlined" 
            onPress={handleLanguageChange}
            style={styles.button}
          >
            Change Language
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Appearance</Title>
          <List.Item
            title="Dark Mode"
            description="Use dark theme"
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Notifications</Title>
          <List.Item
            title="Push Notifications"
            description="Receive message notifications"
            right={() => (
              <Switch
                value={notifications}
                onValueChange={setNotifications}
              />
            )}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>About</Title>
          <Paragraph>NomaLang v1.0.0</Paragraph>
          <Paragraph>Multilingual Family Chat</Paragraph>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Button 
            mode="contained" 
            onPress={handleSignOut}
            buttonColor="#FF6B6B"
            style={styles.signOutButton}
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  card: {
    margin: 16,
    backgroundColor: '#1F2C34',
  },
  button: {
    marginTop: 8,
  },
  signOutButton: {
    marginTop: 8,
  },
});
