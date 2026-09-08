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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Activity01Icon,
  Add01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  PencilEdit01Icon,
  RefreshIcon,
  Restaurant01Icon,
  SparklesIcon,
} from 'hugeicons-react-native';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { HomeHeader } from '../../components/HomeHeader';
import { AIChatModal } from '../../components/AIChatModal';
import { LogMealModal } from '../../components/LogMealModal';
import { LogWorkoutModal } from '../../components/LogWorkoutModal';
import { LogWaterModal } from '../../components/LogWaterModal';
import { NotificationModal } from '../../components/NotificationModal';
import { Colors } from '../../constants/Colors';
import { useSyncUser } from '../../hooks/useSyncUser';
import { ActivityStorage, UserActivity } from '../../utils/activityStorage';
import { MealStorage, LoggedMeal, AccumulatedConsumed } from '../../utils/mealStorage';
import { NotificationService, AppNotification } from '../../utils/notificationService';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';
import { WaterStorage } from '../../utils/waterStorage';
import { useTheme } from '../../context/ThemeContext';

export default function DashboardScreen() {
  const { user } = useUser();
  const { theme } = useTheme();

  // Trigger Firebase User Sync automatically on home screen mount
  const { isSynced, error } = useSyncUser();
  const [userProfile, setUserProfile] = useState<UserOnboardingData | null>(null);
  const [aiChatModalVisible, setAiChatModalVisible] = useState(false);

  // Editable Calorie & Macro State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [customCalories, setCustomCalories] = useState<number | null>(null);
  const [customProtein, setCustomProtein] = useState<number | null>(null);
  const [customCarbs, setCustomCarbs] = useState<number | null>(null);
  const [customFats, setCustomFats] = useState<number | null>(null);
  const [customWater, setCustomWater] = useState<number | null>(null);
  const [loggedWater, setLoggedWater] = useState<number>(0);
  const [logWaterModalVisible, setLogWaterModalVisible] = useState(false);

  // Edit Modal Inputs
  const [tempCalorieInput, setTempCalorieInput] = useState('');
  const [tempProteinInput, setTempProteinInput] = useState('');
  const [tempCarbsInput, setTempCarbsInput] = useState('');
  const [tempFatsInput, setTempFatsInput] = useState('');
  const [tempWaterInput, setTempWaterInput] = useState('');

  // Logged Activity Database State
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [accumulatedBurned, setAccumulatedBurned] = useState<number>(0);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [logWorkoutModalVisible, setLogWorkoutModalVisible] = useState(false);
  const [selectedEditingActivity, setSelectedEditingActivity] = useState<UserActivity | null>(null);

  // Logged Meals State
  const [loggedMeals, setLoggedMeals] = useState<LoggedMeal[]>([]);
  const [accumulatedConsumed, setAccumulatedConsumed] = useState<AccumulatedConsumed>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [logMealModalVisible, setLogMealModalVisible] = useState(false);

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);

  const refreshWater = async () => {
    if (!user?.id) return;
    const val = await WaterStorage.getLoggedWater(user.id);
    setLoggedWater(val);
    const data = await OnboardingStorage.getOnboardingData(user.id);
    if (data?.nutritionPlan?.waterLiters) {
      setCustomWater(data.nutritionPlan.waterLiters);
    }
  };

  const loadUserMeals = async () => {
    if (!user?.id) return;
    setLoadingMeals(true);
    try {
      const meals = await MealStorage.getUserMeals(user.id);
      setLoggedMeals(meals);

      const acc = await MealStorage.getAccumulatedConsumed(user.id);
      const sumCal = meals.reduce((a, m) => a + (m.calories || 0), 0);
      const sumP = parseFloat(meals.reduce((a, m) => a + (m.protein || 0), 0).toFixed(1));
      const sumC = parseFloat(meals.reduce((a, m) => a + (m.carbs || 0), 0).toFixed(1));
      const sumF = parseFloat(meals.reduce((a, m) => a + (m.fats || 0), 0).toFixed(1));

      setAccumulatedConsumed({
        calories: Math.max(acc.calories, sumCal),
        protein: Math.max(acc.protein, sumP),
        carbs: Math.max(acc.carbs, sumC),
        fats: Math.max(acc.fats, sumF),
      });
    } catch (err) {
      console.warn('Error loading user meals:', err);
    } finally {
      setLoadingMeals(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Check and trigger daily midnight reset check
      MealStorage.checkAndResetDaily(user.id);
      ActivityStorage.checkAndResetDaily(user.id);

      OnboardingStorage.getOnboardingData(user.id).then((data) => {
        if (data) {
          setUserProfile(data);
          if (data.nutritionPlan) {
            if (data.nutritionPlan.calories) setCustomCalories(data.nutritionPlan.calories);
            if (data.nutritionPlan.protein) setCustomProtein(data.nutritionPlan.protein);
            if (data.nutritionPlan.carbs) setCustomCarbs(data.nutritionPlan.carbs);
            if (data.nutritionPlan.fats) setCustomFats(data.nutritionPlan.fats);
            if (data.nutritionPlan.waterLiters) setCustomWater(data.nutritionPlan.waterLiters);
          }
        }
      });

      // Load Water Intake
      WaterStorage.getLoggedWater(user.id).then((val) => setLoggedWater(val));

      // Load Recent Activities & Accumulated Burned Calories for User
      setLoadingActivities(true);
      ActivityStorage.getAccumulatedBurned(user.id).then((burned) => setAccumulatedBurned(burned));
      ActivityStorage.getUserActivities(user.id)
        .then((data) => {
          setActivities(data);
        })
        .finally(() => setLoadingActivities(false));

      // Load Logged Meals from Storage / Database for User
      loadUserMeals();
    }
  }, [user?.id]);

  // Derived user physical parameters from Firebase database (via onboarding AI profile)
  const userHeightFeet = userProfile?.height?.feet || '5';
  const userHeightInches = userProfile?.height?.inches || '9';
  const userHeightStr = `${userHeightFeet}'${userHeightInches}"`;
  const userWeightKg = userProfile?.weight?.kg || '70';

  const birthYear = parseInt(userProfile?.birthdate?.year || '1998', 10) || 1998;
  const currentYear = new Date().getFullYear();
  const userAge = Math.max(15, currentYear - birthYear);

  // AI Recommended Values
  const aiRecommendedCalories = userProfile?.nutritionPlan?.calories || 2200;
  const aiRecommendedProtein = userProfile?.nutritionPlan?.protein || Math.round((aiRecommendedCalories * 0.25) / 4);
  const aiRecommendedCarbs = userProfile?.nutritionPlan?.carbs || Math.round((aiRecommendedCalories * 0.50) / 4);
  const aiRecommendedFats = userProfile?.nutritionPlan?.fats || Math.round((aiRecommendedCalories * 0.25) / 9);
  const aiRecommendedWater = userProfile?.nutritionPlan?.waterLiters || 3.0;

  // Active Goals (User customized or AI fallback)
  const targetCalories = customCalories || aiRecommendedCalories;
  const targetProtein = customProtein || aiRecommendedProtein;
  const targetCarbs = customCarbs || aiRecommendedCarbs;
  const targetFats = customFats || aiRecommendedFats;
  const waterLiters = customWater || aiRecommendedWater;

  // Food Calories & Macros Accumulated
  const foodCaloriesConsumed = Math.max(
    accumulatedConsumed.calories,
    loggedMeals.reduce((acc, m) => acc + (m.calories || 0), 0)
  );

  const consumedProtein = parseFloat(
    Math.max(
      accumulatedConsumed.protein,
      loggedMeals.reduce((acc, m) => acc + (m.protein || 0), 0)
    ).toFixed(1)
  );

  const consumedCarbs = parseFloat(
    Math.max(
      accumulatedConsumed.carbs,
      loggedMeals.reduce((acc, m) => acc + (m.carbs || 0), 0)
    ).toFixed(1)
  );

  const consumedFats = parseFloat(
    Math.max(
      accumulatedConsumed.fats,
      loggedMeals.reduce((acc, m) => acc + (m.fats || 0), 0)
    ).toFixed(1)
  );

  // Total Calories Burned from Recent Activities
  const totalBurnedCalories = Math.max(
    accumulatedBurned,
    activities.reduce((acc, a) => acc + (a.caloriesBurned || 0), 0)
  );

  // Net Consumed Calories = Food Calories - Burned Calories
  const consumedCalories = Math.max(0, foodCaloriesConsumed - totalBurnedCalories);
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const caloriePercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  const handleDeleteMeal = (mealId: string, foodName: string) => {
    if (!user?.id) return;
    Alert.alert('Delete Meal', `Are you sure you want to remove "${foodName}" from today's meals list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await MealStorage.deleteMeal(user.id, mealId);
          setLoggedMeals((prev) => prev.filter((m) => m.id !== mealId));
        },
      },
    ]);
  };

  const refreshActivities = async () => {
    if (!user?.id) return;
    const burned = await ActivityStorage.getAccumulatedBurned(user.id);
    setAccumulatedBurned(burned);
    const data = await ActivityStorage.getUserActivities(user.id);
    setActivities(data);
  };

  const handleOpenLogWorkoutModal = (activityToEdit?: UserActivity) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEditingActivity(activityToEdit || null);
    setLogWorkoutModalVisible(true);
  };

  const getActivityIconConfig = (type: string) => {
    switch (type) {
      case 'running':
        return { icon: 'run', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'walking':
        return { icon: 'walk', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'cycling':
        return { icon: 'bike', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'swimming':
        return { icon: 'swim', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
      case 'yoga':
        return { icon: 'flower-tulip-outline', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.15)' };
      case 'workout':
      default:
        return { icon: 'dumbbell', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
    }
  };

  const isCustomGoal =
    (customCalories !== null && customCalories !== aiRecommendedCalories) ||
    (customProtein !== null && customProtein !== aiRecommendedProtein) ||
    (customCarbs !== null && customCarbs !== aiRecommendedCarbs) ||
    (customFats !== null && customFats !== aiRecommendedFats) ||
    (customWater !== null && customWater !== aiRecommendedWater);

  // Refresh notifications whenever metrics update
  const refreshNotifications = async () => {
    if (!user?.id) return;
    const updated = await NotificationService.generateSmartNotifications(user.id, {
      consumedCalories,
      targetCalories,
      consumedProtein,
      targetProtein,
      loggedWater,
      targetWater: waterLiters,
      burnedCalories: totalBurnedCalories,
      mealsCount: loggedMeals.length,
      activitiesCount: activities.length,
    });
    setNotifications(updated);
  };

  useEffect(() => {
    if (user?.id) {
      refreshNotifications();
    }
  }, [
    user?.id,
    consumedCalories,
    targetCalories,
    consumedProtein,
    targetProtein,
    loggedWater,
    totalBurnedCalories,
    loggedMeals.length,
    activities.length,
  ]);

  const handleMarkAsRead = async (id: string) => {
    if (!user?.id) return;
    const updated = await NotificationService.markAsRead(user.id, id);
    setNotifications(updated);
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    const updated = await NotificationService.markAllAsRead(user.id);
    setNotifications(updated);
  };

  const handleClearAllNotifications = async () => {
    if (!user?.id) return;
    await NotificationService.clearAllNotifications(user.id);
    setNotifications([]);
  };

  const handleNotificationAction = (actionType: 'log_meal' | 'log_workout' | 'log_water') => {
    if (actionType === 'log_meal') {
      setLogMealModalVisible(true);
    } else if (actionType === 'log_workout') {
      setSelectedEditingActivity(null);
      setLogWorkoutModalVisible(true);
    } else if (actionType === 'log_water') {
      setLogWaterModalVisible(true);
    }
  };



  // SVG Circular Ring parameters
  const svgSize = 190;
  const strokeWidth = 14;
  const radius = (svgSize - strokeWidth) / 2; // 88
  const circumference = 2 * Math.PI * radius; // ~552.92
  const progressRatio = Math.min(1.0, consumedCalories / targetCalories);
  const strokeDashoffset = circumference - progressRatio * circumference;

  const handleOpenEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempCalorieInput(targetCalories.toString());
    setTempProteinInput(targetProtein.toString());
    setTempCarbsInput(targetCarbs.toString());
    setTempFatsInput(targetFats.toString());
    setTempWaterInput(waterLiters.toString());
    setEditModalVisible(true);
  };

  const handleQuickAdjustCalorie = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseInt(tempCalorieInput.trim(), 10) || targetCalories;
    const updated = Math.max(500, Math.min(10000, curr + delta));
    setTempCalorieInput(updated.toString());
  };

  const handleQuickAdjustProtein = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseInt(tempProteinInput.trim(), 10) || targetProtein;
    const updated = Math.max(10, Math.min(500, curr + delta));
    setTempProteinInput(updated.toString());
  };

  const handleQuickAdjustCarbs = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseInt(tempCarbsInput.trim(), 10) || targetCarbs;
    const updated = Math.max(10, Math.min(1000, curr + delta));
    setTempCarbsInput(updated.toString());
  };

  const handleQuickAdjustFats = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseInt(tempFatsInput.trim(), 10) || targetFats;
    const updated = Math.max(5, Math.min(300, curr + delta));
    setTempFatsInput(updated.toString());
  };

  const handleQuickAdjustWater = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseFloat(tempWaterInput.trim()) || waterLiters;
    const updated = Math.max(0.5, Math.min(15, parseFloat((curr + delta).toFixed(1))));
    setTempWaterInput(updated.toString());
  };

  const handleResetToAi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTempCalorieInput(aiRecommendedCalories.toString());
    setTempProteinInput(aiRecommendedProtein.toString());
    setTempCarbsInput(aiRecommendedCarbs.toString());
    setTempFatsInput(aiRecommendedFats.toString());
    setTempWaterInput(aiRecommendedWater.toString());
  };

  const handleSaveGoals = async () => {
    const cal = parseInt(tempCalorieInput.trim(), 10);
    const prot = parseInt(tempProteinInput.trim(), 10);
    const carb = parseInt(tempCarbsInput.trim(), 10);
    const fat = parseInt(tempFatsInput.trim(), 10);
    const wat = parseFloat(tempWaterInput.trim());

    if (isNaN(cal) || cal < 500 || cal > 10000) {
      Alert.alert('Invalid Calorie Target', 'Please enter a valid calorie target between 500 and 10,000 kcal.');
      return;
    }
    if (isNaN(prot) || prot < 10 || prot > 500) {
      Alert.alert('Invalid Protein Target', 'Please enter a valid protein target between 10g and 500g.');
      return;
    }
    if (isNaN(carb) || carb < 10 || carb > 1000) {
      Alert.alert('Invalid Carbs Target', 'Please enter a valid carbs target between 10g and 1000g.');
      return;
    }
    if (isNaN(fat) || fat < 5 || fat > 300) {
      Alert.alert('Invalid Fats Target', 'Please enter a valid fats target between 5g and 300g.');
      return;
    }
    if (isNaN(wat) || wat < 0.5 || wat > 15) {
      Alert.alert('Invalid Water Target', 'Please enter a valid water target between 0.5L and 15L.');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCustomCalories(cal);
    setCustomProtein(prot);
    setCustomCarbs(carb);
    setCustomFats(fat);
    setCustomWater(wat);
    setEditModalVisible(false);

    if (user?.id) {
      await OnboardingStorage.updateNutritionGoals(user.id, {
        calories: cal,
        protein: prot,
        carbs: carb,
        fats: fat,
        waterLiters: wat,
      });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Home Header Component */}
      <HomeHeader
        onNotificationPress={() => {
          refreshNotifications();
          setNotificationModalVisible(true);
        }}
        unreadCount={notifications.filter((n) => !n.read).length}
      />

      {/* Firebase Sync Status Badge */}
      <View
        style={[
          styles.syncBadge,
          error ? styles.syncBadgeError : isSynced ? styles.syncBadgeSuccess : styles.syncBadgePending,
        ]}
      >
        <Ionicons
          name={error ? 'alert-circle' : isSynced ? 'checkmark-circle' : 'sync'}
          size={16}
          color={error ? Colors.error : isSynced ? Colors.primary : Colors.warning}
        />
        <Text
          style={[
            styles.syncText,
            error ? styles.syncTextError : isSynced ? styles.syncTextSuccess : styles.syncTextPending,
          ]}
        >
          {isSynced
            ? 'Account synced with Firestore'
            : error
            ? 'Firebase sync error'
            : 'Syncing profile with Firestore...'}
        </Text>
      </View>

      {/* Main Unified Calorie & Daily Nutrition Tracker Card */}
      <View style={[styles.calorieCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Calories & Macros Tracker</Text>
            <View style={styles.targetBadgeRow}>
              <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>{"Today's Target"}</Text>
              {isCustomGoal ? (
                <View style={styles.customGoalBadge}>
                  <Text style={styles.customGoalBadgeText}>Custom Goals</Text>
                </View>
              ) : (
                <View style={styles.aiGoalBadge}>
                  <SparklesIcon size={11} color={Colors.primary} />
                  <Text style={styles.aiGoalBadgeText}>AI Recommended</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons: Log Meal & Edit Target Goal */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.editTargetBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#EF4444' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLogMealModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Add01Icon size={14} color="#EF4444" />
              <Text style={[styles.editTargetBtnText, { color: '#EF4444' }]}>Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editTargetBtn, { backgroundColor: Colors.primary }]}
              onPress={handleOpenEditModal}
              activeOpacity={0.75}
            >
              <PencilEdit01Icon size={14} color="#FFFFFF" />
              <Text style={styles.editTargetBtnText}>Edit Goals</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Profile Context Banner */}
        <View style={[styles.aiProfileContextBanner, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
          <SparklesIcon size={13} color={Colors.primary} />
          <Text style={[styles.aiProfileContextText, { color: theme.textMuted }]}>
            AI Profile Context • <Text style={{ color: theme.text, fontWeight: '700' }}>Age: {userAge} yrs</Text> |{' '}
            <Text style={{ color: theme.text, fontWeight: '700' }}>Height: {userHeightStr}</Text> |{' '}
            <Text style={{ color: theme.text, fontWeight: '700' }}>Weight: {userWeightKg} kg</Text>
          </Text>
        </View>

        {/* Professional SVG Circular Calorie Bar */}
        <View style={styles.calorieRingContainer}>
          <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={svgSize} height={svgSize}>
              <Defs>
                <LinearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#10B981" />
                  <Stop offset="100%" stopColor="#06B6D4" />
                </LinearGradient>
                <LinearGradient id="calorieGradSurplus" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#F59E0B" />
                  <Stop offset="100%" stopColor="#EF4444" />
                </LinearGradient>
                <LinearGradient id="calorieGradComplete" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#10B981" />
                  <Stop offset="100%" stopColor="#34D399" />
                </LinearGradient>
              </Defs>

              {/* Translucent Outer Glow Ring */}
              <Circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={consumedCalories > targetCalories ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)'}
                strokeWidth={strokeWidth + 8}
                fill="transparent"
              />

              {/* Background Circular Track */}
              <Circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke={theme.trackBg}
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Active Progress Circle Arc */}
              <G rotation="-90" origin={`${svgSize / 2}, ${svgSize / 2}`}>
                <Circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={
                    consumedCalories > targetCalories
                      ? 'url(#calorieGradSurplus)'
                      : caloriePercent >= 100
                      ? 'url(#calorieGradComplete)'
                      : 'url(#calorieGradient)'
                  }
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </G>
            </Svg>

            {/* Centered Ring Text & Counter */}
            <View style={styles.calorieRingInner}>
              <Text style={[styles.calorieCountLabel, { color: theme.textMuted }]}>CONSUMED</Text>
              <Text style={[styles.calorieCount, { color: theme.text }]}>{consumedCalories.toLocaleString()}</Text>
              <Text style={[styles.calorieUnit, { color: theme.textMuted }]}>/ {targetCalories.toLocaleString()} kcal</Text>
              <View
                style={[
                  styles.caloriePercentageBadge,
                  { backgroundColor: consumedCalories > targetCalories ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
                ]}
              >
                <Text
                  style={[
                    styles.caloriePercentageText,
                    { color: consumedCalories > targetCalories ? '#EF4444' : Colors.primary },
                  ]}
                >
                  {caloriePercent}% Goal
                </Text>
              </View>
            </View>
          </View>

          {/* Remaining / Surplus Calorie Status Indicator */}
          <View
            style={[
              styles.remainingPill,
              { backgroundColor: consumedCalories > targetCalories ? 'rgba(239, 68, 68, 0.12)' : theme.primaryBg },
            ]}
          >
            <View style={[styles.pulseDot, consumedCalories > targetCalories && { backgroundColor: '#EF4444' }]} />
            <Text
              style={[
                styles.remainingPillText,
                { color: consumedCalories > targetCalories ? '#EF4444' : Colors.primary },
              ]}
            >
              {consumedCalories > targetCalories
                ? `Exceeded by ${(consumedCalories - targetCalories).toLocaleString()} kcal (Log Workout!)`
                : `${remainingCalories.toLocaleString()} kcal remaining`}
            </Text>
          </View>
        </View>

        {/* Quick Goal Highlights Bar */}
        <View style={[styles.calorieDetails, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Target Energy</Text>
            <Text style={[styles.detailVal, { color: theme.text }]}>{targetCalories.toLocaleString()} kcal</Text>
          </View>
          <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.detailCol}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setLogWaterModalVisible(true);
            }}
          >
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Water Intake</Text>
            <Text style={[styles.detailVal, { color: '#38BDF8' }]}>{loggedWater} / {waterLiters} L</Text>
          </TouchableOpacity>
          <View style={[styles.detailDivider, { backgroundColor: theme.border }]} />
          <View style={styles.detailCol}>
            <Text style={[styles.detailLabel, { color: theme.textMuted }]}>Protein Target</Text>
            <Text style={[styles.detailVal, { color: Colors.primary }]}>{targetProtein}g</Text>
          </View>
        </View>

        {/* Integrated Daily Macros Cards (Protein, Carbs, Fats) */}
        <View style={[styles.integratedMacrosContainer, { borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[styles.integratedMacrosTitle, { color: theme.text, marginBottom: 0 }]}>Daily Macro Targets</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textMuted }}>Resets at 00:00</Text>
          </View>

          <View style={styles.macrosRow}>
            {/* Protein Card */}
            <View style={[styles.macroCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                <View style={[styles.macroIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <MaterialCommunityIcons name="arm-flex" size={18} color="#EF4444" />
                </View>
                <View style={[styles.macroPctBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#EF4444' }}>
                    {Math.min(100, Math.round((consumedProtein / targetProtein) * 100))}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.macroName, { color: theme.textMuted }]}>Protein</Text>
              <Text style={[styles.macroValue, { color: theme.text }]}>{consumedProtein}g / {targetProtein}g</Text>
              <View style={[styles.progressBarBg, { backgroundColor: theme.trackBg }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: '#EF4444',
                      width: `${Math.min(100, Math.round((consumedProtein / targetProtein) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Carbs Card */}
            <View style={[styles.macroCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                <View style={[styles.macroIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <MaterialCommunityIcons name="bread-slice" size={16} color="#F59E0B" />
                </View>
                <View style={[styles.macroPctBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#F59E0B' }}>
                    {Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100))}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.macroName, { color: theme.textMuted }]}>Carbs</Text>
              <Text style={[styles.macroValue, { color: theme.text }]}>{consumedCarbs}g / {targetCarbs}g</Text>
              <View style={[styles.progressBarBg, { backgroundColor: theme.trackBg }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: '#F59E0B',
                      width: `${Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Fats Card */}
            <View style={[styles.macroCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 6 }}>
                <View style={[styles.macroIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <MaterialCommunityIcons name="cheese" size={16} color="#3B82F6" />
                </View>
                <View style={[styles.macroPctBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#3B82F6' }}>
                    {Math.min(100, Math.round((consumedFats / targetFats) * 100))}%
                  </Text>
                </View>
              </View>
              <Text style={[styles.macroName, { color: theme.textMuted }]}>Fats</Text>
              <Text style={[styles.macroValue, { color: theme.text }]}>{consumedFats}g / {targetFats}g</Text>
              <View style={[styles.progressBarBg, { backgroundColor: theme.trackBg }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: '#3B82F6',
                      width: `${Math.min(100, Math.round((consumedFats / targetFats) * 100))}%`,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Today's Logged Meals Section */}
        <View style={[styles.recentActivityContainer, { borderColor: theme.border }]}>
          <View style={styles.recentActivityHeader}>
            <View style={styles.recentActivityTitleRow}>
              <Restaurant01Icon size={18} color="#EF4444" />
              <Text style={[styles.recentActivityTitle, { color: theme.text }]}>Today's Logged Meals</Text>
              {loggedMeals.length > 0 && (
                <View style={[styles.activityBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Text style={[styles.activityBadgeText, { color: '#EF4444' }]}>{loggedMeals.length} Logged</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addActivityHeaderBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLogMealModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Add01Icon size={14} color="#FFFFFF" />
              <Text style={styles.addActivityHeaderBtnText}>Log Meal</Text>
            </TouchableOpacity>
          </View>

          {loadingMeals ? (
            <View style={[styles.emptyStateCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <Text style={[styles.emptyStateSubtext, { color: theme.textMuted }]}>Loading logged meals...</Text>
            </View>
          ) : loggedMeals.length === 0 ? (
            <View style={[styles.emptyStateCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={styles.emptyStateIconContainer}>
                <View style={[styles.emptyStateGlowCircle, { backgroundColor: theme.primaryBg }]} />
                <View style={[styles.emptyStateMainIconBg, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Restaurant01Icon size={32} color="#EF4444" />
                </View>
              </View>

              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Meals Logged Today</Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textMuted }]}>
                Log your breakfast, lunch, dinner, or snacks to start tracking calories, protein, carbs & fats.
              </Text>

              <TouchableOpacity
                style={[styles.emptyStateAddBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLogMealModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Add01Icon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateAddBtnText}>Log First Meal</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activityList}>
              {loggedMeals.map((meal) => (
                <View key={meal.id} style={[styles.activityItemCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <View style={[styles.activityItemIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Restaurant01Icon size={20} color="#EF4444" />
                  </View>

                  <View style={styles.activityItemInfo}>
                    <Text style={[styles.activityItemTitle, { color: theme.text }]}>{meal.foodName}</Text>
                    <View style={styles.activityItemMetaRow}>
                      <Ionicons name="time-outline" size={12} color={theme.textMuted} />
                      <Text style={[styles.activityItemMeta, { color: theme.textMuted }]}>
                        {meal.portion} • {meal.timestamp} ({meal.mealType.toUpperCase()})
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>
                      P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g
                    </Text>
                  </View>

                  <View style={styles.activityItemRight}>
                    <View style={[styles.burnedCalorieBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="flame" size={12} color="#EF4444" />
                      <Text style={[styles.burnedCalorieText, { color: '#EF4444' }]}>+{meal.calories} kcal</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.deleteActivityBtn, { backgroundColor: theme.card }]}
                      onPress={() => handleDeleteMeal(meal.id, meal.foodName)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent Activity Section */}
        <View style={[styles.recentActivityContainer, { borderColor: theme.border }]}>
          <View style={styles.recentActivityHeader}>
            <View style={styles.recentActivityTitleRow}>
              <Activity01Icon size={18} color={Colors.primary} />
              <Text style={[styles.recentActivityTitle, { color: theme.text }]}>Recent Activity</Text>
              {activities.length > 0 && (
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>{activities.length} Today</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addActivityHeaderBtn, { backgroundColor: Colors.primary }]}
              onPress={() => handleOpenLogWorkoutModal()}
              activeOpacity={0.8}
            >
              <Add01Icon size={14} color="#FFFFFF" />
              <Text style={styles.addActivityHeaderBtnText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          {loadingActivities ? (
            <View style={[styles.emptyStateCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <Text style={[styles.emptyStateSubtext, { color: theme.textMuted }]}>Loading activities...</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={[styles.emptyStateCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <View style={styles.emptyStateIconContainer}>
                <View style={[styles.emptyStateGlowCircle, { backgroundColor: theme.primaryBg }]} />
                <View style={[styles.emptyStateMainIconBg, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Activity01Icon size={32} color={Colors.primary} />
                </View>
                <View style={[styles.microIconBadge, { top: -4, right: -4, backgroundColor: theme.card, borderColor: theme.border }]}>
                  <MaterialCommunityIcons name="dumbbell" size={14} color="#EF4444" />
                </View>
                <View style={[styles.microIconBadge, { bottom: -4, left: -4, backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="flame" size={14} color="#F59E0B" />
                </View>
              </View>

              <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Activity Logged Today</Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.textMuted }]}>
                Track your workouts, runs, or daily movement to stay on target with your daily calorie & macro goals.
              </Text>

              <TouchableOpacity
                style={[styles.emptyStateAddBtn, { backgroundColor: Colors.primary }]}
                onPress={() => handleOpenLogWorkoutModal()}
                activeOpacity={0.8}
              >
                <Add01Icon size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyStateAddBtnText}>{"Log Today's Activity"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.activityList}>
              {activities.map((item) => {
                const iconConfig = getActivityIconConfig(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.activityItemCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                    onPress={() => handleOpenLogWorkoutModal(item)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.activityItemIconBg, { backgroundColor: iconConfig.bg }]}>
                      <MaterialCommunityIcons name={iconConfig.icon as any} size={20} color={iconConfig.color} />
                    </View>

                    <View style={styles.activityItemInfo}>
                      <Text style={[styles.activityItemTitle, { color: theme.text }]}>{item.title}</Text>
                      <View style={styles.activityItemMetaRow}>
                        <Ionicons name="time-outline" size={12} color={theme.textMuted} />
                        <Text style={[styles.activityItemMeta, { color: theme.textMuted }]}>
                          {item.durationMinutes} mins • {item.timestamp}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.activityItemRight}>
                      <View style={styles.burnedCalorieBadge}>
                        <Ionicons name="flame" size={12} color="#EF4444" />
                        <Text style={styles.burnedCalorieText}>-{item.caloriesBurned} kcal</Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.deleteActivityBtn, { backgroundColor: theme.card }]}
                        onPress={() => handleOpenLogWorkoutModal(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <PencilEdit01Icon size={15} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* AI Chatbot Launch Banner */}
      <TouchableOpacity
        style={[styles.aiChatBanner, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setAiChatModalVisible(true);
        }}
        activeOpacity={0.85}
      >
        <View style={styles.aiChatBannerContent}>
          <View style={styles.aiChatIconBg}>
            <SparklesIcon size={24} color="#FFFFFF" />
          </View>
          <View style={styles.aiChatTexts}>
            <Text style={[styles.aiChatTitle, { color: theme.text }]}>Ask NutriVision AI Chatbot</Text>
            <Text style={[styles.aiChatSubtitle, { color: theme.textMuted }]}>
              Ask anything or query food calories instantly
            </Text>
          </View>
          <View style={[styles.aiChatArrowBadge, { backgroundColor: theme.primaryBg }]}>
            <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
          </View>
        </View>
      </TouchableOpacity>

      <AIChatModal visible={aiChatModalVisible} onClose={() => setAiChatModalVisible(false)} />

      {/* Log Meal Modal */}
      <LogMealModal visible={logMealModalVisible} onClose={() => setLogMealModalVisible(false)} onMealAdded={loadUserMeals} />

      {/* Log Workout & Recent Activity Management Modal */}
      <LogWorkoutModal
        visible={logWorkoutModalVisible}
        onClose={() => {
          setLogWorkoutModalVisible(false);
          setSelectedEditingActivity(null);
        }}
        editingActivity={selectedEditingActivity}
        onActivityAdded={refreshActivities}
        onActivityUpdated={refreshActivities}
      />

      {/* Comprehensive Edit Target Goals Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.editModalContent, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBg}>
                  <PencilEdit01Icon size={20} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Daily Nutrition Goals</Text>
                  <Text style={[styles.modalSubTitle, { color: theme.textMuted }]}>Customize your Calories, Macros & Water</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* AI Recommendation Info Banner */}
            <View style={[styles.aiInfoBanner, { backgroundColor: theme.primaryBg }]}>
              <SparklesIcon size={16} color={Colors.primary} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.aiInfoTitle}>AI Model Calculated Baseline</Text>
                <Text style={[styles.aiInfoSub, { color: theme.textMuted }]}>
                  Based on Firebase data: Age <Text style={{ fontWeight: '700', color: Colors.primary }}>{userAge} yrs</Text>, Height{' '}
                  <Text style={{ fontWeight: '700', color: Colors.primary }}>{userHeightStr}</Text>, Weight{' '}
                  <Text style={{ fontWeight: '700', color: Colors.primary }}>{userWeightKg} kg</Text>
                </Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* 1. Calorie Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <Ionicons name="flame" size={16} color="#FF6B6B" />
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Calorie Target (kcal)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedCalories}</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.calorieInput, { color: theme.text }]}
                    value={tempCalorieInput}
                    onChangeText={setTempCalorieInput}
                    keyboardType="numeric"
                    placeholder="2200"
                    placeholderTextColor={theme.textMuted}
                    maxLength={5}
                  />
                  <Text style={[styles.inputUnit, { color: theme.textMuted }]}>kcal / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-250, -100, 100, 250].map((delta) => (
                    <TouchableOpacity
                      key={`cal-${delta}`}
                      style={[styles.quickChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAdjustCalorie(delta)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {delta > 0 ? `+${delta}` : `${delta}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 2. Protein Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <MaterialCommunityIcons name="arm-flex" size={16} color="#EF4444" />
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Protein Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedProtein}g</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.calorieInput, { color: theme.text }]}
                    value={tempProteinInput}
                    onChangeText={setTempProteinInput}
                    keyboardType="numeric"
                    placeholder="138"
                    placeholderTextColor={theme.textMuted}
                    maxLength={4}
                  />
                  <Text style={[styles.inputUnit, { color: theme.textMuted }]}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-20, -10, 10, 20].map((delta) => (
                    <TouchableOpacity
                      key={`prot-${delta}`}
                      style={[styles.quickChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAdjustProtein(delta)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {delta > 0 ? `+${delta}g` : `${delta}g`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 3. Carbs Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <MaterialCommunityIcons name="bread-slice" size={15} color="#F59E0B" />
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Carbohydrates Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedCarbs}g</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.calorieInput, { color: theme.text }]}
                    value={tempCarbsInput}
                    onChangeText={setTempCarbsInput}
                    keyboardType="numeric"
                    placeholder="275"
                    placeholderTextColor={theme.textMuted}
                    maxLength={4}
                  />
                  <Text style={[styles.inputUnit, { color: theme.textMuted }]}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-25, -10, 10, 25].map((delta) => (
                    <TouchableOpacity
                      key={`carb-${delta}`}
                      style={[styles.quickChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAdjustCarbs(delta)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {delta > 0 ? `+${delta}g` : `${delta}g`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 4. Fats Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <MaterialCommunityIcons name="cheese" size={15} color="#3B82F6" />
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Dietary Fats Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedFats}g</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.calorieInput, { color: theme.text }]}
                    value={tempFatsInput}
                    onChangeText={setTempFatsInput}
                    keyboardType="numeric"
                    placeholder="61"
                    placeholderTextColor={theme.textMuted}
                    maxLength={4}
                  />
                  <Text style={[styles.inputUnit, { color: theme.textMuted }]}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-15, -5, 5, 15].map((delta) => (
                    <TouchableOpacity
                      key={`fat-${delta}`}
                      style={[styles.quickChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAdjustFats(delta)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {delta > 0 ? `+${delta}g` : `${delta}g`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 5. Water Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <Ionicons name="water" size={16} color="#38BDF8" />
                  <Text style={[styles.inputLabel, { color: theme.text }]}>Water Goal (Liters)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedWater}L</Text>
                </View>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.calorieInput, { color: theme.text }]}
                    value={tempWaterInput}
                    onChangeText={setTempWaterInput}
                    keyboardType="numeric"
                    placeholder="3.0"
                    placeholderTextColor={theme.textMuted}
                    maxLength={4}
                  />
                  <Text style={[styles.inputUnit, { color: theme.textMuted }]}>Liters / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
                    <TouchableOpacity
                      key={`wat-${delta}`}
                      style={[styles.quickChip, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAdjustWater(delta)}
                    >
                      <Text style={[styles.quickChipText, { color: theme.text }]}>
                        {delta > 0 ? `+${delta}L` : `${delta}L`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Reset to AI Recommendation Button */}
            <TouchableOpacity style={styles.resetAiBtn} onPress={handleResetToAi}>
              <RefreshIcon size={14} color={Colors.primary} />
              <Text style={styles.resetAiBtnText}>Reset All Goals to AI Recommendation</Text>
            </TouchableOpacity>

            {/* Modal Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleSaveGoals}>
                <CheckmarkCircle01Icon size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Goals</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Log Water & Hydration Tracker Modal */}
      <LogWaterModal visible={logWaterModalVisible} onClose={() => setLogWaterModalVisible(false)} onWaterUpdated={refreshWater} />

      {/* Notification Center Modal */}
      <NotificationModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        notifications={notifications}
        onNotificationAction={handleNotificationAction}
        onMarkAllAsRead={handleMarkAllAsRead}
        onClearAll={handleClearAllNotifications}
        onMarkAsRead={handleMarkAsRead}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  syncBadgeSuccess: {
    backgroundColor: Colors.primary10,
    borderColor: Colors.primary20,
  },
  syncBadgePending: {
    backgroundColor: Colors.warning10,
    borderColor: Colors.warning20,
  },
  syncBadgeError: {
    backgroundColor: Colors.error10,
    borderColor: Colors.error20,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  syncTextSuccess: {
    color: Colors.primary,
  },
  syncTextPending: {
    color: Colors.warning,
  },
  syncTextError: {
    color: Colors.error,
  },
  calorieCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  targetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 8,
  },
  aiGoalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  aiGoalBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
  },
  customGoalBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  customGoalBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
  },
  editTargetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editTargetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  aiProfileContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  aiProfileContextText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },
  calorieRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  calorieRingInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCountLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  calorieCount: {
    fontSize: 32,
    fontWeight: '900',
  },
  calorieUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  caloriePercentageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  caloriePercentageText: {
    fontSize: 11,
    fontWeight: '800',
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary20,
    marginTop: 14,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.primary,
    marginRight: 7,
  },
  remainingPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  calorieDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  detailDivider: {
    width: 1,
    height: 22,
  },
  integratedMacrosContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  integratedMacrosTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  macroIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  macroPctBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  macroName: {
    fontSize: 11,
    fontWeight: '600',
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  aiChatBanner: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  aiChatBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiChatIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  aiChatTexts: {
    flex: 1,
  },
  aiChatTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  aiChatSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  aiChatArrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.primary10,
    borderWidth: 1,
    borderColor: Colors.primary20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInfoBanner: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.primary20,
    marginBottom: 14,
  },
  aiInfoTitle: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  aiInfoSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  inputSection: {
    marginBottom: 14,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  aiHintVal: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 8,
  },
  calorieInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 6,
  },
  inputUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickChip: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resetAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 14,
  },
  resetAiBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recentActivityContainer: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recentActivityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentActivityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  activityBadge: {
    backgroundColor: Colors.primary10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary20,
    marginLeft: 8,
  },
  activityBadgeText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  addActivityHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  addActivityHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  emptyStateCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyStateIconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  emptyStateGlowCircle: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  emptyStateMainIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary30,
  },
  microIconBadge: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  emptyStateAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  emptyStateAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  activityList: {
    gap: 10,
  },
  activityItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  activityItemIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityItemInfo: {
    flex: 1,
  },
  activityItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  activityItemMeta: {
    fontSize: 11,
    marginLeft: 4,
  },
  activityItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  burnedCalorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  burnedCalorieText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 3,
  },
  deleteActivityBtn: {
    padding: 6,
    borderRadius: 8,
  },
});
