import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GroupReadReceipt = ({ 
  messageId, 
  currentUserId, 
  readStatus = null, 
  onPress = null,
  style 
}) => {
  const [readCount, setReadCount] = useState(0);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isAllRead, setIsAllRead] = useState(false);

  useEffect(() => {
    if (readStatus) {
      const { read_count, total_participants } = readStatus;
      setReadCount(read_count || 0);
      setTotalParticipants(total_participants || 0);
      setIsAllRead(read_count === total_participants && total_participants > 0);
    }
  }, [readStatus]);

  const getReceiptIcon = () => {
    if (isAllRead) {
      return 'checkmark-done'; // Double checkmark for all read
    } else if (readCount > 0) {
      return 'checkmark'; // Single checkmark for some read
    } else {
      return 'checkmark-outline'; // Empty checkmark for sent
    }
  };

  const getReceiptColor = () => {
    if (isAllRead) {
      return '#007bff'; // Blue for all read
    } else if (readCount > 0) {
      return '#28a745'; // Green for some read
    } else {
      return '#6c757d'; // Gray for sent only
    }
  };

  const getReceiptText = () => {
    if (isAllRead) {
      return 'Read by all';
    } else if (readCount > 0) {
      return `Read by ${readCount}/${totalParticipants}`;
    } else {
      return 'Sent';
    }
  };

  const handlePress = () => {
    if (onPress && readCount > 0) {
      onPress(messageId, readStatus);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={handlePress}
      disabled={!onPress || readCount === 0}
    >
      <View style={styles.receiptContainer}>
        <Ionicons 
          name={getReceiptIcon()} 
          size={16} 
          color={getReceiptColor()} 
          style={styles.icon}
        />
        {readCount > 0 && (
          <Text style={[styles.text, { color: getReceiptColor() }]}>
            {readCount}
          </Text>
        )}
      </View>
      {onPress && readCount > 0 && (
        <Text style={styles.tooltip}>{getReceiptText()}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  receiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  tooltip: {
    fontSize: 10,
    color: '#6c757d',
    marginLeft: 4,
    fontStyle: 'italic',
  },
});

export default GroupReadReceipt;
