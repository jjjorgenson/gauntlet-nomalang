import React from 'react';
import { View, StyleSheet } from 'react-native';

const OnlineStatusDot = ({ isOnline, size = 'small', style }) => {
  const getDotSize = () => {
    switch (size) {
      case 'small':
        return { width: 8, height: 8, borderRadius: 4 };
      case 'medium':
        return { width: 12, height: 12, borderRadius: 6 };
      case 'large':
        return { width: 16, height: 16, borderRadius: 8 };
      default:
        return { width: 8, height: 8, borderRadius: 4 };
    }
  };

  const getDotColor = () => {
    return isOnline ? '#28a745' : '#6c757d'; // Green for online, gray for offline
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.dot,
          getDotSize(),
          { backgroundColor: getDotColor() }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
});

export default OnlineStatusDot;
