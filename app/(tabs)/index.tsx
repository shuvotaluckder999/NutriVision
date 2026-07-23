import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useUser } from '@clerk/expo';
import { useSyncUser } from '../../hooks/useSyncUser';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { user } = useUser();
  
  // Trigger Firebase User Sync automatically on home screen mount
  const { isSynced, error } = useSyncUser();
  const [userProfile, setUserProfile] = useState<UserOnboardingData | null>(null);

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

  // Formatting date
  const getTodayDateString = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  const displayName = user?.firstName || 'Guest';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.dateText}>{getTodayDateString()}</Text>
          <Text style={styles.greetingText}>Hello, {displayName}!</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
      </View>

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

      {/* Main Calorie Ring Card */}
      <View style={styles.calorieCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Calories Tracker</Text>
          <Text style={styles.cardSubtitle}>{"Today's Target"}</Text>
        </View>

        <View style={styles.calorieRingContainer}>
          <View style={styles.calorieRingOuter}>
            <View style={styles.calorieRingInner}>
              <Text style={styles.calorieCount}>1,420</Text>
              <Text style={styles.calorieUnit}>/ {targetCalories.toLocaleString()} kcal</Text>
            </View>
          </View>
        </View>

        <View style={styles.calorieDetails}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Target Goal</Text>
            <Text style={styles.detailVal}>{targetCalories.toLocaleString()} kcal</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Water Goal</Text>
            <Text style={styles.detailVal}>{waterLiters} L</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>Protein Goal</Text>
            <Text style={[styles.detailVal, { color: Colors.primary }]}>{targetProtein}g</Text>
          </View>
        </View>
      </View>

      {/* Macros Section */}
      <Text style={styles.sectionTitle}>Daily Macros</Text>
      <View style={styles.macrosRow}>
        {/* Protein */}
        <View style={styles.macroCard}>
          <View style={[styles.macroIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons name="fitness" size={18} color="#EF4444" />
          </View>
          <Text style={styles.macroName}>Protein</Text>
          <Text style={styles.macroValue}>85g / {targetProtein}g</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: '#EF4444', width: `${Math.min(100, Math.round((85 / targetProtein) * 100))}%` }]} />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.macroCard}>
          <View style={[styles.macroIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="nutrition" size={18} color="#F59E0B" />
          </View>
          <Text style={styles.macroName}>Carbs</Text>
          <Text style={styles.macroValue}>180g / {targetCarbs}g</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: '#F59E0B', width: `${Math.min(100, Math.round((180 / targetCarbs) * 100))}%` }]} />
          </View>
        </View>

        {/* Fats */}
        <View style={styles.macroCard}>
          <View style={[styles.macroIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
            <Ionicons name="water" size={18} color="#3B82F6" />
          </View>
          <Text style={styles.macroName}>Fats</Text>
          <Text style={styles.macroValue}>42g / {targetFats}g</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { backgroundColor: '#3B82F6', width: `${Math.min(100, Math.round((42 / targetFats) * 100))}%` }]} />
          </View>
        </View>
      </View>

      {/* AI Scanner View (non-interactive until scanner flow is implemented) */}
      <View style={styles.scanButton}>
        <View style={styles.scanButtonContent}>
          <View style={styles.scanIconBg}>
            <Ionicons name="camera" size={24} color="#0C0F17" />
          </View>
          <View style={styles.scanTexts}>
            <Text style={styles.scanTitle}>Scan food with AI</Text>
            <Text style={styles.scanSubtitle}>Get instant calories & nutrition breakdown (Coming Soon)</Text>
          </View>
        </View>
      </View>
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
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  dateText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  profileBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E293B',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 24,
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
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 28,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#9CA3AF',
    fontSize: 13,
    marginTop: 2,
  },
  calorieRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  calorieRingOuter: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 12,
    borderColor: '#1E293B',
    // We create a partial highlight using borders (or simulate ring path)
    borderLeftColor: Colors.primary,
    borderTopColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  calorieRingInner: {
    alignItems: 'center',
  },
  calorieCount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  calorieUnit: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  calorieDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 16,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  detailVal: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  detailDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  macrosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  macroCard: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 18,
    padding: 14,
    width: (width - 40 - 20) / 3, // dynamic fit in grid
  },
  macroIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  macroName: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  macroValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#1E293B',
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  scanButton: {
    backgroundColor: '#121824',
    borderWidth: 1.5,
    borderColor: Colors.primary20,
    borderRadius: 20,
    padding: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  scanTexts: {
    flex: 1,
  },
  scanTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  scanSubtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
  },
});
