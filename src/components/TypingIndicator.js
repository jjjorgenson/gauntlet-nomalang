import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

const TypingIndicator = ({ typingUsers = [], currentUserId }) => {
  const [animation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Start animation when typing users change
    if (typingUsers.length > 0) {
      const animate = () => {
        Animated.sequence([
          Animated.timing(animation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(animation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (typingUsers.length > 0) {
            animate();
          }
        });
      };
      animate();
    } else {
      animation.setValue(0);
    }
  }, [typingUsers.length]);

  if (typingUsers.length === 0) {
    return null;
  }

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(user => user.userId !== currentUserId);

  if (otherTypingUsers.length === 0) {
    return null;
  }

  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].user?.username || 'Someone'} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].user?.username || 'Someone'} and ${otherTypingUsers[1].user?.username || 'someone'} are typing...`;
    } else {
      return `${otherTypingUsers.length} people are typing...`;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.typingContainer}>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((index) => (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  opacity: animation.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      scale: animation.interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0.8, 1.2, 0.8],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.typingText}>{getTypingText()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: '80%',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6c757d',
    marginHorizontal: 2,
  },
  typingText: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
