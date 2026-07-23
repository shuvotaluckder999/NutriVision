import { useAuth, useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  Activity01Icon,
  BodyWeightIcon,
  Calendar01Icon,
  RulerIcon,
  Target01Icon,
  UserIcon,
} from 'hugeicons-react-native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../../constants/Colors';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { LocalStorage } from '../../utils/storage';

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const { checkingOnboarding, onboardingData } = useOnboardingStatus();

  const handleSignOut = async () => {
    try {
      await LocalStorage.removeItem('user_signed_in');
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const handleEditProfile = () => {
    router.push({ pathname: '/onboarding', params: { mode: 'edit' } } as any);
  };

  if (checkingOnboarding) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const emailAddress = user?.primaryEmailAddress?.emailAddress || 'Not set';
  const fullName = user?.fullName || 'NutriVision User';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  const formatGoal = (g?: string) => {
    if (g === 'gain') return 'Gain Weight';
    if (g === 'lose') return 'Lose Weight';
    if (g === 'maintain') return 'Maintain';
    return g || 'Not set';
  };

  const formatGender = (g?: string) => {
    if (g === 'male') return 'Male';
    if (g === 'female') return 'Female';
    if (g === 'other') return 'Other / Non-binary';
    return g || 'Not set';
  };

  const birthdateStr = onboardingData?.birthdate
    ? `${onboardingData.birthdate.day}/${onboardingData.birthdate.month}/${onboardingData.birthdate.year}`
    : 'Not set';

  const heightStr = onboardingData?.height?.feet && onboardingData?.height?.inches
    ? `${onboardingData.height.feet} ft ${onboardingData.height.inches} in`
    : 'Not set';

  const weightStr = onboardingData?.weight?.kg
    ? `${onboardingData.weight.kg} kg`
    : 'Not set';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Profile</Text>

      {/* User Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={32} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.nameText}>{fullName}</Text>
          <Text style={styles.emailText}>{emailAddress}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>Member since {memberSince}</Text>
          </View>
        </View>
      </View>

      {/* Fitness Profile Settings */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Fitness Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleEditProfile}>
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.goalCard}>
        {/* Goal */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <Target01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Fitness Goal</Text>
              <Text style={styles.goalValue}>{formatGoal(onboardingData?.goal)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Workout Frequency */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <Activity01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Workout Frequency</Text>
              <Text style={styles.goalValue}>{onboardingData?.workoutDays || 'Not set'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Gender & Birthdate */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <UserIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Gender</Text>
              <Text style={styles.goalValue}>{formatGender(onboardingData?.gender)}</Text>
            </View>
          </View>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <Calendar01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Birthdate</Text>
              <Text style={styles.goalValue}>{birthdateStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Height & Weight */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <RulerIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Height</Text>
              <Text style={styles.goalValue}>{heightStr}</Text>
            </View>
          </View>
          <View style={styles.goalItem}>
            <View style={styles.iconBg}>
              <BodyWeightIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalLabel}>Weight</Text>
              <Text style={styles.goalValue}>{weightStr}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Settings Menu */}
      <Text style={styles.sectionTitle}>Account Settings</Text>
      <View style={styles.menuContainer}>
        {/* Menu Item 1 */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Menu Item 2 */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="notifications" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.menuText}>Push Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Menu Item 3 */}
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="help-circle" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.signOutIcon} />
        <Text style={styles.signOutText}>Log Out</Text>
      </TouchableOpacity>
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
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  profileCard: {
    backgroundColor: '#121824',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
    marginBottom: 16,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  emailText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  memberBadge: {
    backgroundColor: Colors.primary10,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.primary20,
  },
  memberText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  goalCard: {
    backgroundColor: '#121824',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 24,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    marginLeft: 12,
  },
  goalLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  goalValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  editBtn: {
    backgroundColor: '#1C253B',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  menuContainer: {
    backgroundColor: '#121824',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#1E293B',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutIcon: {
    marginRight: 8,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});
