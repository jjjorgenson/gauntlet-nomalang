import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';

export default function SlangExplanationModal({ 
  visible, 
  onDismiss, 
  slangText,
  explanation,
  isLoading,
  error 
}) {
  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>💬 Slang Explanation</Title>
            
            {slangText && (
              <View style={styles.slangContainer}>
                <Paragraph style={styles.slangLabel}>Phrase:</Paragraph>
                <Paragraph style={styles.slangText}>"{slangText}"</Paragraph>
              </View>
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Paragraph style={styles.loadingText}>Analyzing slang...</Paragraph>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Paragraph style={styles.errorText}>❌ {error}</Paragraph>
              </View>
            )}

            {explanation && !isLoading && (
              <ScrollView style={styles.explanationContainer}>
                <Paragraph style={styles.explanationLabel}>Meaning:</Paragraph>
                <Paragraph style={styles.explanationText}>{explanation.meaning}</Paragraph>
                
                {explanation.context && (
                  <>
                    <Paragraph style={styles.explanationLabel}>Context:</Paragraph>
                    <Paragraph style={styles.explanationText}>{explanation.context}</Paragraph>
                  </>
                )}

                {explanation.example && (
                  <>
                    <Paragraph style={styles.explanationLabel}>Example:</Paragraph>
                    <Paragraph style={styles.exampleText}>"{explanation.example}"</Paragraph>
                  </>
                )}
              </ScrollView>
            )}
          </Card.Content>

          <Card.Actions>
            <Button onPress={onDismiss} mode="contained" style={styles.closeButton}>
              Close
            </Button>
          </Card.Actions>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B5CF6',
    marginBottom: 16,
  },
  slangContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  slangLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  slangText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    color: '#DC2626',
  },
  explanationContainer: {
    maxHeight: 300,
  },
  explanationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  exampleText: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#8B5CF6',
    marginLeft: 'auto',
  },
});
