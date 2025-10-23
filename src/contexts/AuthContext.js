import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, auth } from '../lib/supabase';
import DatabaseService from '../services/database';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await ensureUserProfile(session.user);
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await ensureUserProfile(session.user);
        }
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const ensureUserProfile = async (authUser) => {
    try {
      // Check if user profile exists
      const { data: existingProfile, error: getError } = await DatabaseService.getUserProfile(authUser.id);
      
      if (getError) {
        console.error('Error checking user profile:', getError);
        return;
      }
      
      if (!existingProfile) {
        console.log('Creating user profile for:', authUser.email);
        // Create user profile if it doesn't exist
        const { data: newProfile, error: createError } = await DatabaseService.createUserProfile(authUser.id, {
          email: authUser.email,
          username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'user',
          native_language: authUser.user_metadata?.native_language || 'en'
        });
        
        if (createError) {
          console.error('Error creating user profile:', createError);
        } else {
          console.log('Successfully created user profile:', newProfile);
        }
      } else {
        console.log('User profile already exists for:', authUser.email);
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  };

  const signUp = async (email, password, userData) => {
    setLoading(true);
    const { data, error } = await auth.signUp(email, password, {
      data: {
        username: userData.username,
        native_language: userData.native_language || 'en'
      }
    });
    
    // If signup successful, create user profile
    if (data?.user && !error) {
      try {
        console.log('Creating user profile for new signup:', data.user.email);
        const { data: newProfile, error: createError } = await DatabaseService.createUserProfile(data.user.id, {
          email: data.user.email,
          username: userData.username,
          native_language: userData.native_language || 'en'
        });
        
        if (createError) {
          console.error('Error creating user profile during signup:', createError);
        } else {
          console.log('Successfully created user profile during signup:', newProfile);
        }
      } catch (profileError) {
        console.error('Error creating user profile:', profileError);
        // Don't fail the signup if profile creation fails
      }
    }
    
    setLoading(false);
    return { data, error };
  };

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await auth.signIn(email, password);
    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await auth.signOut();
    setLoading(false);
    return { error };
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
