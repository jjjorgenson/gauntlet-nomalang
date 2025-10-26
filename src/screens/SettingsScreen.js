import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Switch, 
  List, 
  Button,
  Divider,
  Text,
  Portal,
  Modal,
  RadioButton,
  ActivityIndicator,
  Snackbar
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import DatabaseService from '../services/database';
import LanguageService from '../services/language';
import { supabase } from '../lib/supabase';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Settings states
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [themePreference, setThemePreference] = useState('system');
  
  // UI states
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success'); // 'success' | 'error'

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, [user?.id]);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: profile, error } = await DatabaseService.getUserProfile(user.id);
      
      if (error) {
        console.error('Error loading user profile:', error);
        showSnackbar('Failed to load profile', 'error');
        return;
      }

      if (profile) {
        setUserProfile(profile);
        setAutoTranslateEnabled(profile.auto_translate_enabled || false);
        setThemePreference(profile.theme_preference || 'system');
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      showSnackbar('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const handleLanguageChange = async (languageCode) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const { error } = await DatabaseService.updateUserProfile(user.id, {
        native_language: languageCode
      });

      if (error) {
        console.error('Error updating language:', error);
        showSnackbar('Failed to update language', 'error');
        return;
      }

      // Update local state
      setUserProfile(prev => ({ ...prev, native_language: languageCode }));
      setShowLanguageModal(false);
      showSnackbar('Language updated successfully');
    } catch (error) {
      console.error('Error updating language:', error);
      showSnackbar('Failed to update language', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslateToggle = async () => {
    if (!user?.id) return;

    const newValue = !autoTranslateEnabled;
    
    try {
      setSaving(true);
      const { error } = await DatabaseService.updateAutoTranslateSetting(user.id, newValue);

      if (error) {
        console.error('Error updating auto-translate setting:', error);
        showSnackbar('Failed to update auto-translate setting', 'error');
        return;
      }

      setAutoTranslateEnabled(newValue);
      showSnackbar(`Auto-translate ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating auto-translate setting:', error);
      showSnackbar('Failed to update auto-translate setting', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (theme) => {
    if (!user?.id) return;

    try {
      setSaving(true);
      const { error } = await DatabaseService.updateUserProfile(user.id, {
        theme_preference: theme
      });

      if (error) {
        console.error('Error updating theme preference:', error);
        showSnackbar('Failed to update theme preference', 'error');
        return;
      }

      setThemePreference(theme);
      setShowThemeModal(false);
      showSnackbar('Theme preference updated');
    } catch (error) {
      console.error('Error updating theme preference:', error);
      showSnackbar('Failed to update theme preference', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setSaving(true);
      await signOut();
      showSnackbar('Signed out successfully');
    } catch (error) {
      console.error('Error signing out:', error);
      showSnackbar('Failed to sign out', 'error');
    } finally {
      setSaving(false);
      setShowSignOutDialog(false);
    }
  };

  const confirmSignOut = () => {
    setShowSignOutDialog(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  const commonLanguages = LanguageService.getCommonLanguages();
  const currentLanguage = commonLanguages.find(lang => lang.code === userProfile?.native_language);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Profile Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Profile</Title>
            <Paragraph>Username: {userProfile?.username || 'Loading...'}</Paragraph>
            <Paragraph>Email: {userProfile?.email || 'Loading...'}</Paragraph>
            <Paragraph>
              Native Language: {currentLanguage ? 
                LanguageService.formatLanguageForSettings(currentLanguage.code) : 
                'Loading...'
              }
            </Paragraph>
            <Button 
              mode="outlined" 
              onPress={() => setShowLanguageModal(true)}
              style={styles.button}
              disabled={saving}
            >
              Change Language
            </Button>
          </Card.Content>
        </Card>

        {/* Translation Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Translation</Title>
            <List.Item
              title="Auto-translate Default"
              description="Automatically translate foreign messages (can be overridden per conversation)"
              right={() => (
                <Switch
                  value={autoTranslateEnabled}
                  onValueChange={handleAutoTranslateToggle}
                  disabled={saving}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Appearance Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Appearance</Title>
            <List.Item
              title="Theme"
              description={`Current: ${themePreference.charAt(0).toUpperCase() + themePreference.slice(1)}`}
              right={() => (
                <Button 
                  mode="text" 
                  onPress={() => setShowThemeModal(true)}
                  disabled={saving}
                >
                  Change
                </Button>
              )}
            />
          </Card.Content>
        </Card>

        {/* About Section */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>About</Title>
            <Paragraph>NomaLang v1.0.0</Paragraph>
            <Paragraph>Multilingual Family Chat</Paragraph>
          </Card.Content>
        </Card>

        {/* Sign Out */}
        <Card style={styles.card}>
          <Card.Content>
            <Button 
              mode="contained" 
              onPress={confirmSignOut}
              buttonColor="#FF6B6B"
              style={styles.signOutButton}
              disabled={saving}
            >
              {saving ? 'Signing Out...' : 'Sign Out'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Language Picker Modal */}
      <Portal>
        <Modal 
          visible={showLanguageModal} 
          onDismiss={() => setShowLanguageModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title>Select Language</Title>
              <ScrollView style={styles.languageList}>
                {commonLanguages.map((language) => (
                  <List.Item
                    key={language.code}
                    title={LanguageService.formatLanguageForSettings(language.code)}
                    onPress={() => handleLanguageChange(language.code)}
                    right={() => (
                      <RadioButton
                        value={language.code}
                        status={userProfile?.native_language === language.code ? 'checked' : 'unchecked'}
                        onPress={() => handleLanguageChange(language.code)}
                      />
                    )}
                    disabled={saving}
                  />
                ))}
              </ScrollView>
              <Button 
                mode="text" 
                onPress={() => setShowLanguageModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Theme Picker Modal */}
      <Portal>
        <Modal 
          visible={showThemeModal} 
          onDismiss={() => setShowThemeModal(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title>Select Theme</Title>
              <List.Item
                title="Light"
                description="Always use light theme"
                right={() => (
                  <RadioButton
                    value="light"
                    status={themePreference === 'light' ? 'checked' : 'unchecked'}
                    onPress={() => handleThemeChange('light')}
                  />
                )}
                onPress={() => handleThemeChange('light')}
                disabled={saving}
              />
              <List.Item
                title="Dark"
                description="Always use dark theme"
                right={() => (
                  <RadioButton
                    value="dark"
                    status={themePreference === 'dark' ? 'checked' : 'unchecked'}
                    onPress={() => handleThemeChange('dark')}
                  />
                )}
                onPress={() => handleThemeChange('dark')}
                disabled={saving}
              />
              <List.Item
                title="System"
                description="Follow device theme"
                right={() => (
                  <RadioButton
                    value="system"
                    status={themePreference === 'system' ? 'checked' : 'unchecked'}
                    onPress={() => handleThemeChange('system')}
                  />
                )}
                onPress={() => handleThemeChange('system')}
                disabled={saving}
              />
              <Button 
                mode="text" 
                onPress={() => setShowThemeModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Sign Out Confirmation Dialog */}
      <Portal>
        <Modal 
          visible={showSignOutDialog} 
          onDismiss={() => setShowSignOutDialog(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Title>Sign Out</Title>
              <Paragraph>Are you sure you want to sign out?</Paragraph>
              <View style={styles.dialogButtons}>
                <Button 
                  mode="text" 
                  onPress={() => setShowSignOutDialog(false)}
                  style={styles.dialogButton}
                >
                  Cancel
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleSignOut}
                  buttonColor="#FF6B6B"
                  style={styles.dialogButton}
                  disabled={saving}
                >
                  Sign Out
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Snackbar for feedback */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={snackbarType === 'error' ? styles.errorSnackbar : styles.successSnackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B141A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B141A',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
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
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  languageList: {
    maxHeight: 300,
  },
  cancelButton: {
    marginTop: 16,
  },
  dialogButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  dialogButton: {
    marginLeft: 8,
  },
  successSnackbar: {
    backgroundColor: '#4CAF50',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
});