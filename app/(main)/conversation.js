import React, { useState, useEffect, useRef } from 'react'
import { View, StyleSheet, FlatList, TextInput, Alert } from 'react-native'
import { Surface, Text, Button, Card, ActivityIndicator } from 'react-native-paper'
import { useAuth } from '../../lib/auth'
import { useChat } from '../../hooks/useChat'
import { useLocalSearchParams } from 'expo-router'

export default function ConversationScreen() {
  const { user } = useAuth()
  const { id: conversationId } = useLocalSearchParams()
  const [messageText, setMessageText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const flatListRef = useRef(null)

  const {
    messages,
    loading,
    sendMessage,
    markAsRead,
    typingUsers,
    isConnected
  } = useChat(conversationId)

  useEffect(() => {
    if (conversationId) {
      markAsRead()
    }
  }, [conversationId, markAsRead])

  const handleSendMessage = async () => {
    if (!messageText.trim()) return

    const message = messageText.trim()
    setMessageText('')
    
    try {
      await sendMessage(message)
    } catch (error) {
      console.error('Error sending message:', error)
      Alert.alert('Error', 'Failed to send message')
    }
  }

  const handleTyping = (text) => {
    setMessageText(text)
    if (text.length > 0 && !isTyping) {
      setIsTyping(true)
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false)
    }
  }

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === user?.id
    const messageStatus = item.message_status?.[0]
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <Card style={[
          styles.messageCard,
          isOwnMessage ? styles.ownMessageCard : styles.otherMessageCard
        ]}>
          <Card.Content>
            <Text variant="bodyMedium">{item.content}</Text>
            <Text variant="labelSmall" style={styles.timestamp}>
              {new Date(item.created_at).toLocaleTimeString()}
            </Text>
            {isOwnMessage && messageStatus && (
              <Text variant="labelSmall" style={styles.status}>
                {messageStatus.read ? 'Read' : 
                 messageStatus.delivered ? 'Delivered' : 'Sent'}
              </Text>
            )}
          </Card.Content>
        </Card>
      </View>
    )
  }

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null
    
    return (
      <View style={styles.typingContainer}>
        <Text variant="bodySmall" style={styles.typingText}>
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Loading conversation...</Text>
      </View>
    )
  }

  return (
    <Surface style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium">Conversation</Text>
        <Text variant="bodySmall">
          {isConnected ? 'Connected' : 'Disconnected'}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        ListFooterComponent={renderTypingIndicator}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
        />
        <Button
          mode="contained"
          onPress={handleSendMessage}
          disabled={!messageText.trim()}
          style={styles.sendButton}
        >
          Send
        </Button>
      </View>
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 8,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  ownMessageCard: {
    backgroundColor: '#007AFF',
  },
  otherMessageCard: {
    backgroundColor: '#f0f0f0',
  },
  timestamp: {
    marginTop: 4,
    opacity: 0.7,
  },
  status: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  typingContainer: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  typingText: {
    fontStyle: 'italic',
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
  },
})
