import React, { useState, useEffect } from 'react'
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native'
import { Surface, Card, Title, Paragraph, Button, Text, Searchbar, Chip, FAB } from 'react-native-paper'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { router } from 'expo-router'

export default function NewChatScreen() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [isGroupChat, setIsGroupChat] = useState(false)

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchUsers = async () => {
    if (!searchQuery.trim()) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url')
        .ilike('email', `%${searchQuery}%`)
        .neq('id', user.id) // Exclude current user
        .limit(10)

      if (error) {
        console.error('Error searching users:', error)
        return
      }

      setSearchResults(data || [])
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUserSelection = (selectedUser) => {
    if (isGroupChat) {
      // Group chat: allow multiple selections
      setSelectedUsers(prev => {
        const isSelected = prev.some(u => u.id === selectedUser.id)
        if (isSelected) {
          return prev.filter(u => u.id !== selectedUser.id)
        } else {
          return [...prev, selectedUser]
        }
      })
    } else {
      // Direct chat: single selection
      setSelectedUsers([selectedUser])
    }
  }

  const createConversation = async () => {
    if (selectedUsers.length === 0) return

    // Ensure user is authenticated
    if (!user || !user.id) {
      console.error('User not authenticated')
      Alert.alert('Error', 'You must be logged in to create a conversation')
      return
    }

    try {
      setLoading(true)

      // Check if direct message already exists (for 1-on-1 chats)
      if (!isGroupChat && selectedUsers.length === 1) {
        const existingDM = await checkExistingDM(selectedUsers[0].id)
        if (existingDM) {
          router.replace(`/(main)/conversation?id=${existingDM.id}`)
          return
        }
      }

      // Create new conversation
      const conversationName = isGroupChat 
        ? `Group Chat (${selectedUsers.length + 1} members)`
        : `Chat with ${selectedUsers[0].display_name || selectedUsers[0].email}`

      console.log('Creating conversation with user:', user.id)
      console.log('User object:', JSON.stringify(user, null, 2))
      
      // Check current Supabase session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('Current session:', session ? 'exists' : 'null')
      console.log('Session user ID:', session?.user?.id)
      console.log('Session error:', sessionError)
      
      if (!session) {
        console.error('No active Supabase session found')
        Alert.alert('Error', 'You must be logged in to create a conversation')
        return
      }
      
      // Session user ID will be automatically used by RLS policy for created_by
      
      // Verify the session is still valid
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      if (userError || !currentUser) {
        console.error('Session validation failed:', userError)
        Alert.alert('Error', 'Your session has expired. Please log in again.')
        return
      }
      console.log('Session validated for user:', currentUser.id)
      
      let conversationId

      if (isGroupChat) {
        // Create group conversation using RPC
        const { data, error } = await supabase.rpc('create_group_conversation', {
          p_creator: user.id,
          p_participant_ids: selectedUsers.map(u => u.id),
          p_name: conversationName
        })

        if (error) {
          console.error('Error creating group conversation:', error)
          Alert.alert('Error', `Failed to create group conversation: ${error.message}`)
          return
        }

        conversationId = data
        console.log('Group conversation created successfully:', conversationId)

      } else {
        // Create direct conversation using RPC
        const { data, error } = await supabase.rpc('create_direct_conversation', {
          p_creator: user.id,
          p_other_user: selectedUsers[0].id
        })

        if (error) {
          console.error('Error creating direct conversation:', error)
          Alert.alert('Error', `Failed to create direct conversation: ${error.message}`)
          return
        }

        conversationId = data
        console.log('Direct conversation created successfully:', conversationId)
      }
      
      // Navigate to the new conversation
      router.replace(`/(main)/conversation?id=${conversationId}`)
      
    } catch (error) {
      console.error('Error creating conversation:', error)
      Alert.alert('Error', `Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const checkExistingDM = async (otherUserId) => {
    try {
      // With new RLS policies, users can only see conversations they created
      // For now, we'll skip the existing DM check to avoid complexity
      // In a production app, you'd implement this differently
      return null
    } catch (error) {
      console.error('Error checking existing DM:', error)
      return null
    }
  }

  const renderUserResult = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id)
    
    return (
      <TouchableOpacity onPress={() => toggleUserSelection(item)}>
        <Card style={[
          styles.userCard,
          isSelected && styles.selectedUserCard
        ]}>
          <Card.Content style={styles.userContent}>
            <View style={styles.userInfo}>
              <Title>{item.display_name || 'No name'}</Title>
              <Paragraph>{item.email}</Paragraph>
            </View>
            {isSelected && (
              <Chip mode="flat" compact>
                Selected
              </Chip>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    )
  }

  const renderSelectedUser = ({ item }) => (
    <Chip
      onClose={() => setSelectedUsers(prev => prev.filter(u => u.id !== item.id))}
      style={styles.selectedChip}
    >
      {item.display_name || item.email}
    </Chip>
  )

  return (
    <Surface style={styles.container}>
      <View style={styles.header}>
        <Title>New Chat</Title>
        <Button 
          mode={isGroupChat ? "contained" : "outlined"}
          onPress={() => setIsGroupChat(!isGroupChat)}
        >
          {isGroupChat ? 'Group Chat' : 'Direct Chat'}
        </Button>
      </View>

      <Searchbar
        placeholder="Search users by email..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        loading={loading}
      />

      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text variant="bodyMedium" style={styles.selectedLabel}>
            Selected ({selectedUsers.length}):
          </Text>
          <FlatList
            data={selectedUsers}
            renderItem={renderSelectedUser}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.selectedList}
          />
        </View>
      )}

      <FlatList
        data={searchResults}
        renderItem={renderUserResult}
        keyExtractor={(item) => item.id}
        style={styles.resultsList}
        ListEmptyComponent={
          searchQuery.length >= 2 ? (
            <View style={styles.emptyContainer}>
              <Text>No users found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text>Start typing to search for users</Text>
            </View>
          )
        }
      />

      {selectedUsers.length > 0 && (
        <FAB
          icon="chat"
          label={isGroupChat ? `Start Group Chat (${selectedUsers.length + 1})` : 'Start Chat'}
          onPress={createConversation}
          loading={loading}
          style={styles.fab}
        />
      )}
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
  searchBar: {
    marginBottom: 16,
  },
  selectedContainer: {
    marginBottom: 16,
  },
  selectedLabel: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  selectedList: {
    maxHeight: 50,
  },
  selectedChip: {
    marginRight: 8,
  },
  resultsList: {
    flex: 1,
  },
  userCard: {
    marginBottom: 8,
  },
  selectedUserCard: {
    backgroundColor: '#e3f2fd',
  },
  userContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
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
