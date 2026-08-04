import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity01Icon,
  AnalyticsUpIcon,
  CheckmarkCircle01Icon,
  DropletIcon,
  Dumbbell01Icon,
  FireIcon,
  FlashIcon,
  InformationCircleIcon,
  Restaurant01Icon,
  Shield01Icon,
  SparklesIcon,
} from 'hugeicons-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { AINutritionPlan, generateAINutritionPlan, UserSelections } from '../services/geminiService';
import { OnboardingStorage } from '../utils/onboardingStorage';

interface StepItem {
  id: number;
  label: string;
  status: 'pending' | 'loading' | 'completed';
}

const INITIAL_STEPS: StepItem[] = [
  { id: 1, label: 'Profile & Physical Metrics Analysis', status: 'pending' },
  { id: 2, label: 'BMR & Daily Energy Expenditure (TDEE)', status: 'pending' },
  { id: 3, label: 'Database & Sync Initialization', status: 'pending' },
  { id: 4, label: 'Gemini AI Strategy & Macro Generation', status: 'pending' },
];

export default function GeneratingPlanScreen() {
  const { user } = useUser();
  const router = useRouter();
  const params = useLocalSearchParams<{
    gender?: string;
    goal?: string;
    workoutDays?: string;
    day?: string;
    month?: string;
    year?: string;
    feet?: string;
    inches?: string;
    weightKg?: string;
  }>();

  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStepText, setCurrentStepText] = useState('Initializing profile analysis...');
  const [isGenerating, setIsGenerating] = useState(true);
  const [planData, setPlanData] = useState<AINutritionPlan | null>(null);
  const [isSavedToFirebase, setIsSavedToFirebase] = useState(false);
  const [steps, setSteps] = useState<StepItem[]>(INITIAL_STEPS);
  const [spinAnim] = useState(new Animated.Value(0));

  const updateStepStatus = (stepId: number, status: 'pending' | 'loading' | 'completed') => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  // Pulse / Spin animation for loader
  useEffect(() => {
    if (isGenerating) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isGenerating, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    let isMounted = true;

    async function runGenerationFlow() {
      if (!user) return;

      const selections: UserSelections = {
        gender: params.gender || 'male',
        goal: params.goal || 'maintain',
        workoutDays: params.workoutDays || '3-7 Days',
        birthdate: {
          day: params.day || '15',
          month: params.month || '06',
          year: params.year || '1998',
        },
        height: {
          feet: params.feet || '5',
          inches: params.inches || '9',
        },
        weight: {
          kg: params.weightKg || '68',
        },
      };

      // Step 1: Initializing Profile Analysis (Dummy Timer)
      if (!isMounted) return;
      updateStepStatus(1, 'loading');
      setProgressPercent(20);
      setCurrentStepText('Analyzing body parameters & metabolic baseline...');
      await new Promise((r) => setTimeout(r, 800));
      if (!isMounted) return;
      updateStepStatus(1, 'completed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 2: BMR & Energy Calculations (Dummy Timer)
      if (!isMounted) return;
      updateStepStatus(2, 'loading');
      setProgressPercent(45);
      setCurrentStepText('Calculating Basal Metabolic Rate (BMR) & TDEE...');
      await new Promise((r) => setTimeout(r, 900));
      if (!isMounted) return;
      updateStepStatus(2, 'completed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 3: Database & Sync Setup (Dummy Timer)
      if (!isMounted) return;
      updateStepStatus(3, 'loading');
      setProgressPercent(70);
      setCurrentStepText('Initializing user profile & database sync...');
      await new Promise((r) => setTimeout(r, 800));
      if (!isMounted) return;
      updateStepStatus(3, 'completed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Step 4: AI Response Generation (REAL CALL - Last Step)
      if (!isMounted) return;
      updateStepStatus(4, 'loading');
      setProgressPercent(88);
      setCurrentStepText('Consulting Gemini AI model for macro & hydration strategy...');

      const generatedPlan = await generateAINutritionPlan(selections);
      const saveResult = await OnboardingStorage.saveOnboardingData(user.id, selections, generatedPlan);

      if (!isMounted) return;
      setPlanData(generatedPlan);
      setIsSavedToFirebase(saveResult.firestoreSaved);
      updateStepStatus(4, 'completed');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Finished
      setProgressPercent(100);
      setCurrentStepText('AI Plan Ready!');
      await new Promise((r) => setTimeout(r, 600));

      if (!isMounted) return;
      setIsGenerating(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    runGenerationFlow();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFinish = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F17" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiBadge}>
          <SparklesIcon size={18} color={Colors.primary} />
          <Text style={styles.aiBadgeText}>Gemini AI Powered</Text>
        </View>
        <Text style={styles.headerTitle}>
          {isGenerating ? 'Generating Your Plan' : 'Your Custom AI Plan'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* LOADING STATE */}
        {isGenerating ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loaderGraphicBox}>
              <Animated.View style={[styles.spinnerRing, { transform: [{ rotate: spin }] }]} />
              <View style={styles.innerIconBox}>
                <FlashIcon size={38} color={Colors.primary} />
              </View>
            </View>

            <Text style={styles.loadingProgressTitle}>{progressPercent}%</Text>
            <Text style={styles.loadingStepText}>{currentStepText}</Text>

            {/* Visual Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>

            {/* Informational Loading Steps Checklist */}
            <View style={styles.checklistCard}>
              {steps.map((step) => {
                const isLoading = step.status === 'loading';
                const isCompleted = step.status === 'completed';

                return (
                  <View
                    key={step.id}
                    style={[
                      styles.checkItem,
                      isLoading && styles.checkItemLoading,
                      isCompleted && styles.checkItemCompleted,
                    ]}
                  >
                    <View style={styles.checkIconBox}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : isCompleted ? (
                        <CheckmarkCircle01Icon size={20} color="#10B981" />
                      ) : (
                        <View style={styles.pendingDot} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.checkText,
                        isLoading && styles.checkTextLoading,
                        isCompleted && styles.checkTextDone,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          /* RESULT STATE */
          <View style={styles.resultsContainer}>
            {/* Firebase Sync Success Badge */}
            {isSavedToFirebase && (
              <View style={styles.savedBadge}>
                <Shield01Icon size={18} color="#10B981" />
                <Text style={styles.savedBadgeText}>Saved to Firebase Database for your user account</Text>
              </View>
            )}

            {/* Calorie Card Banner */}
            <View style={styles.heroCalorieCard}>
              <View style={styles.heroHeader}>
                <FireIcon size={28} color="#FF6B6B" />
                <View style={styles.heroHeaderText}>
                  <Text style={styles.heroSubtitle}>Daily Energy Requirement</Text>
                  <Text style={styles.heroTitle}>{planData?.calories} kcal</Text>
                </View>
              </View>
              <Text style={styles.heroDesc}>
                Based on your goal to <Text style={{ color: Colors.primary, fontWeight: '700' }}>{params.goal?.toUpperCase()}</Text> weight and active training schedule.
              </Text>
            </View>

            {/* Macro Cards Grid */}
            <Text style={styles.sectionHeaderTitle}>Target Macros (Daily)</Text>
            <View style={styles.macroGrid}>
              {/* Protein */}
              <View style={styles.macroStatCard}>
                <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Activity01Icon size={22} color="#EF4444" />
                </View>
                <Text style={styles.macroStatValue}>{planData?.protein}g</Text>
                <Text style={styles.macroStatLabel}>Protein</Text>
                <Text style={styles.macroStatSub}>Muscle recovery</Text>
              </View>

              {/* Carbs */}
              <View style={styles.macroStatCard}>
                <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Restaurant01Icon size={22} color="#F59E0B" />
                </View>
                <Text style={styles.macroStatValue}>{planData?.carbs}g</Text>
                <Text style={styles.macroStatLabel}>Carbs</Text>
                <Text style={styles.macroStatSub}>Energy fuel</Text>
              </View>

              {/* Fats */}
              <View style={styles.macroStatCard}>
                <View style={[styles.macroIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <AnalyticsUpIcon size={22} color="#3B82F6" />
                </View>
                <Text style={styles.macroStatValue}>{planData?.fats}g</Text>
                <Text style={styles.macroStatLabel}>Fats</Text>
                <Text style={styles.macroStatSub}>Hormonal balance</Text>
              </View>
            </View>

            {/* Water Requirement Card */}
            <View style={styles.waterCard}>
              <View style={styles.waterHeader}>
                <View style={styles.waterIconBg}>
                  <DropletIcon size={26} color="#38BDF8" />
                </View>
                <View style={styles.waterHeaderText}>
                  <Text style={styles.waterTitle}>Daily Water Requirement</Text>
                  <Text style={styles.waterValue}>
                    {planData?.waterLiters} Liters <Text style={styles.waterSubValue}>({planData?.waterGlasses} glasses / day)</Text>
                  </Text>
                </View>
              </View>
              <Text style={styles.waterDesc}>
                Optimal hydration improves metabolic speed, nutrient absorption, and athletic endurance.
              </Text>
            </View>

            {/* Body Metrics Summary Card */}
            <View style={styles.metricsRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>BMI Score</Text>
                <Text style={styles.metricValue}>{planData?.bmi}</Text>
                <Text style={styles.metricCategory}>{planData?.bmiCategory}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Basal Metabolic Rate</Text>
                <Text style={styles.metricValue}>{planData?.bmr} kcal</Text>
                <Text style={styles.metricCategory}>Resting BMR</Text>
              </View>
            </View>

            {/* AI Fitness Advice Card */}
            <View style={styles.aiAdviceCard}>
              <View style={styles.adviceHeader}>
                <SparklesIcon size={22} color={Colors.primary} />
                <Text style={styles.adviceTitle}>Gemini AI Strategy & Insights</Text>
              </View>
              <Text style={styles.adviceBody}>{planData?.fitnessAdvice}</Text>

              {/* Workout Structure */}
              <View style={styles.workoutBox}>
                <Dumbbell01Icon size={20} color={Colors.primary} style={{ marginTop: 2 }} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.workoutTitle}>Workout Strategy</Text>
                  <Text style={styles.workoutDesc}>{planData?.workoutRecommendation}</Text>
                </View>
              </View>

              {/* Meal Tips */}
              {planData?.mealTips && planData.mealTips.length > 0 && (
                <View style={styles.tipsSection}>
                  <Text style={styles.tipsHeading}>Key Nutrition Tips</Text>
                  {planData.mealTips.map((tip, idx) => (
                    <View key={`tip-${idx}`} style={styles.tipRow}>
                      <InformationCircleIcon size={16} color={Colors.primary} style={{ marginTop: 3 }} />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Navigation Button */}
      {!isGenerating && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish} activeOpacity={0.85}>
            <Text style={styles.finishBtnText}>Go to Dashboard</Text>
            <CheckmarkCircle01Icon color="#FFFFFF" size={22} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
  },
  header: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 35 : 15,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#0C0F17',
    borderBottomWidth: 1,
    borderBottomColor: '#161F30',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary30,
    marginBottom: 6,
  },
  aiBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loaderGraphicBox: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  spinnerRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.primary30,
    borderTopColor: Colors.primary,
  },
  innerIconBox: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingProgressTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 6,
  },
  loadingStepText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 15,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  checklistCard: {
    width: '100%',
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  checkItemLoading: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  checkItemCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
    borderColor: 'rgba(16, 185, 129, 0.12)',
  },
  checkIconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  checkText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  checkTextLoading: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkTextDone: {
    color: '#F1F5F9',
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 18,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  savedBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  heroCalorieCard: {
    backgroundColor: '#121824',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroHeaderText: {
    marginLeft: 14,
  },
  heroSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 2,
  },
  heroDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroStatCard: {
    flex: 1,
    backgroundColor: '#121824',
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  macroIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  macroStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  macroStatLabel: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  macroStatSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  waterCard: {
    backgroundColor: '#121824',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  waterIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  waterHeaderText: {
    flex: 1,
  },
  waterTitle: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  waterValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  waterSubValue: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  waterDesc: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  metricCategory: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#1E293B',
    alignSelf: 'center',
  },
  aiAdviceCard: {
    backgroundColor: '#121824',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary30,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adviceTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  adviceBody: {
    color: '#CBD5E1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  workoutBox: {
    flexDirection: 'row',
    backgroundColor: '#1A2338',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  workoutTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  workoutDesc: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  tipsSection: {
    gap: 8,
  },
  tipsHeading: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tipText: {
    color: '#9CA3AF',
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0C0F17',
    borderTopWidth: 1,
    borderTopColor: '#161F30',
  },
  finishBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
