import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

// Import contexts and screens
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';
import ConversationScreen from './src/screens/ConversationScreen';
import './src/lib/supabase';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainApp() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return null; // Or a loading screen
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="MainTabs" 
          options={{ headerShown: false }}
        >
          {() => (
            <Tab.Navigator
              screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                  let iconName;

                  if (route.name === 'Chats') {
                    iconName = focused ? 'chat' : 'chat-bubble-outline';
                  } else if (route.name === 'Settings') {
                    iconName = focused ? 'settings' : 'settings';
                  }

                  return <MaterialIcons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.colors.accent,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                headerStyle: {
                  backgroundColor: theme.colors.surface,
                },
                headerTintColor: theme.colors.text,
                tabBarStyle: {
                  backgroundColor: theme.colors.surface,
                  borderTopColor: theme.colors.border,
                },
              })}
            >
              <Tab.Screen 
                name="Chats" 
                component={ChatsScreen}
                options={{ title: 'Conversations' }}
              />
              <Tab.Screen 
                name="Settings" 
                component={SettingsScreen}
                options={{ title: 'Settings' }}
              />
            </Tab.Navigator>
          )}
        </Stack.Screen>
        <Stack.Screen 
          name="Conversation" 
          component={ConversationScreen}
          options={({ route }) => ({
            title: route.params?.conversationName || 'Chat',
            headerStyle: {
              backgroundColor: theme.colors.surface,
            },
            headerTintColor: theme.colors.text,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const { theme } = useTheme();
  
  return (
    <>
      <MainApp />
      <StatusBar style={theme.dark ? "light" : "dark"} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <PaperProvider>
          <AppContent />
        </PaperProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}