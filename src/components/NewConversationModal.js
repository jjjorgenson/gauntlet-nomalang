import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Text, Alert, ScrollView } from 'react-native';
import { 
  Modal, 
  Portal, 
  Card, 
  Title, 
  TextInput, 
  Button, 
  Avatar, 
  List,
  Searchbar,
  Divider
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import DatabaseService from '../services/database';

export default function NewConversationModal({ visible, onDismiss, onConversationCreated }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');

  useEffect(() => {
    if (visible) {
      loadUsers();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setSelectedUsers([]);
      setGroupName('');
    }
  }, [visible]);

  const loadUsers = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.searchUsers(searchQuery);
      
      if (error) {
        console.error('Error loading users:', error);
        return;
      }

      // Filter out current user
      const otherUsers = data?.filter(u => u.id !== user.id) || [];
      setUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    // Debounce search
    const timeoutId = setTimeout(() => {
      loadUsers();
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;
    
    try {
      setCreating(true);
      
      // console.log('🔍 Starting conversation creation...');
      // console.log('📊 Selected users:', selectedUsers.map(u => ({ id: u.id, username: u.username })));
      // console.log('👤 Current user:', { id: user.id, email: user.email });
      
      const isGroup = selectedUsers.length > 1;
      
      // Validate group name for group chats
      if (isGroup && !groupName.trim()) {
        Alert.alert('Group Name Required', 'Please enter a name for the group chat.');
        return;
      }
      
      // For direct conversations, check if one already exists
      if (!isGroup) {
        // console.log('🔍 Checking for existing direct conversation...');
        const { data: existingConversation, error: checkError } = await DatabaseService.findExistingDirectConversation(
          user.id, 
          selectedUsers[0].id
        );
        
        if (checkError) {
          console.error('Error checking for existing conversation:', checkError);
          Alert.alert('Error', 'Failed to check for existing conversation.');
          return;
        }
        
        if (existingConversation) {
          // console.log('✅ Found existing direct conversation:', existingConversation);
          // console.log('🎉 Opening existing conversation instead of creating new one');
          onDismiss();
          onConversationCreated(existingConversation);
          return;
        }
        
        // console.log('📝 No existing conversation found, creating new one...');
      }
      
      // Create conversation
      // console.log('📝 Creating conversation with data:', {
      //   type: isGroup ? 'group' : 'direct',
      //   name: isGroup ? groupName.trim() : null
      // });
      
      // Prepare participant IDs (selected users, excluding self since function adds creator automatically)
      if (!Array.isArray(selectedUsers)) {
        console.error('selectedUsers is not an array:', selectedUsers);
        Alert.alert('Error', 'Invalid user selection. Please try again.');
        return;
      }
      
      const { data: conversation, error: convError } = await DatabaseService.createConversation({
        type: isGroup ? 'group' : 'direct',
        name: isGroup ? groupName.trim() : null,
        participantIds: selectedUsers.map(u => u.id)  // Function adds creator + these participants
      });

      if (convError) {
        console.error('Error creating conversation:', convError);
        Alert.alert('Error', 'Failed to create conversation');
        return;
      }

      // Check if we got an existing conversation
      if (conversation.existing) {
        console.log('✅ Using existing conversation:', conversation.id);
      } else {
        console.log('✅ Created new conversation:', conversation.id);
      }

      // Function handles adding participants, no need for manual addConversationParticipants
      onDismiss();
      onConversationCreated(conversation);
    } catch (error) {
      console.error('Unexpected error in createConversation:', error);
    } finally {
      setCreating(false);
    }
  };

  const renderUser = ({ item }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    
    return (
      <List.Item
        title={item.username}
        description={item.email}
        left={() => (
          <Avatar.Text 
            size={40} 
            label={item.username?.charAt(0)?.toUpperCase() || '?'}
            style={[styles.avatar, isSelected && styles.selectedAvatar]}
          />
        )}
        right={() => isSelected && <Avatar.Icon size={24} icon="check" style={styles.checkIcon} />}
        onPress={() => toggleUserSelection(item)}
        style={[styles.userItem, isSelected && styles.selectedUser]}
      />
    );
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Start New Conversation</Title>
            
            <Searchbar
              placeholder="Search users..."
              onChangeText={handleSearch}
              value={searchQuery}
              style={styles.searchbar}
            />

            {selectedUsers.length > 0 && (
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedLabel}>
                  Selected: {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                </Text>
                <ScrollView 
                  style={styles.selectedScrollContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                >
                  <View style={styles.selectedChipsContainer}>
                    {selectedUsers.map(user => (
                      <View key={user.id} style={styles.selectedUserChip}>
                        <Avatar.Text 
                          size={24} 
                          label={user.username?.charAt(0)?.toUpperCase() || '?'}
                          style={styles.chipAvatar}
                        />
                        <Text style={styles.chipText}>{user.username}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Show group name input if multiple users selected */}
            {selectedUsers.length > 1 && (
              <TextInput
                label="Group Name"
                value={groupName}
                onChangeText={setGroupName}
                style={styles.input}
                mode="outlined"
                placeholder="Enter group name..."
                textColor="#1F2937"
                activeOutlineColor="#8B5CF6"
              />
            )}

            <Divider style={styles.divider} />

            <FlatList
              data={users}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              style={styles.usersList}
              showsVerticalScrollIndicator={false}
            />

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={onDismiss}
                style={styles.cancelButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={createConversation}
                disabled={selectedUsers.length === 0 || creating}
                loading={creating}
                style={styles.createButton}
              >
                {selectedUsers.length === 1 ? 'Start Chat' : 'Create Group'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    margin: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    maxHeight: '80%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#1F2937',
  },
  searchbar: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  selectedContainer: {
    marginBottom: 16,
  },
  selectedLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  selectedScrollContainer: {
    maxHeight: 120, // Limit to ~3 rows of chips
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  chipAvatar: {
    backgroundColor: '#FFFFFF',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginLeft: 4,
  },
  divider: {
    marginVertical: 16,
  },
  usersList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  userItem: {
    paddingVertical: 8,
  },
  selectedUser: {
    backgroundColor: '#F3F4F6',
  },
  avatar: {
    backgroundColor: '#8B5CF6',
  },
  selectedAvatar: {
    backgroundColor: '#7C3AED',
  },
  checkIcon: {
    backgroundColor: '#10B981',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
  },
});
