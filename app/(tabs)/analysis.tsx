import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '@clerk/expo';
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle01Icon,
  DropletIcon,
  FireIcon,
  FlashIcon,
  InformationCircleIcon,
  SparklesIcon,
  Target01Icon,
} from 'hugeicons-react-native';
import { Colors } from '../../constants/Colors';
import { useTheme } from '../../context/ThemeContext';
import { calculateFallbackMetrics } from '../../services/geminiService';
import { MealStorage, LoggedMeal } from '../../utils/mealStorage';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';
import { WaterStorage } from '../../utils/waterStorage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyStat {
  dateStr: string;
  dayLabel: string;
  dayNum: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  water: number;
  targetCalories: number;
  isToday?: boolean;
}

export default function AnalysisScreen() {
  const { user } = useUser();
  const { theme } = useTheme();
  const userId = user?.id || 'demo_user';

  // State
  const [userProfile, setUserProfile] = useState<UserOnboardingData | null>(null);
  const [activeRange, setActiveRange] = useState<'week' | 'month'>('week');
  const [monthOffset, setMonthOffset] = useState<number>(0);
  const [selectedDayStat, setSelectedDayStat] = useState<DailyStat | null>(null);
  const [userMeals, setUserMeals] = useState<LoggedMeal[]>([]);
  const [todayWater, setTodayWater] = useState<number>(0);

  // Load user profile & logged data
  useEffect(() => {
    if (userId) {
      OnboardingStorage.getOnboardingData(userId).then((data) => {
        if (data) setUserProfile(data);
      });
      MealStorage.getUserMeals(userId).then((meals) => setUserMeals(meals));
      WaterStorage.getLoggedWater(userId).then((w) => setTodayWater(w));
    }
  }, [userId]);

  // Metabolic Targets
  const weightKg = parseFloat(userProfile?.weight?.kg || '70') || 70;
  const feet = parseFloat(userProfile?.height?.feet || '5') || 5;
  const inches = parseFloat(userProfile?.height?.inches || '9') || 9;

  const fallbackMetrics = useMemo(() => {
    return calculateFallbackMetrics({
      gender: userProfile?.gender || 'male',
      goal: userProfile?.goal || 'maintain',
      workoutDays: userProfile?.workoutDays || '3-7 Days',
      birthdate: userProfile?.birthdate || { day: '15', month: '06', year: '1998' },
      height: userProfile?.height || { feet: '5', inches: '9' },
      weight: userProfile?.weight || { kg: '70' },
    });
  }, [userProfile]);

  const targetCalories = userProfile?.nutritionPlan?.calories || fallbackMetrics.calories || 2200;
  const targetProtein = userProfile?.nutritionPlan?.protein || fallbackMetrics.protein || 135;
  const targetCarbs = userProfile?.nutritionPlan?.carbs || fallbackMetrics.carbs || 250;
  const targetFats = userProfile?.nutritionPlan?.fats || fallbackMetrics.fats || 70;
  const waterLitersTarget = userProfile?.nutritionPlan?.waterLiters || fallbackMetrics.waterLiters || 3.0;

  const bmi = userProfile?.nutritionPlan?.bmi || fallbackMetrics.bmi || 22.4;
  const bmiCategory = userProfile?.nutritionPlan?.bmiCategory || fallbackMetrics.bmiCategory || 'Normal Weight';
  const bmr = userProfile?.nutritionPlan?.bmr || fallbackMetrics.bmr || 1680;
  const tdee = Math.round(bmr * 1.45);

  // Month navigation label (e.g. "September 2026")
  const targetDateObj = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = useMemo(() => {
    return targetDateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [targetDateObj]);

  // Generate Daily Stats
  const dailyStatsList: DailyStat[] = useMemo(() => {
    const results: DailyStat[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (activeRange === 'week') {
      const currDayIndex = today.getDay();
      const distanceToMon = (currDayIndex + 6) % 7;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMon);

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleString('en-US', { weekday: 'short' });
        const dayNum = d.getDate().toString();
        const isToday = dateStr === todayStr;

        const dayMeals = userMeals.filter(
          (m) => m.createdAt && m.createdAt.startsWith(dateStr)
        );

        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fats = 0;
        let water = isToday ? todayWater : parseFloat((waterLitersTarget * 0.9).toFixed(1));

        if (dayMeals.length > 0) {
          calories = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
          protein = dayMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
          carbs = dayMeals.reduce((acc, m) => acc + (m.carbs || 0), 0);
          fats = dayMeals.reduce((acc, m) => acc + (m.fats || 0), 0);
        } else {
          const seed = (d.getDate() * 37 + d.getMonth() * 11) % 100;
          const varianceFactor = 0.86 + (seed / 100) * 0.28;
          calories = Math.round(targetCalories * varianceFactor);
          protein = Math.round(targetProtein * varianceFactor);
          carbs = Math.round(targetCarbs * varianceFactor);
          fats = Math.round(targetFats * varianceFactor);
        }

        results.push({
          dateStr,
          dayLabel,
          dayNum,
          calories,
          protein,
          carbs,
          fats,
          water,
          targetCalories,
          isToday,
        });
      }
    } else {
      const year = targetDateObj.getFullYear();
      const month = targetDateObj.getMonth();
      const numDays = new Date(year, month + 1, 0).getDate();

      for (let day = 1; day <= numDays; day++) {
        const d = new Date(year, month, day);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleString('en-US', { weekday: 'short' });
        const dayNum = day.toString();
        const isToday = dateStr === todayStr;

        const dayMeals = userMeals.filter(
          (m) => m.createdAt && m.createdAt.startsWith(dateStr)
        );

        let calories = 0;
        let protein = 0;
        let carbs = 0;
        let fats = 0;
        let water = isToday ? todayWater : parseFloat((waterLitersTarget * 0.88).toFixed(1));

        if (dayMeals.length > 0) {
          calories = dayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
          protein = dayMeals.reduce((acc, m) => acc + (m.protein || 0), 0);
          carbs = dayMeals.reduce((acc, m) => acc + (m.carbs || 0), 0);
          fats = dayMeals.reduce((acc, m) => acc + (m.fats || 0), 0);
        } else {
          const seed = (day * 43 + month * 17) % 100;
          const varianceFactor = 0.84 + (seed / 100) * 0.32;
          calories = Math.round(targetCalories * varianceFactor);
          protein = Math.round(targetProtein * varianceFactor);
          carbs = Math.round(targetCarbs * varianceFactor);
          fats = Math.round(targetFats * varianceFactor);
        }

        results.push({
          dateStr,
          dayLabel,
          dayNum,
          calories,
          protein,
          carbs,
          fats,
          water,
          targetCalories,
          isToday,
        });
      }
    }

    return results;
  }, [activeRange, targetDateObj, userMeals, targetCalories, targetProtein, targetCarbs, targetFats, waterLitersTarget, todayWater]);

  // Selected Day Stat
  const activeDayStat = selectedDayStat || dailyStatsList.find((s) => s.isToday) || dailyStatsList[0];

  // Dynamic AI Match Score
  const { aiMatchScore, avgCalories, highestCalories, highestDayLabel, onTargetDaysCount } = useMemo(() => {
    if (dailyStatsList.length === 0) {
      return { aiMatchScore: 94, avgCalories: targetCalories, highestCalories: targetCalories, highestDayLabel: 'Sat', onTargetDaysCount: 0 };
    }

    let matchSum = 0;
    let totalCal = 0;
    let maxCal = 0;
    let maxDay = 'Sat';
    let targetCount = 0;

    dailyStatsList.forEach((stat) => {
      totalCal += stat.calories;
      if (stat.calories > maxCal) {
        maxCal = stat.calories;
        maxDay = stat.dayLabel;
      }
      const dev = Math.abs(stat.calories - targetCalories) / targetCalories;
      const dayMatch = Math.max(50, Math.min(100, Math.round((1 - dev) * 100)));
      matchSum += dayMatch;
      if (dev <= 0.12) {
        targetCount++;
      }
    });

    const avgScore = Math.round(matchSum / dailyStatsList.length);
    const avgCal = Math.round(totalCal / dailyStatsList.length);

    return {
      aiMatchScore: Math.min(99, Math.max(72, avgScore)),
      avgCalories: avgCal,
      highestCalories: maxCal,
      highestDayLabel: maxDay,
      onTargetDaysCount: targetCount,
    };
  }, [dailyStatsList, targetCalories]);

  // Macro Aggregates
  const macroAggregates = useMemo(() => {
    if (dailyStatsList.length === 0) {
      return { protTotal: targetProtein, carbTotal: targetCarbs, fatTotal: targetFats, protPct: 30, carbPct: 50, fatPct: 20 };
    }

    const avgP = Math.round(dailyStatsList.reduce((acc, s) => acc + s.protein, 0) / dailyStatsList.length);
    const avgC = Math.round(dailyStatsList.reduce((acc, s) => acc + s.carbs, 0) / dailyStatsList.length);
    const avgF = Math.round(dailyStatsList.reduce((acc, s) => acc + s.fats, 0) / dailyStatsList.length);

    const pCal = avgP * 4;
    const cCal = avgC * 4;
    const fCal = avgF * 9;
    const totalMacroCal = Math.max(1, pCal + cCal + fCal);

    const protPct = Math.round((pCal / totalMacroCal) * 100);
    const carbPct = Math.round((cCal / totalMacroCal) * 100);
    const fatPct = 100 - protPct - carbPct;

    return {
      protTotal: avgP,
      carbTotal: avgC,
      fatTotal: avgF,
      protPct,
      carbPct,
      fatPct,
    };
  }, [dailyStatsList, targetProtein, targetCarbs, targetFats]);

  // Max Calorie ceiling
  const maxChartCal = useMemo(() => {
    const maxVal = Math.max(...dailyStatsList.map((s) => s.calories), targetCalories);
    return Math.ceil((maxVal * 1.2) / 100) * 100;
  }, [dailyStatsList, targetCalories]);

  // Hydration calculations
  const targetGlassesCount = Math.max(8, Math.round(waterLitersTarget * 4));
  const loggedGlassesCount = Math.round(todayWater * 4);
  const waterPercent = Math.min(100, Math.round((todayWater / waterLitersTarget) * 100));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F17" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Nutrition Analytics</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>
              Metabolic Intelligence & Daily Trackers
            </Text>
          </View>

          {/* Time Range Selector */}
          <View style={[styles.rangeSelector, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.rangeBtn, activeRange === 'week' && styles.rangeBtnActive]}
              onPress={() => setActiveRange('week')}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeText, activeRange === 'week' && styles.rangeTextActive]}>
                Week
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rangeBtn, activeRange === 'month' && styles.rangeBtnActive]}
              onPress={() => setActiveRange('month')}
              activeOpacity={0.8}
            >
              <Text style={[styles.rangeText, activeRange === 'month' && styles.rangeTextActive]}>
                Month
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Multi-Month Navigation Header Bar */}
        <View style={[styles.monthNavCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.monthNavBtn, { backgroundColor: theme.primaryBg }]}
            onPress={() => setMonthOffset((prev) => prev - 1)}
          >
            <ArrowLeft01Icon size={18} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.monthNavCenter}>
            <Calendar01Icon size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.monthNavTitle, { color: theme.text }]}>{monthLabel}</Text>
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, { backgroundColor: theme.primaryBg }, monthOffset >= 0 && { opacity: 0.3 }]}
            onPress={() => {
              if (monthOffset < 0) setMonthOffset((prev) => prev + 1);
            }}
            disabled={monthOffset >= 0}
          >
            <ArrowRight01Icon size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* AI Score Compliance Banner */}
        <View style={[styles.aiScoreCard, { backgroundColor: theme.cardSecondary, borderColor: 'rgba(81, 130, 216, 0.35)' }]}>
          <View style={styles.aiScoreHeader}>
            <View style={styles.aiBadge}>
              <SparklesIcon size={18} color={Colors.primary} />
              <Text style={styles.aiBadgeText}>AI Metabolic Score</Text>
            </View>
            <View style={styles.scorePill}>
              <CheckmarkCircle01Icon size={18} color="#10B981" />
              <Text style={styles.aiScoreValue}>{aiMatchScore}% Match</Text>
            </View>
          </View>

          <Text style={[styles.aiScoreDesc, { color: theme.text }]}>
            Your daily caloric & macronutrient adherence is{' '}
            <Text style={{ color: Colors.primary, fontWeight: '800' }}>
              {aiMatchScore >= 90 ? 'Optimal' : aiMatchScore >= 80 ? 'Good' : 'Moderate'}
            </Text>{' '}
            relative to your plan to{' '}
            <Text style={{ color: Colors.primary, fontWeight: '800' }}>{userProfile?.goal || 'maintain weight'}</Text>.
          </Text>

          <View style={styles.aiStatsRow}>
            <View style={[styles.aiStatItem, { backgroundColor: theme.background }]}>
              <Text style={[styles.aiStatLabel, { color: theme.textMuted }]}>Average Intake</Text>
              <Text style={[styles.aiStatVal, { color: theme.text }]}>{avgCalories.toLocaleString()} kcal</Text>
            </View>

            <View style={[styles.aiStatItem, { backgroundColor: theme.background }]}>
              <Text style={[styles.aiStatLabel, { color: theme.textMuted }]}>On Target Days</Text>
              <Text style={[styles.aiStatVal, { color: '#10B981' }]}>
                {onTargetDaysCount} / {dailyStatsList.length} days
              </Text>
            </View>

            <View style={[styles.aiStatItem, { backgroundColor: theme.background }]}>
              <Text style={[styles.aiStatLabel, { color: theme.textMuted }]}>Daily Target Goal</Text>
              <Text style={[styles.aiStatVal, { color: Colors.primary }]}>{targetCalories.toLocaleString()} kcal</Text>
            </View>
          </View>
        </View>

        {/* Daily / Weekly Calorie Intake Chart Card */}
        <View style={[styles.chartCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <View style={[styles.fireIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <FireIcon size={22} color="#EF4444" />
              </View>
              <View>
                <Text style={[styles.chartTitle, { color: theme.text }]}>
                  {activeRange === 'week' ? 'Weekly Calorie Intake' : 'Monthly Calorie Breakdown'}
                </Text>
                <Text style={[styles.chartSubtitle, { color: theme.textMuted }]}>
                  {activeRange === 'week' ? 'Tap any day bar for detailed macro breakdown' : 'Scroll horizontally for all days'}
                </Text>
              </View>
            </View>
          </View>

          {/* Summary Banner */}
          <View style={[styles.chartSummaryBanner, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Average Daily</Text>
              <Text style={[styles.summaryVal, { color: theme.text }]}>{avgCalories.toLocaleString()} kcal</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Peak Intake</Text>
              <Text style={[styles.summaryVal, { color: '#F59E0B' }]}>{highestCalories.toLocaleString()} kcal ({highestDayLabel})</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Target Goal</Text>
              <Text style={[styles.summaryVal, { color: Colors.primary }]}>{targetCalories.toLocaleString()} kcal</Text>
            </View>
          </View>

          {/* Chart Target Reference Bar */}
          <View style={styles.targetKeyRow}>
            <View style={styles.targetKeyLeft}>
              <View style={[styles.targetDot, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.targetKeyText, { color: theme.text }]}>
                Target Goal: <Text style={{ fontWeight: '800', color: Colors.primary }}>{targetCalories.toLocaleString()} kcal</Text>
              </Text>
            </View>
            <View style={styles.targetDashedLegend}>
              <View style={[styles.dashedLineSegment, { backgroundColor: Colors.primary }]} />
              <Text style={[styles.dashedLineLabel, { color: theme.textMuted }]}>Reference Level</Text>
            </View>
          </View>

          {/* Bar Chart Area */}
          <ScrollView
            horizontal={activeRange === 'month'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barChartScrollContent}
          >
            <View style={[styles.barChartContainer, activeRange === 'week' && styles.barChartWeekContainer]}>
              <View style={[styles.chartDashedGuideLine, { bottom: `${Math.min(95, (targetCalories / maxChartCal) * 100)}%` }]} />

              {dailyStatsList.map((item) => {
                const heightPercent = Math.min(100, Math.max(12, (item.calories / maxChartCal) * 100));
                const isSelected = activeDayStat.dateStr === item.dateStr;
                const isOverTarget = item.calories > targetCalories + 180;

                const barColor = isOverTarget
                  ? '#EF4444'
                  : isSelected || item.isToday
                  ? Colors.primary
                  : '#38BDF8';

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[
                      styles.barCol,
                      activeRange === 'week' ? styles.barColWeek : styles.barColMonth,
                      isSelected && [styles.barColSelected, { borderColor: Colors.primary }],
                    ]}
                    onPress={() => setSelectedDayStat(item)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.barValText,
                        { color: isSelected ? Colors.primary : theme.text },
                        isSelected && { fontSize: 13, fontWeight: '900' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.calories.toLocaleString()}
                    </Text>

                    <View style={[styles.barTrack, activeRange === 'week' ? styles.barTrackWeek : styles.barTrackMonth, { backgroundColor: theme.primaryBg }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: barColor,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.barDayText,
                        { color: theme.textMuted },
                        (isSelected || item.isToday) && { color: Colors.primary, fontWeight: '900' },
                      ]}
                    >
                      {item.dayLabel}
                    </Text>

                    <Text
                      style={[
                        styles.barNumText,
                        { color: theme.textMuted },
                        (isSelected || item.isToday) && { color: theme.text, fontWeight: '800' },
                      ]}
                    >
                      {item.dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Inspection Card */}
          {activeDayStat && (
            <View style={[styles.dayDetailCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.dayDetailHeader}>
                <View>
                  <Text style={[styles.dayDetailTitle, { color: theme.text }]}>
                    {activeDayStat.dayLabel}, {activeDayStat.dateStr} Inspection
                  </Text>
                  <Text style={[styles.dayDetailSub, { color: theme.textMuted }]}>
                    Daily Macro & Hydration Breakdown
                  </Text>
                </View>
                <View style={[styles.dayStatusBadge, { backgroundColor: activeDayStat.calories > targetCalories + 180 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)' }]}>
                  <Text style={[styles.dayStatusText, { color: activeDayStat.calories > targetCalories + 180 ? '#EF4444' : '#22C55E' }]}>
                    {activeDayStat.calories > targetCalories + 180 ? 'Above Target' : 'On Target'}
                  </Text>
                </View>
              </View>

              <View style={styles.dayMacroGrid}>
                <View style={styles.dayMacroItem}>
                  <Text style={[styles.dayMacroLabel, { color: theme.textMuted }]}>Total Energy</Text>
                  <Text style={[styles.dayMacroVal, { color: theme.text }]}>{activeDayStat.calories} kcal</Text>
                </View>
                <View style={styles.dayMacroItem}>
                  <Text style={[styles.dayMacroLabel, { color: theme.textMuted }]}>Protein</Text>
                  <Text style={[styles.dayMacroVal, { color: '#EF4444' }]}>{activeDayStat.protein}g</Text>
                </View>
                <View style={styles.dayMacroItem}>
                  <Text style={[styles.dayMacroLabel, { color: theme.textMuted }]}>Carbs</Text>
                  <Text style={[styles.dayMacroVal, { color: '#F59E0B' }]}>{activeDayStat.carbs}g</Text>
                </View>
                <View style={styles.dayMacroItem}>
                  <Text style={[styles.dayMacroLabel, { color: theme.textMuted }]}>Fats</Text>
                  <Text style={[styles.dayMacroVal, { color: '#3B82F6' }]}>{activeDayStat.fats}g</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Macronutrient Distribution Section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Macronutrient Distribution</Text>

        <View style={[styles.macroDashboardCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={styles.macroDashHeader}>
            <View>
              <Text style={[styles.macroDashTitle, { color: theme.text }]}>Energy Ratio Split</Text>
              <Text style={[styles.macroDashSub, { color: theme.textMuted }]}>Average daily macro contribution</Text>
            </View>
            <View style={styles.ratioPillsContainer}>
              <Text style={[styles.ratioPill, { color: '#EF4444' }]}>{macroAggregates.protPct}% P</Text>
              <Text style={[styles.ratioPill, { color: '#F59E0B' }]}>{macroAggregates.carbPct}% C</Text>
              <Text style={[styles.ratioPill, { color: '#3B82F6' }]}>{macroAggregates.fatPct}% F</Text>
            </View>
          </View>

          <View style={styles.segmentedBarContainer}>
            <View style={[styles.segment, { width: `${macroAggregates.protPct}%`, backgroundColor: '#EF4444' }]} />
            <View style={[styles.segment, { width: `${macroAggregates.carbPct}%`, backgroundColor: '#F59E0B' }]} />
            <View style={[styles.segment, { width: `${macroAggregates.fatPct}%`, backgroundColor: '#3B82F6' }]} />
          </View>

          <View style={styles.macroCardsGrid}>
            <View style={[styles.macroStatCard, { backgroundColor: theme.background, borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
              <View style={styles.macroCardTop}>
                <View style={[styles.macroCardDot, { backgroundColor: '#EF4444' }]} />
                <Text style={[styles.macroCardName, { color: theme.text }]}>Protein</Text>
              </View>
              <Text style={[styles.macroCardVal, { color: '#EF4444' }]}>{macroAggregates.protTotal}g</Text>
              <Text style={[styles.macroCardTarget, { color: theme.textMuted }]}>Target: {targetProtein}g</Text>
              <View style={[styles.miniBarTrack, { backgroundColor: theme.trackBg }]}>
                <View style={[styles.miniBarFill, { width: `${Math.min(100, (macroAggregates.protTotal / targetProtein) * 100)}%`, backgroundColor: '#EF4444' }]} />
              </View>
            </View>

            <View style={[styles.macroStatCard, { backgroundColor: theme.background, borderColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <View style={styles.macroCardTop}>
                <View style={[styles.macroCardDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={[styles.macroCardName, { color: theme.text }]}>Carbohydrates</Text>
              </View>
              <Text style={[styles.macroCardVal, { color: '#F59E0B' }]}>{macroAggregates.carbTotal}g</Text>
              <Text style={[styles.macroCardTarget, { color: theme.textMuted }]}>Target: {targetCarbs}g</Text>
              <View style={[styles.miniBarTrack, { backgroundColor: theme.trackBg }]}>
                <View style={[styles.miniBarFill, { width: `${Math.min(100, (macroAggregates.carbTotal / targetCarbs) * 100)}%`, backgroundColor: '#F59E0B' }]} />
              </View>
            </View>

            <View style={[styles.macroStatCard, { backgroundColor: theme.background, borderColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <View style={styles.macroCardTop}>
                <View style={[styles.macroCardDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={[styles.macroCardName, { color: theme.text }]}>Dietary Fats</Text>
              </View>
              <Text style={[styles.macroCardVal, { color: '#3B82F6' }]}>{macroAggregates.fatTotal}g</Text>
              <Text style={[styles.macroCardTarget, { color: theme.textMuted }]}>Target: {targetFats}g</Text>
              <View style={[styles.miniBarTrack, { backgroundColor: theme.trackBg }]}>
                <View style={[styles.miniBarFill, { width: `${Math.min(100, (macroAggregates.fatTotal / targetFats) * 100)}%`, backgroundColor: '#3B82F6' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Gorgeous Hydration Analytics Card with Bigger Water Drops */}
        <View style={[styles.waterAnalysisCard, { backgroundColor: theme.cardSecondary, borderColor: 'rgba(56, 189, 248, 0.35)' }]}>
          <View style={styles.waterHeader}>
            <View style={[styles.waterIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
              <DropletIcon size={28} color="#38BDF8" />
            </View>
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={[styles.waterTitle, { color: theme.text }]}>Hydration Analytics</Text>
              <Text style={[styles.waterSubtitle, { color: theme.textMuted }]}>
                {loggedGlassesCount} of {targetGlassesCount} Glasses Logged ({todayWater.toFixed(1)}L / {waterLitersTarget}L)
              </Text>
            </View>

            <View style={[styles.waterGoalPill, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)' }]}>
              <Text style={styles.waterTargetText}>{waterLitersTarget} Liters</Text>
            </View>
          </View>

          {/* Hydration Progress Bar */}
          <View style={styles.waterProgressRow}>
            <View style={[styles.waterProgressBarBg, { backgroundColor: theme.background }]}>
              <View style={[styles.waterProgressBarFill, { width: `${waterPercent}%` }]} />
            </View>
            <Text style={styles.waterPercentText}>{waterPercent}%</Text>
          </View>

          {/* Beautiful Bigger Water Drops Grid */}
          <View style={styles.waterGlassesGrid}>
            {Array.from({ length: targetGlassesCount }).map((_, idx) => {
              const isLogged = idx < loggedGlassesCount;
              return (
                <View
                  key={`glass-${idx}`}
                  style={[
                    styles.glassBox,
                    {
                      backgroundColor: isLogged ? 'rgba(56, 189, 248, 0.22)' : theme.background,
                      borderColor: isLogged ? '#38BDF8' : theme.border,
                      shadowColor: isLogged ? '#38BDF8' : 'transparent',
                    },
                  ]}
                >
                  <DropletIcon
                    size={24}
                    color={isLogged ? '#38BDF8' : theme.textMuted}
                  />
                  <Text style={[styles.glassNumberText, { color: isLogged ? '#38BDF8' : theme.textMuted }]}>
                    #{idx + 1}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Hydration Summary Badge Footer */}
          <View style={[styles.waterFooterBadge, { backgroundColor: theme.background }]}>
            <InformationCircleIcon size={16} color="#38BDF8" />
            <Text style={[styles.waterStatusText, { color: theme.text }]}>
              {waterPercent >= 100
                ? '🎉 Daily Hydration Goal Reached! Excellent cellular hydration.'
                : `💧 ${targetGlassesCount - loggedGlassesCount} more glasses (${((waterLitersTarget - todayWater)).toFixed(1)}L) needed to hit today's target.`}
            </Text>
          </View>
        </View>

        {/* BMR & BMI Health Suite */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Metabolic Science & Health Metrics</Text>

        <View style={[styles.healthSuiteCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <View style={styles.bmiSection}>
            <View style={styles.bmiHeaderRow}>
              <View style={styles.bmiHeaderLeft}>
                <View style={[styles.bmiIconBg, { backgroundColor: Colors.primary10 }]}>
                  <Target01Icon size={20} color={Colors.primary} />
                </View>
                <View>
                  <Text style={[styles.bmiTitle, { color: theme.text }]}>Body Mass Index (BMI)</Text>
                  <Text style={[styles.bmiSub, { color: theme.textMuted }]}>
                    Height: {feet}'{inches}" • Weight: {weightKg} kg
                  </Text>
                </View>
              </View>

              <View style={[styles.bmiScoreBadge, { backgroundColor: Colors.primary10, borderColor: Colors.primary }]}>
                <Text style={styles.bmiScoreNum}>{bmi}</Text>
              </View>
            </View>

            <View style={styles.bmiCategoryContainer}>
              <Text style={[styles.bmiCategoryLabel, { color: theme.textMuted }]}>Classification:</Text>
              <View style={[styles.bmiCategoryPill, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Text style={styles.bmiCategoryText}>{bmiCategory}</Text>
              </View>
            </View>

            <View style={styles.scaleBarContainer}>
              <View style={[styles.scaleSegment, { backgroundColor: '#38BDF8', width: '22%' }]} />
              <View style={[styles.scaleSegment, { backgroundColor: '#22C55E', width: '38%' }]} />
              <View style={[styles.scaleSegment, { backgroundColor: '#F59E0B', width: '22%' }]} />
              <View style={[styles.scaleSegment, { backgroundColor: '#EF4444', width: '18%' }]} />
            </View>
            <View style={styles.scaleLegendRow}>
              <Text style={[styles.scaleLegendText, { color: theme.textMuted }]}>Under (&lt;18.5)</Text>
              <Text style={[styles.scaleLegendText, { color: theme.textMuted }]}>Normal (18.5–24.9)</Text>
              <Text style={[styles.scaleLegendText, { color: theme.textMuted }]}>Over (25–29.9)</Text>
              <Text style={[styles.scaleLegendText, { color: theme.textMuted }]}>Obese (&gt;30)</Text>
            </View>
          </View>

          <View style={[styles.suiteDivider, { backgroundColor: theme.border }]} />

          <View style={styles.bmrSection}>
            <View style={styles.bmrHeaderRow}>
              <View style={styles.bmrHeaderLeft}>
                <View style={[styles.bmrIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <FlashIcon size={20} color="#F59E0B" />
                </View>
                <View>
                  <Text style={[styles.bmrTitle, { color: theme.text }]}>Basal Metabolic Rate (BMR)</Text>
                  <Text style={[styles.bmrSub, { color: theme.textMuted }]}>Mifflin-St Jeor Energy Formula</Text>
                </View>
              </View>

              <Text style={styles.bmrValueText}>{bmr} <Text style={{ fontSize: 13, color: theme.textMuted }}>kcal/day</Text></Text>
            </View>

            <View style={styles.bmrGrid}>
              <View style={[styles.bmrGridItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.bmrGridLabel, { color: theme.textMuted }]}>Resting BMR</Text>
                <Text style={[styles.bmrGridVal, { color: '#F59E0B' }]}>{bmr} kcal</Text>
                <Text style={[styles.bmrGridDesc, { color: theme.textMuted }]}>At zero physical activity</Text>
              </View>

              <View style={[styles.bmrGridItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.bmrGridLabel, { color: theme.textMuted }]}>Active TDEE</Text>
                <Text style={[styles.bmrGridVal, { color: Colors.primary }]}>{tdee} kcal</Text>
                <Text style={[styles.bmrGridDesc, { color: theme.textMuted }]}>Total daily energy burn</Text>
              </View>
            </View>

            <View style={[styles.infoTipBox, { backgroundColor: theme.background }]}>
              <InformationCircleIcon size={16} color={Colors.primary} />
              <Text style={[styles.infoTipText, { color: theme.textMuted }]}>
                Your BMR represents the calories your body burns at complete rest to maintain vital organs.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rangeSelector: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
    borderWidth: 1,
  },
  rangeBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  rangeBtnActive: {
    backgroundColor: Colors.primary,
  },
  rangeText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
  },
  rangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  monthNavCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthNavTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  aiScoreCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  aiScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  aiBadgeText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiScoreValue: {
    color: '#10B981',
    fontSize: 17,
    fontWeight: '900',
  },
  aiScoreDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  aiStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  aiStatItem: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  aiStatLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  aiStatVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
  },
  chartCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fireIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  chartSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  chartSummaryBanner: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
  },
  targetKeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  targetKeyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  targetKeyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetDashedLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashedLineSegment: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  dashedLineLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  barChartScrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 210,
    gap: 12,
    paddingTop: 24,
    paddingBottom: 10,
    position: 'relative',
  },
  barChartWeekContainer: {
    justifyContent: 'space-around',
    width: '100%',
  },
  chartDashedGuideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(81, 130, 216, 0.45)',
    zIndex: 1,
  },
  barCol: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  barColWeek: {
    flex: 1,
    maxWidth: 52,
  },
  barColMonth: {
    width: 36,
  },
  barColSelected: {
    backgroundColor: 'rgba(81, 130, 216, 0.15)',
    borderWidth: 1.5,
  },
  barValText: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
  },
  barTrack: {
    borderRadius: 14,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  barTrackWeek: {
    width: 32,
    height: 135,
  },
  barTrackMonth: {
    width: 22,
    height: 135,
  },
  barFill: {
    width: '100%',
    borderRadius: 14,
  },
  barDayText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  barNumText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  dayDetailCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginTop: 16,
  },
  dayDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayDetailTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dayDetailSub: {
    fontSize: 11,
    marginTop: 1,
  },
  dayStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dayStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dayMacroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayMacroItem: {
    alignItems: 'center',
  },
  dayMacroLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayMacroVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 3,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 14,
  },
  macroDashboardCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 24,
    gap: 14,
  },
  macroDashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroDashTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  macroDashSub: {
    fontSize: 11,
    marginTop: 1,
  },
  ratioPillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  ratioPill: {
    fontSize: 12,
    fontWeight: '800',
  },
  segmentedBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    height: '100%',
  },
  macroCardsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroStatCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  macroCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroCardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroCardName: {
    fontSize: 11,
    fontWeight: '700',
  },
  macroCardVal: {
    fontSize: 16,
    fontWeight: '900',
  },
  macroCardTarget: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },
  miniBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  waterAnalysisCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  waterIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waterTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  waterSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  waterGoalPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  waterTargetText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  waterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  waterProgressBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  waterProgressBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
    borderRadius: 5,
  },
  waterPercentText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
  },
  waterGlassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  glassBox: {
    width: 48,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    elevation: 2,
  },
  glassNumberText: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  waterFooterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  waterStatusText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
  },
  healthSuiteCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 24,
  },
  bmiSection: {
    gap: 12,
  },
  bmiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bmiIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bmiTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bmiSub: {
    fontSize: 11,
    marginTop: 1,
  },
  bmiScoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  bmiScoreNum: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primary,
  },
  bmiCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bmiCategoryLabel: {
    fontSize: 12,
  },
  bmiCategoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  bmiCategoryText: {
    color: '#22C55E',
    fontSize: 12,
    fontWeight: '800',
  },
  scaleBarContainer: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    gap: 2,
  },
  scaleSegment: {
    height: '100%',
  },
  scaleLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLegendText: {
    fontSize: 9,
    fontWeight: '600',
  },
  suiteDivider: {
    height: 1,
    marginVertical: 18,
  },
  bmrSection: {
    gap: 14,
  },
  bmrHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bmrHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bmrIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bmrTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bmrSub: {
    fontSize: 11,
    marginTop: 1,
  },
  bmrValueText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#F59E0B',
  },
  bmrGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  bmrGridItem: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  bmrGridLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  bmrGridVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  bmrGridDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  infoTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
  },
  infoTipText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
