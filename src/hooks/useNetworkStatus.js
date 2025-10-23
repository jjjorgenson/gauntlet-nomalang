import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook for monitoring network connectivity status
 * @returns {Object} Network status object with isOnline and isConnected
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Get initial network state
    const getInitialState = async () => {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected && state.isInternetReachable);
      setIsConnected(state.isConnected);
    };

    getInitialState();

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(online);
      setIsConnected(state.isConnected);
      
      console.log(`🌐 Network status changed:`, {
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        isOnline: online,
        type: state.type
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { isOnline, isConnected };
}
