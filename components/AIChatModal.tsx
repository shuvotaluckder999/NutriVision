import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Cancel01Icon,
  Delete01Icon,
  SentIcon,
  SparklesIcon,
} from 'hugeicons-react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { askAIChatbot, ChatMessage } from '../services/geminiService';

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AIChatModal({ visible, onClose }: AIChatModalProps) {
  const { theme } = useTheme();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: "👋 Hi there! I'm **NutriVision AI**, your ChatGPT-powered health & nutrition assistant.\n\nAsk me **ANY health question** (e.g. *\"I am gaining weight, what foods should I avoid?\"*) or query **ANY food item** (e.g. *\"Calories in chicken biryani\"*) for exact calorie & macro breakdowns!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickPrompts = [
    '⚖️ Gaining weight, what to avoid?',
    '💡 How to normalize my weight?',
    '🍗 Calories in 200g chicken & rice',
    '🍕 Calories in 2 slices pizza',
    '🍏 Calories in 1 apple',
    '🥗 High protein diet plan',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || loading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsgId = `user-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
        text: m.text,
      }));

      const response = await askAIChatbot(textToSend, history);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        foodMacroCard: response.foodMacroCard,
      };

      setMessages((prev) => [...prev, aiMessage]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error in AI Chat submission:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: "I'm having a temporary connection issue. Please check your internet connection and try again!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const handleClearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: "Chat history cleared. How can I help you with your health goals or food calories today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
      >
        <View style={[styles.chatContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
          {/* Header Bar */}
          <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.aiAvatarBg, { backgroundColor: theme.primaryBg }]}>
                <SparklesIcon size={20} color={Colors.primary} />
              </View>
              <View style={{ marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>NutriVision AI</Text>
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>GPT Online</Text>
                  </View>
                </View>
                <Text style={[styles.headerSub, { color: theme.textMuted }]}>Health tips & calorie calculator</Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.cardSecondary }]} onPress={handleClearChat} activeOpacity={0.7}>
                <Delete01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.cardSecondary, marginLeft: 8 }]} onPress={onClose} activeOpacity={0.7}>
                <Cancel01Icon size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Prompts Carousel */}
          <View style={[styles.quickPromptsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickPromptsScroll}>
              {quickPrompts.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.promptChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                  onPress={() => handleSend(prompt.replace(/^[^\s]+\s*/, ''))}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.promptChipText, { color: theme.text }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Messages ScrollView */}
          <ScrollView
            ref={scrollViewRef}
            style={[styles.messagesScroll, { backgroundColor: theme.background }]}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View key={msg.id} style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}>
                  {!isUser && (
                    <View style={[styles.messageAvatar, { backgroundColor: theme.primaryBg }]}>
                      <SparklesIcon size={14} color={Colors.primary} />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      isUser
                        ? styles.bubbleUser
                        : [styles.bubbleAi, { backgroundColor: theme.cardSecondary, borderColor: theme.border }],
                    ]}
                  >
                    <Text style={[styles.messageText, isUser ? styles.messageTextUser : [styles.messageTextAi, { color: theme.text }]]}>
                      {msg.text}
                    </Text>

                    {/* Food Calorie & Macro Card inside AI message */}
                    {msg.foodMacroCard && (
                      <View style={[styles.macroCardContainer, { backgroundColor: theme.card, borderColor: Colors.primary }]}>
                        <View style={styles.macroCardHeader}>
                          <MaterialCommunityIcons name="silverware-fork-knife" size={16} color={Colors.primary} />
                          <Text style={[styles.macroCardTitle, { color: theme.text }]}>{msg.foodMacroCard.foodName}</Text>
                          <Text style={[styles.macroCardPortion, { color: theme.textMuted }]}>({msg.foodMacroCard.portion})</Text>
                        </View>

                        <View style={styles.macroCalorieHighlight}>
                          <Ionicons name="flame" size={20} color="#EF4444" />
                          <Text style={[styles.macroCalorieValue, { color: theme.text }]}>{msg.foodMacroCard.calories}</Text>
                          <Text style={styles.macroCalorieUnit}>kcal total</Text>
                        </View>

                        <View style={[styles.macroMetricsGrid, { backgroundColor: theme.background, borderColor: theme.border }]}>
                          <View style={styles.macroMetricItem}>
                            <Text style={[styles.macroMetricLabel, { color: theme.textMuted }]}>Protein</Text>
                            <Text style={[styles.macroMetricValue, { color: '#EF4444' }]}>{msg.foodMacroCard.protein}g</Text>
                          </View>
                          <View style={[styles.macroMetricDivider, { backgroundColor: theme.border }]} />
                          <View style={styles.macroMetricItem}>
                            <Text style={[styles.macroMetricLabel, { color: theme.textMuted }]}>Carbs</Text>
                            <Text style={[styles.macroMetricValue, { color: '#F59E0B' }]}>{msg.foodMacroCard.carbs}g</Text>
                          </View>
                          <View style={[styles.macroMetricDivider, { backgroundColor: theme.border }]} />
                          <View style={styles.macroMetricItem}>
                            <Text style={[styles.macroMetricLabel, { color: theme.textMuted }]}>Fats</Text>
                            <Text style={[styles.macroMetricValue, { color: '#3B82F6' }]}>{msg.foodMacroCard.fats}g</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    <Text style={[styles.timestamp, isUser && { color: 'rgba(255,255,255,0.7)' }]}>{msg.timestamp}</Text>
                  </View>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.messageRow, styles.messageRowAi]}>
                <View style={[styles.messageAvatar, { backgroundColor: theme.primaryBg }]}>
                  <SparklesIcon size={14} color={Colors.primary} />
                </View>
                <View style={[styles.bubble, styles.bubbleAi, { backgroundColor: theme.cardSecondary, borderColor: theme.border }, styles.loadingBubble]}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={[styles.loadingText, { color: theme.textMuted }]}>Analyzing nutrition & calories...</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Bar */}
          <View style={[styles.inputBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ask AI about food, calories, or fitness..."
              placeholderTextColor={theme.textMuted}
              value={inputText}
              onChangeText={setInputText}
              returnKeyType="send"
              onSubmitEditing={() => handleSend()}
              editable={!loading}
            />

            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => handleSend()}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.8}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <SentIcon size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiAvatarBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  quickPromptsContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  quickPromptsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 14,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAi: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextUser: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  messageTextAi: {
    fontWeight: '400',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(156, 163, 175, 0.8)',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  macroCardContainer: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  macroCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  macroCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  macroCardPortion: {
    fontSize: 12,
    marginLeft: 6,
  },
  macroCalorieHighlight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  macroCalorieValue: {
    fontSize: 22,
    fontWeight: '800',
    marginLeft: 6,
  },
  macroCalorieUnit: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  macroMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  macroMetricItem: {
    alignItems: 'center',
  },
  macroMetricLabel: {
    fontSize: 11,
  },
  macroMetricValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  macroMetricDivider: {
    width: 1,
    height: 20,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 14,
    borderWidth: 1.5,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
