import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

// Import contexts and screens
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import ChatsScreen from './src/screens/ChatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AuthScreen from './src/screens/AuthScreen';
import ConversationScreen from './src/screens/ConversationScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainApp() {
  const { user, loading } = useAuth();

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
                tabBarActiveTintColor: '#8B5CF6',
                tabBarInactiveTintColor: '#9CA3AF',
                headerStyle: {
                  backgroundColor: '#FFFFFF',
                },
                headerTintColor: '#1F2937',
                tabBarStyle: {
                  backgroundColor: '#FFFFFF',
                  borderTopColor: '#E5E7EB',
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
              backgroundColor: '#FFFFFF',
            },
            headerTintColor: '#1F2937',
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PaperProvider>
        <MainApp />
        <StatusBar style="dark" />
      </PaperProvider>
    </AuthProvider>
  );
}