import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import { useAuth } from './AuthContext';
import DatabaseService from '../services/database';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const lightTheme = {
  colors: {
    primary: '#9A4100',
    secondary: '#009A41',
    accent: '#41009A',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1F2937',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    card: '#FFFFFF',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  dark: false,
};

const darkTheme = {
  colors: {
    primary: '#9A4100',
    secondary: '#009A41',
    accent: '#41009A',
    background: '#0B141A',
    surface: '#1F2C34',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#374151',
    card: '#1F2C34',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
  dark: true,
};

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [themePreference, setThemePreference] = useState('system');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference from user profile
  useEffect(() => {
    const loadThemePreference = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile } = await DatabaseService.getUserProfile(user.id);
        if (profile?.theme_preference) {
          setThemePreference(profile.theme_preference);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [user?.id]);

  // Determine current theme based on preference
  const getCurrentTheme = () => {
    if (themePreference === 'dark') {
      return darkTheme;
    } else if (themePreference === 'light') {
      return lightTheme;
    } else {
      // System theme
      const systemColorScheme = Appearance.getColorScheme();
      return systemColorScheme === 'dark' ? darkTheme : lightTheme;
    }
  };

  const currentTheme = getCurrentTheme();

  // Update theme preference
  const updateThemePreference = async (newPreference) => {
    if (!user?.id) return;

    try {
      const { error } = await DatabaseService.updateUserProfile(user.id, {
        theme_preference: newPreference
      });

      if (error) {
        console.error('Error updating theme preference:', error);
        return;
      }

      setThemePreference(newPreference);
    } catch (error) {
      console.error('Error updating theme preference:', error);
    }
  };

  const value = {
    theme: currentTheme,
    themePreference,
    updateThemePreference,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
