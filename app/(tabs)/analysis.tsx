import { useUser } from '@clerk/expo';
import {
  DropletIcon,
  FireIcon,
  FlashIcon,
  SparklesIcon,
  Target01Icon
} from 'hugeicons-react-native';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';

export default function AnalysisScreen() {
  const { user } = useUser();
  const [userProfile, setUserProfile] = useState<UserOnboardingData | null>(null);
  const [activeRange, setActiveRange] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (user?.id) {
      OnboardingStorage.getOnboardingData(user.id).then((data) => {
        if (data) setUserProfile(data);
      });
    }
  }, [user?.id]);

  const targetCalories = userProfile?.nutritionPlan?.calories || 2200;
  const targetProtein = userProfile?.nutritionPlan?.protein || 130;
  const targetCarbs = userProfile?.nutritionPlan?.carbs || 250;
  const targetFats = userProfile?.nutritionPlan?.fats || 70;
  const waterLiters = userProfile?.nutritionPlan?.waterLiters || 3.0;
  const bmi = userProfile?.nutritionPlan?.bmi || 22.4;
  const bmiCategory = userProfile?.nutritionPlan?.bmiCategory || 'Normal Weight';
  const bmr = userProfile?.nutritionPlan?.bmr || 1680;

  // Mock weekly data for interactive analysis chart bars
  const weeklyStats = [
    { day: 'Mon', calories: 2150, target: targetCalories },
    { day: 'Tue', calories: 2280, target: targetCalories },
    { day: 'Wed', calories: 1980, target: targetCalories },
    { day: 'Thu', calories: 2200, target: targetCalories },
    { day: 'Fri', calories: 2110, target: targetCalories },
    { day: 'Sat', calories: 2350, target: targetCalories },
    { day: 'Sun', calories: 2190, target: targetCalories },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F17" />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Nutrition Analytics</Text>
            <Text style={styles.headerSubtitle}>AI Metabolic Breakdown & Strategy</Text>
          </View>

          {/* Time Range Selector */}
          <View style={styles.rangeSelector}>
            <TouchableOpacity
              style={[styles.rangeBtn, activeRange === 'week' && styles.rangeBtnActive]}
              onPress={() => setActiveRange('week')}
            >
              <Text style={[styles.rangeText, activeRange === 'week' && styles.rangeTextActive]}>Week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.rangeBtn, activeRange === 'month' && styles.rangeBtnActive]}
              onPress={() => setActiveRange('month')}
            >
              <Text style={[styles.rangeText, activeRange === 'month' && styles.rangeTextActive]}>Month</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Score Banner */}
        <View style={styles.aiScoreCard}>
          <View style={styles.aiScoreHeader}>
            <View style={styles.aiBadge}>
              <SparklesIcon size={16} color={Colors.primary} />
              <Text style={styles.aiBadgeText}>AI Score</Text>
            </View>
            <Text style={styles.aiScoreValue}>94% Match</Text>
          </View>
          <Text style={styles.aiScoreDesc}>
            Your daily caloric intake & macro ratio align exceptionally well with your target goal to <Text style={{ color: Colors.primary, fontWeight: '700' }}>{userProfile?.goal || 'maintain'}</Text>.
          </Text>
        </View>

        {/* Weekly Calorie Compliance Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <FireIcon size={20} color="#FF6B6B" />
              <Text style={styles.chartTitle}>Daily Calorie Intake</Text>
            </View>
            <Text style={styles.chartAvgText}>Avg: 2,180 kcal</Text>
          </View>

          {/* Bar Chart Visual */}
          <View style={styles.barChartContainer}>
            {weeklyStats.map((item, index) => {
              const maxCal = 2600;
              const heightPercent = (item.calories / maxCal) * 100;
              const isToday = index === 3; // Thu mock today

              return (
                <View key={item.day} style={styles.barCol}>
                  <Text style={styles.barValText}>{(item.calories / 1000).toFixed(1)}k</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` },
                        isToday && styles.barFillToday,
                      ]}
                    />
                  </View>
                  <Text style={[styles.barDayText, isToday && styles.barDayTextToday]}>{item.day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Macro Distribution Analysis */}
        <Text style={styles.sectionTitle}>Macronutrient Distribution</Text>
        <View style={styles.macroAnalysisCard}>
          {/* Protein Row */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelBox}>
                <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.macroLabel}>Protein (30%)</Text>
              </View>
              <Text style={styles.macroAmount}>{targetProtein}g Target</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '85%', backgroundColor: '#EF4444' }]} />
            </View>
          </View>

          {/* Carbs Row */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelBox}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.macroLabel}>Carbohydrates (50%)</Text>
              </View>
              <Text style={styles.macroAmount}>{targetCarbs}g Target</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '72%', backgroundColor: '#F59E0B' }]} />
            </View>
          </View>

          {/* Fats Row */}
          <View style={styles.macroRow}>
            <View style={styles.macroRowHeader}>
              <View style={styles.macroLabelBox}>
                <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.macroLabel}>Dietary Fats (20%)</Text>
              </View>
              <Text style={styles.macroAmount}>{targetFats}g Target</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '65%', backgroundColor: '#3B82F6' }]} />
            </View>
          </View>
        </View>

        {/* Hydration Analytics */}
        <View style={styles.waterAnalysisCard}>
          <View style={styles.waterHeader}>
            <DropletIcon size={24} color="#38BDF8" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.waterTitle}>Hydration Tracking</Text>
              <Text style={styles.waterSubtitle}>Optimal daily hydration baseline</Text>
            </View>
            <Text style={styles.waterTargetText}>{waterLiters} Liters</Text>
          </View>

          <View style={styles.waterGlassesGrid}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <View
                key={`glass-${idx}`}
                style={[
                  styles.glassBox,
                  idx < 5 && styles.glassBoxActive,
                ]}
              >
                <DropletIcon size={16} color={idx < 5 ? '#38BDF8' : '#334155'} />
              </View>
            ))}
          </View>
          <Text style={styles.waterStatusText}>5 of 8 glasses logged today (62%)</Text>
        </View>

        {/* BMR & Health Metrics Card */}
        <View style={styles.healthMetricsCard}>
          <View style={styles.healthMetricItem}>
            <Target01Icon size={20} color={Colors.primary} />
            <Text style={styles.healthLabel}>BMI Score</Text>
            <Text style={styles.healthVal}>{bmi}</Text>
            <Text style={styles.healthSub}>{bmiCategory}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.healthMetricItem}>
            <FlashIcon size={20} color="#F59E0B" />
            <Text style={styles.healthLabel}>Resting BMR</Text>
            <Text style={styles.healthVal}>{bmr} kcal</Text>
            <Text style={styles.healthSub}>Basal Met. Rate</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 120, // space for floating tab bar
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#121824',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  rangeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9,
  },
  rangeBtnActive: {
    backgroundColor: Colors.primary,
  },
  rangeText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  rangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  aiScoreCard: {
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: Colors.primary30,
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
    backgroundColor: Colors.primary10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  aiBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  aiScoreValue: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '800',
  },
  aiScoreDesc: {
    color: '#CBD5E1',
    fontSize: 13,
    lineHeight: 19,
  },
  chartCard: {
    backgroundColor: '#121824',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  chartAvgText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  barChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barValText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 6,
  },
  barTrack: {
    width: 14,
    height: 95,
    backgroundColor: '#1C253B',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.primary30,
    borderRadius: 7,
  },
  barFillToday: {
    backgroundColor: Colors.primary,
  },
  barDayText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  barDayTextToday: {
    color: Colors.primary,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  macroAnalysisCard: {
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
    gap: 16,
  },
  macroRow: {
    gap: 8,
  },
  macroRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  macroLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  macroAmount: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  waterAnalysisCard: {
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  waterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  waterTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  waterSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  waterTargetText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '800',
  },
  waterGlassesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  glassBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#1C253B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  glassBoxActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  waterStatusText: {
    color: '#9CA3AF',
    fontSize: 12,
    textAlign: 'center',
  },
  healthMetricsCard: {
    flexDirection: 'row',
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  healthMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  healthLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  healthVal: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  healthSub: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 45,
    backgroundColor: '#1E293B',
    alignSelf: 'center',
  },
});
