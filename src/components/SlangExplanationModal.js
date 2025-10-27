import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Modal, Portal, Card, Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper';

export default function SlangExplanationModal({ 
  visible, 
  onDismiss, 
  slangText,
  explanation,
  isLoading,
  error,
  language = 'en'
}) {
  // Language-specific UI text
  const getUIText = (key) => {
    const translations = {
      title: {
        'en': '💬 Slang Explanation',
        'es': '💬 Explicación de Jerga',
        'fr': '💬 Explication d\'Argot',
        'de': '💬 Slang-Erklärung',
        'pt': '💬 Explicação de Gíria',
        'it': '💬 Spiegazione di Slang',
        'ru': '💬 Объяснение Сленга',
        'zh': '💬 俚语解释',
        'ja': '💬 スラング説明',
        'ko': '💬 속어 설명',
        'ar': '💬 شرح العامية'
      },
      phrase: {
        'en': 'Phrase:',
        'es': 'Frase:',
        'fr': 'Phrase:',
        'de': 'Ausdruck:',
        'pt': 'Frase:',
        'it': 'Frase:',
        'ru': 'Фраза:',
        'zh': '短语:',
        'ja': 'フレーズ:',
        'ko': '구문:',
        'ar': 'العبارة:'
      },
      meaning: {
        'en': 'Meaning:',
        'es': 'Significado:',
        'fr': 'Signification:',
        'de': 'Bedeutung:',
        'pt': 'Significado:',
        'it': 'Significato:',
        'ru': 'Значение:',
        'zh': '含义:',
        'ja': '意味:',
        'ko': '의미:',
        'ar': 'المعنى:'
      },
      context: {
        'en': 'Context:',
        'es': 'Contexto:',
        'fr': 'Contexte:',
        'de': 'Kontext:',
        'pt': 'Contexto:',
        'it': 'Contesto:',
        'ru': 'Контекст:',
        'zh': '语境:',
        'ja': '文脈:',
        'ko': '맥락:',
        'ar': 'السياق:'
      },
      example: {
        'en': 'Example:',
        'es': 'Ejemplo:',
        'fr': 'Exemple:',
        'de': 'Beispiel:',
        'pt': 'Exemplo:',
        'it': 'Esempio:',
        'ru': 'Пример:',
        'zh': '例子:',
        'ja': '例:',
        'ko': '예시:',
        'ar': 'مثال:'
      },
      analyzing: {
        'en': 'Analyzing slang...',
        'es': 'Analizando jerga...',
        'fr': 'Analyse de l\'argot...',
        'de': 'Slang wird analysiert...',
        'pt': 'Analisando gíria...',
        'it': 'Analisi dello slang...',
        'ru': 'Анализ сленга...',
        'zh': '分析俚语...',
        'ja': 'スラングを分析中...',
        'ko': '속어 분석 중...',
        'ar': 'تحليل العامية...'
      },
      close: {
        'en': 'Close',
        'es': 'Cerrar',
        'fr': 'Fermer',
        'de': 'Schließen',
        'pt': 'Fechar',
        'it': 'Chiudi',
        'ru': 'Закрыть',
        'zh': '关闭',
        'ja': '閉じる',
        'ko': '닫기',
        'ar': 'إغلاق'
      }
    };
    
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  };

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modal}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{getUIText('title')}</Title>
            
            {slangText && (
              <View style={styles.slangContainer}>
                <Paragraph style={styles.slangLabel}>{getUIText('phrase')}</Paragraph>
                <Paragraph style={styles.slangText}>"{slangText}"</Paragraph>
              </View>
            )}

            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Paragraph style={styles.loadingText}>{getUIText('analyzing')}</Paragraph>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Paragraph style={styles.errorText}>❌ {error}</Paragraph>
              </View>
            )}

            {explanation && !isLoading && (
              <ScrollView style={styles.explanationContainer}>
                <Paragraph style={styles.explanationLabel}>{getUIText('meaning')}</Paragraph>
                <Paragraph style={styles.explanationText}>{explanation.meaning}</Paragraph>
                
                {explanation.context && (
                  <>
                    <Paragraph style={styles.explanationLabel}>{getUIText('context')}</Paragraph>
                    <Paragraph style={styles.explanationText}>{explanation.context}</Paragraph>
                  </>
                )}

                {explanation.example && (
                  <>
                    <Paragraph style={styles.explanationLabel}>{getUIText('example')}</Paragraph>
                    <Paragraph style={styles.exampleText}>"{explanation.example}"</Paragraph>
                  </>
                )}
              </ScrollView>
            )}
          </Card.Content>

          <Card.Actions>
            <Button onPress={onDismiss} mode="contained" style={styles.closeButton}>
              {getUIText('close')}
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
