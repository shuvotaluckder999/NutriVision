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
  SparklesIcon,
} from 'hugeicons-react-native';
import Svg, { Circle, Defs, G, LinearGradient, Stop } from 'react-native-svg';
import { HomeHeader } from '../../components/HomeHeader';
import { AIChatModal } from '../../components/AIChatModal';
import { Colors } from '../../constants/Colors';
import { useSyncUser } from '../../hooks/useSyncUser';
import { ActivityStorage, UserActivity } from '../../utils/activityStorage';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';

export default function DashboardScreen() {
  const { user } = useUser();

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

  // Edit Modal Inputs
  const [tempCalorieInput, setTempCalorieInput] = useState('');
  const [tempProteinInput, setTempProteinInput] = useState('');
  const [tempCarbsInput, setTempCarbsInput] = useState('');
  const [tempFatsInput, setTempFatsInput] = useState('');
  const [tempWaterInput, setTempWaterInput] = useState('');

  // Logged Activity Database State
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);

  // New Activity Inputs
  const [newActivityTitle, setNewActivityTitle] = useState('Gym Workout');
  const [newActivityType, setNewActivityType] = useState<string>('workout');
  const [newActivityDuration, setNewActivityDuration] = useState('30');
  const [newActivityCalories, setNewActivityCalories] = useState('250');

  useEffect(() => {
    if (user?.id) {
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

      // Load Recent Activities from Database for User
      setLoadingActivities(true);
      ActivityStorage.getUserActivities(user.id)
        .then((data) => {
          setActivities(data);
        })
        .finally(() => setLoadingActivities(false));
    }
  }, [user?.id]);

  const handleOpenAddActivityModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewActivityTitle('Gym Workout');
    setNewActivityType('workout');
    setNewActivityDuration('30');
    setNewActivityCalories('250');
    setAddActivityModalVisible(true);
  };

  const handleSelectActivityType = (type: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewActivityType(type);
    const titles: Record<string, string> = {
      workout: 'Strength & Gym Workout',
      running: 'Outdoor Running',
      walking: 'Brisk Walk',
      cycling: 'Bicycle Ride',
      swimming: 'Pool Swimming',
      yoga: 'Yoga & Stretching',
    };
    const caloriesMap: Record<string, string> = {
      workout: '280',
      running: '350',
      walking: '140',
      cycling: '300',
      swimming: '320',
      yoga: '150',
    };
    setNewActivityTitle(titles[type] || 'Workout Activity');
    setNewActivityCalories(caloriesMap[type] || '200');
  };

  const handleSaveActivity = async () => {
    if (!user?.id) return;
    const dur = parseInt(newActivityDuration.trim(), 10);
    const cal = parseInt(newActivityCalories.trim(), 10);

    if (!newActivityTitle.trim()) {
      Alert.alert('Invalid Title', 'Please enter a title for the activity.');
      return;
    }
    if (isNaN(dur) || dur <= 0 || dur > 600) {
      Alert.alert('Invalid Duration', 'Please enter a duration between 1 and 600 minutes.');
      return;
    }
    if (isNaN(cal) || cal < 0 || cal > 5000) {
      Alert.alert('Invalid Calories', 'Please enter valid calories burned (0 - 5000 kcal).');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const saved = await ActivityStorage.addActivity(user.id, {
      title: newActivityTitle.trim(),
      type: newActivityType,
      durationMinutes: dur,
      caloriesBurned: cal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setActivities((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
    setAddActivityModalVisible(false);
  };

  const handleDeleteActivity = (activityId: string, title: string) => {
    if (!user?.id) return;
    Alert.alert('Delete Activity', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await ActivityStorage.deleteActivity(user.id, activityId);
          setActivities((prev) => prev.filter((a) => a.id !== activityId));
        },
      },
    ]);
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

  const consumedCalories = 1420; // Consumed calories baseline
  const consumedProtein = 85;
  const consumedCarbs = 180;
  const consumedFats = 42;

  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const caloriePercent = Math.min(100, Math.round((consumedCalories / targetCalories) * 100));

  const isCustomGoal =
    (customCalories !== null && customCalories !== aiRecommendedCalories) ||
    (customProtein !== null && customProtein !== aiRecommendedProtein) ||
    (customCarbs !== null && customCarbs !== aiRecommendedCarbs) ||
    (customFats !== null && customFats !== aiRecommendedFats) ||
    (customWater !== null && customWater !== aiRecommendedWater);

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Top Home Header Component */}
      <HomeHeader />

      {/* Firebase Sync Status Badge */}
      <View style={[
        styles.syncBadge,
        error ? styles.syncBadgeError : (isSynced ? styles.syncBadgeSuccess : styles.syncBadgePending)
      ]}>
        <Ionicons
          name={error ? 'alert-circle' : (isSynced ? 'checkmark-circle' : 'sync')}
          size={16}
          color={error ? Colors.error : (isSynced ? Colors.primary : Colors.warning)}
        />
        <Text style={[
          styles.syncText,
          error ? styles.syncTextError : (isSynced ? styles.syncTextSuccess : styles.syncTextPending)
        ]}>
          {isSynced
            ? 'Account synced with Firestore'
            : error
            ? 'Firebase sync error'
            : 'Syncing profile with Firestore...'}
        </Text>
      </View>

      {/* Main Unified Calorie & Daily Nutrition Tracker Card */}
      <View style={styles.calorieCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>Calories & Macros Tracker</Text>
            <View style={styles.targetBadgeRow}>
              <Text style={styles.cardSubtitle}>{"Today's Target"}</Text>
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

          {/* Edit Target Goal Button */}
          <TouchableOpacity
            style={styles.editTargetBtn}
            onPress={handleOpenEditModal}
            activeOpacity={0.75}
          >
            <PencilEdit01Icon size={14} color="#FFFFFF" />
            <Text style={styles.editTargetBtnText}>Edit Goals</Text>
          </TouchableOpacity>
        </View>

        {/* AI Profile Context Banner (Calculated from Firebase User Database) */}
        <View style={styles.aiProfileContextBanner}>
          <SparklesIcon size={13} color={Colors.primary} />
          <Text style={styles.aiProfileContextText}>
            AI Profile Context • <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Age: {userAge} yrs</Text> | <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Height: {userHeightStr}</Text> | <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Weight: {userWeightKg} kg</Text>
          </Text>
        </View>

        {/* Professional SVG Circular Calorie Bar */}
        <View style={styles.calorieRingContainer}>
          <View style={{ width: svgSize, height: svgSize, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={svgSize} height={svgSize}>
              <Defs>
                <LinearGradient id="calorieGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor={Colors.primary} />
                  <Stop offset="100%" stopColor="#3B82F6" />
                </LinearGradient>
                <LinearGradient id="calorieGradComplete" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#10B981" />
                  <Stop offset="100%" stopColor="#34D399" />
                </LinearGradient>
              </Defs>

              {/* Background Circular Track */}
              <Circle
                cx={svgSize / 2}
                cy={svgSize / 2}
                r={radius}
                stroke="#1E293B"
                strokeWidth={strokeWidth}
                fill="transparent"
              />

              {/* Active Progress Circle Arc */}
              <G rotation="-90" origin={`${svgSize / 2}, ${svgSize / 2}`}>
                <Circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={caloriePercent >= 100 ? 'url(#calorieGradComplete)' : 'url(#calorieGradient)'}
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
              <Text style={styles.calorieCountLabel}>CONSUMED</Text>
              <Text style={styles.calorieCount}>{consumedCalories.toLocaleString()}</Text>
              <Text style={styles.calorieUnit}>/ {targetCalories.toLocaleString()} kcal</Text>
            </View>
          </View>

          {/* Remaining Calorie Status Indicator */}
          <View style={styles.remainingPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.remainingPillText}>
              {remainingCalories.toLocaleString()} kcal remaining ({caloriePercent}%)
            </Text>
          </View>
        </View>

        {/* Quick Goal Highlights Bar */}
        <View style={styles.calorieDetails}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Target Energy</Text>
            <Text style={styles.detailVal}>{targetCalories.toLocaleString()} kcal</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Water Goal</Text>
            <Text style={styles.detailVal}>{waterLiters} L</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Protein Target</Text>
            <Text style={[styles.detailVal, { color: Colors.primary }]}>{targetProtein}g</Text>
          </View>
        </View>

        {/* Integrated Daily Macros Cards (Protein, Carbs, Fats) */}
        <View style={styles.integratedMacrosContainer}>
          <Text style={styles.integratedMacrosTitle}>Daily Macro Targets</Text>
          
          <View style={styles.macrosRow}>
            {/* Protein Card */}
            <View style={styles.macroCard}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <MaterialCommunityIcons name="arm-flex" size={20} color="#EF4444" />
              </View>
              <Text style={styles.macroName}>Protein</Text>
              <Text style={styles.macroValue}>{consumedProtein}g / {targetProtein}g</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: '#EF4444', width: `${Math.min(100, Math.round((consumedProtein / targetProtein) * 100))}%` }]} />
              </View>
            </View>

            {/* Carbs Card */}
            <View style={styles.macroCard}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <MaterialCommunityIcons name="bread-slice" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.macroName}>Carbs</Text>
              <Text style={styles.macroValue}>{consumedCarbs}g / {targetCarbs}g</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: '#F59E0B', width: `${Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100))}%` }]} />
              </View>
            </View>

            {/* Fats Card */}
            <View style={styles.macroCard}>
              <View style={[styles.macroIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <MaterialCommunityIcons name="cheese" size={18} color="#3B82F6" />
              </View>
              <Text style={styles.macroName}>Fats</Text>
              <Text style={styles.macroValue}>{consumedFats}g / {targetFats}g</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { backgroundColor: '#3B82F6', width: `${Math.min(100, Math.round((consumedFats / targetFats) * 100))}%` }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Recent Activity Section (Below Daily Macro Targets) */}
        <View style={styles.recentActivityContainer}>
          {/* Section Header */}
          <View style={styles.recentActivityHeader}>
            <View style={styles.recentActivityTitleRow}>
              <Activity01Icon size={18} color={Colors.primary} />
              <Text style={styles.recentActivityTitle}>Recent Activity</Text>
              {activities.length > 0 && (
                <View style={styles.activityBadge}>
                  <Text style={styles.activityBadgeText}>{activities.length} Today</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={styles.addActivityHeaderBtn}
              onPress={handleOpenAddActivityModal}
              activeOpacity={0.8}
            >
              <Add01Icon size={14} color="#FFFFFF" />
              <Text style={styles.addActivityHeaderBtnText}>Add Activity</Text>
            </TouchableOpacity>
          </View>

          {/* Empty State vs Logged Activity List */}
          {loadingActivities ? (
            <View style={styles.emptyStateCard}>
              <Text style={styles.emptyStateSubtext}>Loading activities...</Text>
            </View>
          ) : activities.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIconContainer}>
                <View style={styles.emptyStateGlowCircle} />
                <View style={styles.emptyStateMainIconBg}>
                  <Activity01Icon size={32} color={Colors.primary} />
                </View>
                <View style={[styles.microIconBadge, { top: -4, right: -4 }]}>
                  <MaterialCommunityIcons name="dumbbell" size={14} color="#EF4444" />
                </View>
                <View style={[styles.microIconBadge, { bottom: -4, left: -4 }]}>
                  <Ionicons name="flame" size={14} color="#F59E0B" />
                </View>
              </View>

              <Text style={styles.emptyStateTitle}>No Activity Logged Today</Text>
              <Text style={styles.emptyStateSubtext}>
                Track your workouts, runs, or daily movement to stay on target with your daily calorie & macro goals.
              </Text>

              <TouchableOpacity
                style={styles.emptyStateAddBtn}
                onPress={handleOpenAddActivityModal}
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
                  <View key={item.id} style={styles.activityItemCard}>
                    <View style={[styles.activityItemIconBg, { backgroundColor: iconConfig.bg }]}>
                      <MaterialCommunityIcons name={iconConfig.icon as any} size={20} color={iconConfig.color} />
                    </View>

                    <View style={styles.activityItemInfo}>
                      <Text style={styles.activityItemTitle}>{item.title}</Text>
                      <View style={styles.activityItemMetaRow}>
                        <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                        <Text style={styles.activityItemMeta}>{item.durationMinutes} mins • {item.timestamp}</Text>
                      </View>
                    </View>

                    <View style={styles.activityItemRight}>
                      <View style={styles.burnedCalorieBadge}>
                        <Ionicons name="flame" size={12} color="#EF4444" />
                        <Text style={styles.burnedCalorieText}>-{item.caloriesBurned} kcal</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteActivityBtn}
                        onPress={() => handleDeleteActivity(item.id, item.title)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={15} color="#9CA3AF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* AI Chatbot Launch Banner */}
      <TouchableOpacity
        style={styles.aiChatBanner}
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
            <Text style={styles.aiChatTitle}>Ask NutriVision AI Chatbot</Text>
            <Text style={styles.aiChatSubtitle}>Ask anything or query food calories instantly</Text>
          </View>
          <View style={styles.aiChatArrowBadge}>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>

      <AIChatModal
        visible={aiChatModalVisible}
        onClose={() => setAiChatModalVisible(false)}
      />

      {/* Modal to Log New Activity */}
      <Modal
        visible={addActivityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddActivityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAddActivityModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.editModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBg}>
                  <Activity01Icon size={20} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTitle}>Log New Activity</Text>
                  <Text style={styles.modalSubTitle}>Save workout to your Firestore database</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setAddActivityModalVisible(false)}
                style={styles.closeBtn}
              >
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Activity Category Selection */}
              <Text style={styles.inputLabelHeader}>Select Category</Text>
              <View style={styles.categoryChipsGrid}>
                {[
                  { id: 'workout', label: 'Gym Workout', icon: 'dumbbell', color: '#EF4444' },
                  { id: 'running', label: 'Running', icon: 'run', color: '#10B981' },
                  { id: 'walking', label: 'Walking', icon: 'walk', color: '#38BDF8' },
                  { id: 'cycling', label: 'Cycling', icon: 'bike', color: '#F59E0B' },
                  { id: 'swimming', label: 'Swimming', icon: 'swim', color: '#3B82F6' },
                  { id: 'yoga', label: 'Yoga', icon: 'flower-tulip-outline', color: '#A855F7' },
                ].map((cat) => {
                  const isSelected = newActivityType === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected,
                        isSelected && { borderColor: cat.color },
                      ]}
                      onPress={() => handleSelectActivityType(cat.id)}
                    >
                      <MaterialCommunityIcons
                        name={cat.icon as any}
                        size={16}
                        color={isSelected ? cat.color : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.categoryChipText,
                          isSelected && { color: '#FFFFFF', fontWeight: '700' },
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabelHeader}>Activity Title</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={newActivityTitle}
                    onChangeText={setNewActivityTitle}
                    placeholder="e.g. Gym Workout"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {/* Duration Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabelHeader}>Duration (minutes)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={newActivityDuration}
                    onChangeText={setNewActivityDuration}
                    keyboardType="numeric"
                    placeholder="30"
                    placeholderTextColor="#64748B"
                    maxLength={3}
                  />
                  <Text style={styles.inputUnit}>mins</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {['15', '30', '45', '60'].map((mins) => (
                    <TouchableOpacity
                      key={`dur-${mins}`}
                      style={styles.quickChip}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewActivityDuration(mins);
                      }}
                    >
                      <Text style={styles.quickChipText}>{mins}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calories Burned Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabelHeader}>Calories Burned (kcal)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={newActivityCalories}
                    onChangeText={setNewActivityCalories}
                    keyboardType="numeric"
                    placeholder="250"
                    placeholderTextColor="#64748B"
                    maxLength={4}
                  />
                  <Text style={styles.inputUnit}>kcal</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {['150', '250', '350', '500'].map((cal) => (
                    <TouchableOpacity
                      key={`cal-${cal}`}
                      style={styles.quickChip}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewActivityCalories(cal);
                      }}
                    >
                      <Text style={styles.quickChipText}>{cal} kcal</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddActivityModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveActivity}
              >
                <CheckmarkCircle01Icon size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Activity</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Comprehensive Edit Target Goals Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.editModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.modalIconBg}>
                  <PencilEdit01Icon size={20} color={Colors.primary} />
                </View>
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.modalTitle}>Edit Daily Nutrition Goals</Text>
                  <Text style={styles.modalSubTitle}>Customize your Calories, Macros & Water</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeBtn}
              >
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* AI Recommendation Info Banner */}
            <View style={styles.aiInfoBanner}>
              <SparklesIcon size={16} color={Colors.primary} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.aiInfoTitle}>AI Model Calculated Baseline</Text>
                <Text style={styles.aiInfoSub}>
                  Based on Firebase data: Age <Text style={{ fontWeight: '700', color: Colors.primary }}>{userAge} yrs</Text>, Height <Text style={{ fontWeight: '700', color: Colors.primary }}>{userHeightStr}</Text>, Weight <Text style={{ fontWeight: '700', color: Colors.primary }}>{userWeightKg} kg</Text>
                </Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* 1. Calorie Input */}
              <View style={styles.inputSection}>
                <View style={styles.inputHeaderRow}>
                  <Ionicons name="flame" size={16} color="#FF6B6B" />
                  <Text style={styles.inputLabel}>Calorie Target (kcal)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedCalories}</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={tempCalorieInput}
                    onChangeText={setTempCalorieInput}
                    keyboardType="numeric"
                    placeholder="2200"
                    placeholderTextColor="#64748B"
                    maxLength={5}
                  />
                  <Text style={styles.inputUnit}>kcal / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-250, -100, 100, 250].map((delta) => (
                    <TouchableOpacity
                      key={`cal-${delta}`}
                      style={styles.quickChip}
                      onPress={() => handleQuickAdjustCalorie(delta)}
                    >
                      <Text style={styles.quickChipText}>
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
                  <Text style={styles.inputLabel}>Protein Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedProtein}g</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={tempProteinInput}
                    onChangeText={setTempProteinInput}
                    keyboardType="numeric"
                    placeholder="138"
                    placeholderTextColor="#64748B"
                    maxLength={4}
                  />
                  <Text style={styles.inputUnit}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-20, -10, 10, 20].map((delta) => (
                    <TouchableOpacity
                      key={`prot-${delta}`}
                      style={styles.quickChip}
                      onPress={() => handleQuickAdjustProtein(delta)}
                    >
                      <Text style={styles.quickChipText}>
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
                  <Text style={styles.inputLabel}>Carbohydrates Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedCarbs}g</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={tempCarbsInput}
                    onChangeText={setTempCarbsInput}
                    keyboardType="numeric"
                    placeholder="275"
                    placeholderTextColor="#64748B"
                    maxLength={4}
                  />
                  <Text style={styles.inputUnit}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-25, -10, 10, 25].map((delta) => (
                    <TouchableOpacity
                      key={`carb-${delta}`}
                      style={styles.quickChip}
                      onPress={() => handleQuickAdjustCarbs(delta)}
                    >
                      <Text style={styles.quickChipText}>
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
                  <Text style={styles.inputLabel}>Dietary Fats Goal (grams)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedFats}g</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={tempFatsInput}
                    onChangeText={setTempFatsInput}
                    keyboardType="numeric"
                    placeholder="61"
                    placeholderTextColor="#64748B"
                    maxLength={4}
                  />
                  <Text style={styles.inputUnit}>grams / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-15, -5, 5, 15].map((delta) => (
                    <TouchableOpacity
                      key={`fat-${delta}`}
                      style={styles.quickChip}
                      onPress={() => handleQuickAdjustFats(delta)}
                    >
                      <Text style={styles.quickChipText}>
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
                  <Text style={styles.inputLabel}>Water Goal (Liters)</Text>
                  <Text style={styles.aiHintVal}>AI: {aiRecommendedWater}L</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.calorieInput}
                    value={tempWaterInput}
                    onChangeText={setTempWaterInput}
                    keyboardType="numeric"
                    placeholder="3.0"
                    placeholderTextColor="#64748B"
                    maxLength={4}
                  />
                  <Text style={styles.inputUnit}>Liters / day</Text>
                </View>
                <View style={styles.quickChipsRow}>
                  {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
                    <TouchableOpacity
                      key={`wat-${delta}`}
                      style={styles.quickChip}
                      onPress={() => handleQuickAdjustWater(delta)}
                    >
                      <Text style={styles.quickChipText}>
                        {delta > 0 ? `+${delta}L` : `${delta}L`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Reset to AI Recommendation Button */}
            <TouchableOpacity
              style={styles.resetAiBtn}
              onPress={handleResetToAi}
            >
              <RefreshIcon size={14} color={Colors.primary} />
              <Text style={styles.resetAiBtnText}>Reset All Goals to AI Recommendation</Text>
            </TouchableOpacity>

            {/* Modal Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveGoals}
              >
                <CheckmarkCircle01Icon size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>Save Goals</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
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
    backgroundColor: '#121824',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  targetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  cardSubtitle: {
    color: '#9CA3AF',
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    backgroundColor: Colors.primary10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary20,
    marginBottom: 16,
  },
  aiProfileContextText: {
    color: '#9CA3AF',
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
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  calorieCount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  calorieUnit: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary10,
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
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  calorieDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 14,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
  },
  detailVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  detailDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#1E293B',
  },
  integratedMacrosContainer: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  integratedMacrosTitle: {
    color: '#FFFFFF',
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
    backgroundColor: '#1A2338',
    borderWidth: 1,
    borderColor: '#26334D',
    borderRadius: 16,
    padding: 12,
  },
  macroIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroName: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  macroValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#111726',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  aiChatBanner: {
    backgroundColor: '#121824',
    borderWidth: 1.5,
    borderColor: Colors.primary30,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  aiChatSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
  aiChatArrowBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(81, 130, 216, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 15, 23, 0.85)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  editModalContent: {
    backgroundColor: '#121824',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubTitle: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1C253B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiInfoBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary10,
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
    color: '#9CA3AF',
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
    color: '#CBD5E1',
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
    backgroundColor: '#0C0F17',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary30,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 8,
  },
  calorieInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 6,
  },
  inputUnit: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickChip: {
    flex: 1,
    backgroundColor: '#1C253B',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#26334D',
  },
  quickChipText: {
    color: '#FFFFFF',
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
    backgroundColor: '#1C253B',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  cancelBtnText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
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

  /* Recent Activity Section Styles */
  recentActivityContainer: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
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
    color: '#FFFFFF',
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
    backgroundColor: Colors.primary,
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
    backgroundColor: '#161F33',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#232E4A',
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
    backgroundColor: Colors.primary10,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  emptyStateMainIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C0F17',
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
    backgroundColor: '#1C253B',
    borderWidth: 1,
    borderColor: '#2E3D5C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  emptyStateAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
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
    backgroundColor: '#161F33',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#232E4A',
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  activityItemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  activityItemMeta: {
    color: '#9CA3AF',
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
    backgroundColor: '#1F2B45',
    borderRadius: 8,
  },
  inputLabelHeader: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  categoryChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#26334D',
  },
  categoryChipSelected: {
    backgroundColor: '#1E2B45',
  },
  categoryChipText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
});
