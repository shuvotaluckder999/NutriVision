import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import {
  Add01Icon,
  CheckmarkCircle01Icon,
  DropletIcon,
  InformationCircleIcon,
  PencilEdit01Icon,
  RefreshIcon,
  Remove01Icon,
  SparklesIcon,
  Cancel01Icon,
} from 'hugeicons-react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { calculateFallbackMetrics } from '../services/geminiService';
import { OnboardingStorage, UserOnboardingData } from '../utils/onboardingStorage';
import { WaterStorage } from '../utils/waterStorage';

interface LogWaterModalProps {
  visible: boolean;
  onClose: () => void;
  onWaterUpdated?: () => void;
}

export function LogWaterModal({ visible, onClose, onWaterUpdated }: LogWaterModalProps) {
  const { theme } = useTheme();
  const { user } = useUser();
  const userId = user?.id || 'demo_user';

  // User profile & AI Metrics State
  const [userProfile, setUserProfile] = useState<UserOnboardingData | null>(null);
  const [aiWaterLiters, setAiWaterLiters] = useState<number>(3.0);
  const [aiWaterGlasses, setAiWaterGlasses] = useState<number>(12);
  const [targetWaterLiters, setTargetWaterLiters] = useState<number>(3.0);
  const [loggedWaterLiters, setLoggedWaterLiters] = useState<number>(0.0);

  // Custom Goal Editing State
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [customGoalInput, setCustomGoalInput] = useState<string>('3.0');

  // Additional custom quick logging input
  const [customAddInput, setCustomAddInput] = useState<string>('');

  // User Metabolic Metrics
  const [userAge, setUserAge] = useState<number>(28);
  const [userWeight, setUserWeight] = useState<string>('70');
  const [userHeightStr, setUserHeightStr] = useState<string>("5'9\"");
  const [userBmi, setUserBmi] = useState<number>(22.4);
  const [userBmr, setUserBmr] = useState<number>(1680);

  // Load user data and water intake whenever modal opens
  useEffect(() => {
    if (visible) {
      loadHydrationData();
    }
  }, [visible, userId]);

  const loadHydrationData = async () => {
    try {
      // 1. Fetch user onboarding data
      const profile = await OnboardingStorage.getOnboardingData(userId);
      setUserProfile(profile);

      // Extract user physical metrics
      const weightKg = parseFloat(profile?.weight?.kg || '70') || 70;
      const feet = parseFloat(profile?.height?.feet || '5') || 5;
      const inches = parseFloat(profile?.height?.inches || '9') || 9;
      const birthYear = parseInt(profile?.birthdate?.year || '1998', 10) || 1998;
      const currentYear = new Date().getFullYear();
      const age = Math.max(15, currentYear - birthYear);

      setUserAge(age);
      setUserWeight(weightKg.toString());
      setUserHeightStr(`${feet}'${inches}"`);

      // Calculate precision metabolic metrics (BMI & BMR & Water)
      const selections = {
        gender: profile?.gender || 'male',
        goal: profile?.goal || 'maintain',
        workoutDays: profile?.workoutDays || '3-7 Days',
        birthdate: profile?.birthdate || { day: '15', month: '06', year: '1998' },
        height: profile?.height || { feet: feet.toString(), inches: inches.toString() },
        weight: profile?.weight || { kg: weightKg.toString() },
      };

      const calculated = calculateFallbackMetrics(selections);
      const recLiters = profile?.nutritionPlan?.waterLiters || calculated.waterLiters || 3.0;
      const recGlasses = profile?.nutritionPlan?.waterGlasses || Math.round(recLiters * 4);

      setAiWaterLiters(recLiters);
      setAiWaterGlasses(recGlasses);
      setUserBmi(calculated.bmi);
      setUserBmr(calculated.bmr);

      // Active target (user customized or AI default)
      const activeTarget = profile?.nutritionPlan?.waterLiters || recLiters;
      setTargetWaterLiters(activeTarget);
      setCustomGoalInput(activeTarget.toString());

      // 2. Fetch today's logged water intake
      const currentLogged = await WaterStorage.getLoggedWater(userId);
      setLoggedWaterLiters(currentLogged);
    } catch (err) {
      console.error('Error loading hydration data in modal:', err);
    }
  };

  // Add water intake (+250ml, +500ml, +1.0L, or custom)
  const handleAddWater = async (litersToAdd: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = await WaterStorage.addWaterLog(userId, litersToAdd);
    setLoggedWaterLiters(updated);
    if (onWaterUpdated) onWaterUpdated();
  };

  // Remove water intake (-250ml)
  const handleSubtractWater = async (litersToSub: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newTotal = Math.max(0, loggedWaterLiters - litersToSub);
    const updated = await WaterStorage.setWaterLog(userId, newTotal);
    setLoggedWaterLiters(updated);
    if (onWaterUpdated) onWaterUpdated();
  };

  // Log custom typed water amount (in ml or L)
  const handleLogCustomInput = async () => {
    const raw = customAddInput.trim();
    if (!raw) return;

    let num = parseFloat(raw);
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid positive number for water intake.');
      return;
    }

    // If user enters > 20, assume milliliters (ml) and convert to Liters
    if (num > 20) {
      num = num / 1000;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const updated = await WaterStorage.addWaterLog(userId, num);
    setLoggedWaterLiters(updated);
    setCustomAddInput('');
    if (onWaterUpdated) onWaterUpdated();
  };

  // Reset today's logged water to 0
  const handleResetToday = async () => {
    Alert.alert(
      "Reset Today's Water Log",
      'Are you sure you want to reset your water intake for today to 0 Liters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            const updated = await WaterStorage.resetWaterLog(userId);
            setLoggedWaterLiters(updated);
            if (onWaterUpdated) onWaterUpdated();
          },
        },
      ]
    );
  };

  // Save edited custom daily water goal
  const handleSaveCustomGoal = async () => {
    const val = parseFloat(customGoalInput.trim());
    if (isNaN(val) || val < 0.5 || val > 15.0) {
      Alert.alert('Invalid Target', 'Please enter a daily water target between 0.5L and 15.0L.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTargetWaterLiters(val);
    setIsEditingGoal(false);

    // Save to OnboardingStorage & sync to Firestore
    await OnboardingStorage.updateNutritionGoals(userId, { waterLiters: val });
    if (onWaterUpdated) onWaterUpdated();
  };

  // Reset custom goal to AI recommended water target
  const handleResetGoalToAI = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTargetWaterLiters(aiWaterLiters);
    setCustomGoalInput(aiWaterLiters.toString());
    setIsEditingGoal(false);

    await OnboardingStorage.updateNutritionGoals(userId, { waterLiters: aiWaterLiters });
    if (onWaterUpdated) onWaterUpdated();
  };

  // Calculated values
  const targetGlasses = Math.round(targetWaterLiters * 4);
  const consumedGlasses = Math.round(loggedWaterLiters * 4);
  const percentCompleted = Math.min(100, Math.round((loggedWaterLiters / targetWaterLiters) * 100));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                <DropletIcon size={24} color="#38BDF8" />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Log Water Intake</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>
                  Daily Hydration & AI Recommendations
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
            >
              <Cancel01Icon size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* 1. AI Recommendation Banner based on Age, Weight, Height, BMI & BMR */}
            <View style={[styles.aiCard, { backgroundColor: theme.cardSecondary, borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
              <View style={styles.aiCardHeader}>
                <View style={styles.aiBadge}>
                  <SparklesIcon size={14} color="#38BDF8" />
                  <Text style={styles.aiBadgeText}>AI Clinical Recommendation</Text>
                </View>
                <Text style={styles.aiTargetHighlight}>
                  {aiWaterLiters} L <Text style={styles.aiGlassesText}>({aiWaterGlasses} Glasses)</Text>
                </Text>
              </View>

              <Text style={[styles.aiDescription, { color: theme.text }]}>
                Based on your metabolic profile, your body requires{' '}
                <Text style={{ fontWeight: '700', color: '#38BDF8' }}>{aiWaterLiters} Liters</Text> of water daily for optimal organ hydration & metabolic efficiency.
              </Text>

              {/* User Metric Chips */}
              <View style={styles.metricsRow}>
                <View style={[styles.metricChip, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Age</Text>
                  <Text style={[styles.metricVal, { color: theme.text }]}>{userAge} yrs</Text>
                </View>
                <View style={[styles.metricChip, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Weight</Text>
                  <Text style={[styles.metricVal, { color: theme.text }]}>{userWeight} kg</Text>
                </View>
                <View style={[styles.metricChip, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>Height</Text>
                  <Text style={[styles.metricVal, { color: theme.text }]}>{userHeightStr}</Text>
                </View>
                <View style={[styles.metricChip, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>BMI</Text>
                  <Text style={[styles.metricVal, { color: Colors.primary }]}>{userBmi}</Text>
                </View>
                <View style={[styles.metricChip, { backgroundColor: theme.primaryBg }]}>
                  <Text style={[styles.metricLabel, { color: theme.textMuted }]}>BMR</Text>
                  <Text style={[styles.metricVal, { color: '#F59E0B' }]}>{userBmr} kcal</Text>
                </View>
              </View>
            </View>

            {/* 2. Interactive Water Progress Card */}
            <View style={[styles.progressCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={styles.progressHeaderRow}>
                <View>
                  <Text style={[styles.progressTitle, { color: theme.text }]}>Today's Hydration Progress</Text>
                  <Text style={[styles.progressSub, { color: theme.textMuted }]}>
                    {consumedGlasses} of {targetGlasses} Glasses Consumed
                  </Text>
                </View>

                {/* Edit Goal Toggle */}
                <TouchableOpacity
                  style={[styles.editGoalBtn, { backgroundColor: theme.primaryBg }]}
                  onPress={() => setIsEditingGoal(!isEditingGoal)}
                >
                  <PencilEdit01Icon size={14} color={Colors.primary} />
                  <Text style={styles.editGoalBtnText}>
                    {isEditingGoal ? 'Cancel' : 'Edit Goal'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Progress Big Counter */}
              <View style={styles.counterRow}>
                <Text style={styles.loggedValText}>
                  {loggedWaterLiters.toFixed(2)}{' '}
                  <Text style={[styles.targetValText, { color: theme.textMuted }]}>
                    / {targetWaterLiters.toFixed(1)} L
                  </Text>
                </Text>

                <View style={[styles.percentBadge, { backgroundColor: percentCompleted >= 100 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)' }]}>
                  <Text style={[styles.percentText, { color: percentCompleted >= 100 ? '#22C55E' : '#38BDF8' }]}>
                    {percentCompleted}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressBarBg, { backgroundColor: theme.trackBg }]}>
                <View style={[styles.progressBarFill, { width: `${percentCompleted}%` }]} />
              </View>

              {/* Glass Icons Grid Visualizer */}
              <View style={styles.glassGrid}>
                {Array.from({ length: Math.max(8, Math.min(16, targetGlasses)) }).map((_, idx) => {
                  const isFilled = idx < consumedGlasses;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.glassIconBox,
                        {
                          backgroundColor: isFilled ? 'rgba(56, 189, 248, 0.2)' : theme.primaryBg,
                          borderColor: isFilled ? '#38BDF8' : theme.border,
                        },
                      ]}
                    >
                      <DropletIcon
                        size={16}
                        color={isFilled ? '#38BDF8' : theme.textMuted}
                      />
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 3. Custom Water Goal Editor (Shown when Editing) */}
            {isEditingGoal && (
              <View style={[styles.customGoalContainer, { backgroundColor: theme.cardSecondary, borderColor: Colors.primary }]}>
                <Text style={[styles.editSectionTitle, { color: theme.text }]}>Customize Daily Water Goal</Text>
                <Text style={[styles.editSectionSub, { color: theme.textMuted }]}>
                  Default is set by AI recommendation based on your BMI & BMR. You can adjust your custom target below:
                </Text>

                <View style={styles.editInputRow}>
                  <TextInput
                    style={[styles.goalTextInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    keyboardType="decimal-pad"
                    value={customGoalInput}
                    onChangeText={setCustomGoalInput}
                    placeholder="3.0"
                    placeholderTextColor={theme.textMuted}
                  />
                  <Text style={[styles.unitText, { color: theme.text }]}>Liters</Text>
                </View>

                {/* Quick adjustments */}
                <View style={styles.quickAdjustRow}>
                  <TouchableOpacity
                    style={[styles.quickAdjustBtn, { backgroundColor: theme.primaryBg }]}
                    onPress={() => {
                      const cur = parseFloat(customGoalInput) || targetWaterLiters;
                      const next = Math.max(0.5, parseFloat((cur - 0.25).toFixed(2)));
                      setCustomGoalInput(next.toString());
                    }}
                  >
                    <Remove01Icon size={14} color={theme.text} />
                    <Text style={[styles.quickAdjustText, { color: theme.text }]}>-0.25L</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickAdjustBtn, { backgroundColor: theme.primaryBg }]}
                    onPress={() => {
                      const cur = parseFloat(customGoalInput) || targetWaterLiters;
                      const next = parseFloat((cur + 0.25).toFixed(2));
                      setCustomGoalInput(next.toString());
                    }}
                  >
                    <Add01Icon size={14} color={theme.text} />
                    <Text style={[styles.quickAdjustText, { color: theme.text }]}>+0.25L</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.quickAdjustBtn, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                    onPress={handleResetGoalToAI}
                  >
                    <RefreshIcon size={14} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#F59E0B', marginLeft: 4 }}>Reset AI ({aiWaterLiters}L)</Text>
                  </TouchableOpacity>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveGoalBtn, { backgroundColor: Colors.primary }]}
                  onPress={handleSaveCustomGoal}
                >
                  <CheckmarkCircle01Icon size={18} color="#FFFFFF" />
                  <Text style={styles.saveGoalBtnText}>Save Target Goal</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 4. Quick Water Logging Buttons */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Log Intake</Text>

            <View style={styles.quickAddGrid}>
              <TouchableOpacity
                style={[styles.quickAddCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => handleAddWater(0.25)}
              >
                <View style={[styles.quickAddIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <DropletIcon size={22} color="#38BDF8" />
                </View>
                <Text style={[styles.quickAddTitle, { color: theme.text }]}>+1 Glass</Text>
                <Text style={[styles.quickAddSub, { color: theme.textMuted }]}>250 ml (0.25L)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAddCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => handleAddWater(0.5)}
              >
                <View style={[styles.quickAddIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.25)' }]}>
                  <DropletIcon size={24} color="#38BDF8" />
                </View>
                <Text style={[styles.quickAddTitle, { color: theme.text }]}>+2 Glasses</Text>
                <Text style={[styles.quickAddSub, { color: theme.textMuted }]}>500 ml (0.50L)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickAddCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => handleAddWater(1.0)}
              >
                <View style={[styles.quickAddIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.35)' }]}>
                  <DropletIcon size={26} color="#38BDF8" />
                </View>
                <Text style={[styles.quickAddTitle, { color: theme.text }]}>+1 Bottle</Text>
                <Text style={[styles.quickAddSub, { color: theme.textMuted }]}>1000 ml (1.00L)</Text>
              </TouchableOpacity>
            </View>

            {/* Custom Log Input & Subtraction / Reset Row */}
            <View style={[styles.customAddRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={styles.customInputContainer}>
                <TextInput
                  style={[styles.customAddInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                  placeholder="Custom ml / L (e.g. 350)"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  value={customAddInput}
                  onChangeText={setCustomAddInput}
                />
                <TouchableOpacity
                  style={[styles.logAddBtn, { backgroundColor: Colors.primary }]}
                  onPress={handleLogCustomInput}
                >
                  <Add01Icon size={18} color="#FFFFFF" />
                  <Text style={styles.logAddBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.secondaryActionsRow}>
                <TouchableOpacity
                  style={[styles.subBtn, { backgroundColor: theme.primaryBg }]}
                  onPress={() => handleSubtractWater(0.25)}
                >
                  <Remove01Icon size={14} color={theme.text} />
                  <Text style={[styles.subBtnText, { color: theme.text }]}>-250 ml</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetBtn, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}
                  onPress={handleResetToday}
                >
                  <RefreshIcon size={14} color="#EF4444" />
                  <Text style={styles.resetBtnText}>Reset Today</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
    gap: 16,
  },
  aiCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  aiTargetHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: '#38BDF8',
  },
  aiGlassesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  aiDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 58,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  progressCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressSub: {
    fontSize: 11,
    marginTop: 2,
  },
  editGoalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  editGoalBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  loggedValText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#38BDF8',
  },
  targetValText: {
    fontSize: 16,
    fontWeight: '600',
  },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 5,
  },
  glassGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  glassIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customGoalContainer: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  editSectionSub: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  goalTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  quickAdjustBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickAdjustText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  saveGoalBtn: {
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveGoalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  quickAddGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickAddCard: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickAddIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickAddTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickAddSub: {
    fontSize: 10,
    marginTop: 2,
  },
  customAddRow: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  customInputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  customAddInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  logAddBtn: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  subBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resetBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
});
