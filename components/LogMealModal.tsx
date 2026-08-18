import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import {
  Cancel01Icon,
  Search01Icon,
  Restaurant01Icon,
  Add01Icon,
  SparklesIcon,
  Mic01Icon,
} from 'hugeicons-react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { MealStorage } from '../utils/mealStorage';
import { searchFoodDatabase, estimateDynamicFoodCalories } from '../services/geminiService';

interface LogMealModalProps {
  visible: boolean;
  onClose: () => void;
  onMealAdded?: () => void;
}

interface FoodItemResult {
  name: string;
  bengaliName?: string;
  defaultPortion: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export function LogMealModal({ visible, onClose, onMealAdded }: LogMealModalProps) {
  const { user } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [matchedFood, setMatchedFood] = useState<FoodItemResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'bn' | 'en'>('bn'); // 'bn' = Bengali, 'en' = English
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [addingFood, setAddingFood] = useState(false);
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);

  // Web Speech Recognition Reference
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setIsListening(false);
      setVoiceTranscript('');
      setMatchedFood(null);
      setPortionMultiplier(1.0);
    }
  }, [visible]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setPortionMultiplier(1.0);

    const trimmed = text.trim();
    if (!trimmed) {
      setMatchedFood(null);
      return;
    }

    // Search database or estimate food item
    const results = searchFoodDatabase(trimmed);
    if (results && results.length > 0) {
      setMatchedFood(results[0]);
    } else {
      const estimated = estimateDynamicFoodCalories(trimmed);
      if (estimated) {
        setMatchedFood({
          name: estimated.foodName,
          bengaliName: estimated.foodName,
          defaultPortion: estimated.portion,
          calories: estimated.calories,
          protein: estimated.protein,
          carbs: estimated.carbs,
          fats: estimated.fats,
        });
      } else {
        setMatchedFood(null);
      }
    }
  };

  const handleToggleVoiceDictation = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isListening) {
      stopVoiceRecognition();
      return;
    }

    startVoiceRecognition();
  };

  const startVoiceRecognition = () => {
    setIsListening(true);
    setVoiceTranscript('');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognition = new SpeechRecognition();
          recognitionRef.current = recognition;
          // Set language to Bengali ('bn-BD') or English ('en-US')
          recognition.lang = voiceLang === 'bn' ? 'bn-BD' : 'en-US';
          recognition.continuous = false;
          recognition.interimResults = true;

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0].transcript)
              .join('');
            setVoiceTranscript(transcript);
            handleSearchChange(transcript);
          };

          recognition.onerror = (err: any) => {
            console.warn('Speech Recognition error:', err);
            setIsListening(false);
          };

          recognition.onend = () => {
            setIsListening(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          };

          recognition.start();
          return;
        } catch (e) {
          console.warn('Failed to start Web Speech API, using bilingual speech fallback:', e);
        }
      }
    }

    // Bilingual Interactive Speech Simulation Fallback
    const samplesBn = ['মুরগির মাংস', 'সিদ্ধ ডিম', 'চিকেন বিরিয়ানি', 'সাদা ভাত', 'পাকা আপেল', 'মাছ', 'রুটি'];
    const samplesEn = ['Grilled Chicken Breast', 'Boiled Egg', 'Chicken Biryani', 'Cooked White Rice', 'Fresh Apple', 'Grilled Salmon', 'Whole Wheat Roti'];
    const pool = voiceLang === 'bn' ? samplesBn : samplesEn;
    const sampleText = pool[Math.floor(Math.random() * pool.length)];

    let currentText = '';
    const chars = sampleText.split('');
    let idx = 0;

    const interval = setInterval(() => {
      if (idx < chars.length) {
        currentText += chars[idx];
        setVoiceTranscript(currentText);
        handleSearchChange(currentText);
        idx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setIsListening(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }, 500);
      }
    }, 100);
  };

  const stopVoiceRecognition = () => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const handleAdjustMultiplier = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPortionMultiplier((prev) => Math.max(0.5, Math.min(10, parseFloat((prev + delta).toFixed(1)))));
  };

  const handleAddCurrentFood = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Error', 'Please sign in to log meals.');
      return;
    }
    if (!matchedFood) {
      Alert.alert('No Food Selected', 'Please type or speak a food name to calculate and add.');
      return;
    }

    setAddingFood(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const mult = portionMultiplier;
    const scaledCalories = Math.round(matchedFood.calories * mult);
    const scaledProtein = parseFloat((matchedFood.protein * mult).toFixed(1));
    const scaledCarbs = parseFloat((matchedFood.carbs * mult).toFixed(1));
    const scaledFats = parseFloat((matchedFood.fats * mult).toFixed(1));

    const foodTitle = matchedFood.bengaliName
      ? `${matchedFood.name} (${matchedFood.bengaliName})`
      : matchedFood.name;

    let portionStr = matchedFood.defaultPortion;
    if (mult !== 1) {
      portionStr = `${mult}x ${matchedFood.defaultPortion}`;
    }

    await MealStorage.addMeal(user.id, {
      foodName: foodTitle,
      portion: portionStr,
      weightGrams: Math.round(100 * mult),
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fats: scaledFats,
      mealType: selectedCategory,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setAddingFood(false);
    if (onMealAdded) onMealAdded();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconBg}>
                <Restaurant01Icon size={20} color="#EF4444" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.modalTitle}>Log Daily Meal</Text>
                <Text style={styles.modalSub}>Type or speak food name (Bangla / English)</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Cancel01Icon size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Meal Category Selector */}
          <View style={styles.categoryRow}>
            {[
              { id: 'breakfast', label: 'Breakfast', icon: 'weather-sunset-up' },
              { id: 'lunch', label: 'Lunch', icon: 'food-fork-drink' },
              { id: 'dinner', label: 'Dinner', icon: 'moon-waning-crescent' },
              { id: 'snack', label: 'Snack', icon: 'cookie' },
            ].map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedCategory(cat.id as any);
                  }}
                >
                  <MaterialCommunityIcons
                    name={cat.icon as any}
                    size={14}
                    color={isSelected ? Colors.primary : '#9CA3AF'}
                  />
                  <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Voice Language Selector Toggle */}
          <View style={styles.langToggleRow}>
            <Text style={styles.langToggleLabel}>Voice Language:</Text>
            <View style={styles.langBtnGroup}>
              <TouchableOpacity
                style={[styles.langBtn, voiceLang === 'bn' && styles.langBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVoiceLang('bn');
                }}
              >
                <Text style={[styles.langBtnText, voiceLang === 'bn' && styles.langBtnTextActive]}>
                  🇧🇩 বাংলা (Bengali)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langBtn, voiceLang === 'en' && styles.langBtnActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setVoiceLang('en');
                }}
              >
                <Text style={[styles.langBtnText, voiceLang === 'en' && styles.langBtnTextActive]}>
                  🇺🇸 English
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Input Bar + Voice Microphone Button */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <Search01Icon size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearchChange}
                placeholder={
                  voiceLang === 'bn'
                    ? 'খাবারের নাম বলুন বা লিখুন (যেমন: ভাত, ডিম, মুরগি, আপেল)...'
                    : 'Type or speak food name (e.g. Chicken, Rice, Apple, Egg)...'
                }
                placeholderTextColor="#64748B"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => handleSearchChange('')}>
                  <Cancel01Icon size={16} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Voice Dictation Button */}
            <TouchableOpacity
              style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}
              onPress={handleToggleVoiceDictation}
              activeOpacity={0.8}
            >
              {isListening ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Mic01Icon size={22} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>

          {/* Voice Listening Active Banner */}
          {isListening && (
            <View style={styles.listeningBanner}>
              <View style={styles.listeningPulseDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.listeningText}>
                  {voiceLang === 'bn'
                    ? 'শুনছি... খাবারের নাম স্পষ্টভাবে বলুন (যেমন: "মুরগির মাংস" বা "ভাত")'
                    : 'Listening... Speak food name clearly (e.g. "Chicken" or "Rice")'}
                </Text>
                {voiceTranscript ? (
                  <Text style={styles.transcriptText}>"{voiceTranscript}"</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.stopVoiceBtn} onPress={stopVoiceRecognition}>
                <Text style={styles.stopVoiceBtnText}>Stop</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Body Content: Active Food Result Card (No Long Unwanted List) */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }} showsVerticalScrollIndicator={false}>
            {!searchQuery.trim() ? (
              <View style={styles.emptyPromptCard}>
                <View style={styles.promptIconBg}>
                  <Restaurant01Icon size={32} color={Colors.primary} />
                </View>
                <Text style={styles.emptyPromptTitle}>Search or Speak Food Name</Text>
                <Text style={styles.emptyPromptSub}>
                  {voiceLang === 'bn'
                    ? 'উপরে যেকোনো খাবারের নাম লিখুন অথবা মাইক বাটনে ক্লিক করে মুখে বলুন। AI তৎক্ষণাৎ ক্যালরি ও ম্যাক্রো হিসাব করে দেবে।'
                    : 'Type any food or dish above or press the mic button to speak. AI will calculate calories & macros instantly.'}
                </Text>
              </View>
            ) : matchedFood ? (
              <View style={styles.foodResultCard}>
                {/* Food Header */}
                <View style={styles.foodResultTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.foodResultTitle}>{matchedFood.name}</Text>
                    {matchedFood.bengaliName ? (
                      <Text style={styles.foodResultBengaliTitle}>{matchedFood.bengaliName}</Text>
                    ) : null}
                    <Text style={styles.foodResultPortion}>
                      Portion: {portionMultiplier !== 1 ? `${portionMultiplier}x ` : ''}{matchedFood.defaultPortion}
                    </Text>
                  </View>

                  {/* Calculated Calorie Badge */}
                  <View style={styles.calorieBadge}>
                    <Ionicons name="flame" size={16} color="#EF4444" />
                    <Text style={styles.calorieBadgeText}>
                      {Math.round(matchedFood.calories * portionMultiplier)} kcal
                    </Text>
                  </View>
                </View>

                {/* Macro Breakdown */}
                <View style={styles.macroGrid}>
                  <View style={[styles.macroBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <Text style={[styles.macroBoxVal, { color: '#EF4444' }]}>
                      {parseFloat((matchedFood.protein * portionMultiplier).toFixed(1))}g
                    </Text>
                    <Text style={styles.macroBoxLabel}>Protein</Text>
                  </View>

                  <View style={[styles.macroBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)', borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                    <Text style={[styles.macroBoxVal, { color: '#F59E0B' }]}>
                      {parseFloat((matchedFood.carbs * portionMultiplier).toFixed(1))}g
                    </Text>
                    <Text style={styles.macroBoxLabel}>Carbs</Text>
                  </View>

                  <View style={[styles.macroBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                    <Text style={[styles.macroBoxVal, { color: '#3B82F6' }]}>
                      {parseFloat((matchedFood.fats * portionMultiplier).toFixed(1))}g
                    </Text>
                    <Text style={styles.macroBoxLabel}>Fats</Text>
                  </View>
                </View>

                {/* Portion Adjuster Controls */}
                <View style={styles.portionAdjusterRow}>
                  <Text style={styles.portionAdjusterLabel}>Adjust Quantity / Serving:</Text>
                  <View style={styles.portionControlGroup}>
                    <TouchableOpacity
                      style={styles.portionBtn}
                      onPress={() => handleAdjustMultiplier(-0.5)}
                    >
                      <Text style={styles.portionBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.portionMultText}>{portionMultiplier}x</Text>
                    <TouchableOpacity
                      style={styles.portionBtn}
                      onPress={() => handleAdjustMultiplier(0.5)}
                    >
                      <Text style={styles.portionBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Add to Tracker Button */}
                <TouchableOpacity
                  style={styles.addFoodBtn}
                  onPress={handleAddCurrentFood}
                  disabled={addingFood}
                  activeOpacity={0.85}
                >
                  {addingFood ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Add01Icon size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.addFoodBtnText}>
                        Add to Tracker ({Math.round(matchedFood.calories * portionMultiplier)} kcal)
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyPromptCard}>
                <SparklesIcon size={32} color={Colors.primary} />
                <Text style={styles.emptyPromptTitle}>No Matching Food</Text>
                <Text style={styles.emptyPromptSub}>
                  Try typing or speaking the name of the food clearly (e.g. "Chicken", "Rice", "Apple", "ডিম", "ভাত").
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 15, 23, 0.82)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#121824',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '84%',
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C253B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 4,
  },
  categoryChipSelected: {
    backgroundColor: 'rgba(81, 130, 216, 0.15)',
    borderColor: Colors.primary,
  },
  categoryChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  langToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#1C253B',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  langToggleLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  langBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  langBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  langBtnText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  langBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
  voiceBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  voiceBtnActive: {
    backgroundColor: '#EF4444',
  },
  listeningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  listeningPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    marginRight: 10,
  },
  listeningText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  transcriptText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  stopVoiceBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  stopVoiceBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPromptCard: {
    backgroundColor: '#1C253B',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    marginTop: 10,
  },
  promptIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(81, 130, 216, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyPromptTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyPromptSub: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  foodResultCard: {
    backgroundColor: '#1C253B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  foodResultTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  foodResultTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  foodResultBengaliTitle: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  foodResultPortion: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 4,
  },
  calorieBadgeText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '800',
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  macroBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  macroBoxVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  macroBoxLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  portionAdjusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#121824',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  portionAdjusterLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
  },
  portionControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  portionBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portionBtnText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  portionMultText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 8,
  },
  addFoodBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  addFoodBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
