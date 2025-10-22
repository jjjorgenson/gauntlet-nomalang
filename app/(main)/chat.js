import React, { useState, useEffect } from 'react'
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native'
import { Surface, Card, Title, Paragraph, Button, FAB } from 'react-native-paper'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

export default function ChatScreen() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  const loadConversations = async () => {
    try {
      setLoading(true)

      // Get conversations where user is the creator (RLS handles this)
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          name,
          type,
          created_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const goToNewChat = () => {
    router.push('/(main)/new-chat')
  }

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(main)/conversation?id=${item.id}`)}
    >
      <Card style={styles.conversationCard}>
        <Card.Content>
          <Title>{item.name}</Title>
          <Paragraph>Type: {item.type}</Paragraph>
          <Paragraph>Created: {new Date(item.created_at).toLocaleDateString()}</Paragraph>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  )

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading conversations...</Text>
      </View>
    )
  }

  return (
    <Surface style={styles.container}>
      <View style={styles.header}>
        <Title>Chat</Title>
      </View>
      
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text>No conversations yet</Text>
            <Button mode="outlined" onPress={goToNewChat}>
              Start a conversation
            </Button>
          </View>
        }
      />

      <FAB
        icon="plus"
        onPress={goToNewChat}
        style={styles.fab}
      />
    </Surface>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  list: {
    flex: 1,
  },
  conversationCard: {
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
})
