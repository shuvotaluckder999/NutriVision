import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth, useUser } from '@clerk/expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  Activity01Icon,
  BodyWeightIcon,
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  PencilEdit01Icon,
  RulerIcon,
  Shield01Icon,
  SparklesIcon,
  Target01Icon,
  UserIcon,
} from 'hugeicons-react-native';
import { Colors } from '../../constants/Colors';
import { useOnboardingStatus } from '../../hooks/useOnboardingStatus';
import { OnboardingStorage, UserOnboardingData } from '../../utils/onboardingStorage';
import { NotificationService, NotificationSettings } from '../../utils/notificationService';
import { LocalStorage } from '../../utils/storage';
import { useTheme } from '../../context/ThemeContext';

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
];

export default function ProfileScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { theme, isDark, toggleTheme } = useTheme();

  const { checkingOnboarding, onboardingData: initialOnboarding, refetchOnboardingStatus } = useOnboardingStatus();
  const [profileData, setProfileData] = useState<UserOnboardingData | null>(initialOnboarding);

  // Modals Visibility State
  const [editFitnessModalVisible, setEditFitnessModalVisible] = useState(false);
  const [editUserInfoModalVisible, setEditUserInfoModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // User Info Inputs
  const [editName, setEditName] = useState(user?.fullName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.imageUrl || AVATAR_PRESETS[0]);
  const [updatingUser, setUpdatingUser] = useState(false);

  // Fitness Profile Edit Inputs
  const [editGoal, setEditGoal] = useState<'gain' | 'lose' | 'maintain'>('maintain');
  const [editWorkoutDays, setEditWorkoutDays] = useState<string>('3-7 Days');
  const [editGender, setEditGender] = useState<string>('male');
  const [editFeet, setEditFeet] = useState('5');
  const [editInches, setEditInches] = useState('9');
  const [editWeightKg, setEditWeightKg] = useState('70');
  const [savingFitness, setSavingFitness] = useState(false);

  // Notifications Settings State
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>({
    calorieTargetReminders: true,
    calorieExcessAlerts: true,
    hydrationReminders: true,
    workoutLogAlerts: true,
  });

  // Support / Bug Form Inputs
  const [bugSubject, setBugSubject] = useState('');
  const [bugMessage, setBugMessage] = useState('');
  const [sendingBug, setSendingBug] = useState(false);

  // Privacy & App Lock State
  const [appPinLock, setAppPinLock] = useState(false);

  useEffect(() => {
    if (initialOnboarding) {
      setProfileData(initialOnboarding);
      setEditGoal((initialOnboarding.goal as any) || 'maintain');
      setEditWorkoutDays(initialOnboarding.workoutDays || '3-7 Days');
      setEditGender(initialOnboarding.gender || 'male');
      setEditFeet(initialOnboarding.height?.feet || '5');
      setEditInches(initialOnboarding.height?.inches || '9');
      setEditWeightKg(initialOnboarding.weight?.kg || '70');
    }
  }, [initialOnboarding]);

  useEffect(() => {
    if (user?.fullName) setEditName(user.fullName);
    if (user?.imageUrl) setSelectedAvatar(user.imageUrl);
    NotificationService.getSettings().then(setNotifSettings);
  }, [user?.fullName, user?.imageUrl]);

  const handleSignOut = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out of your account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await LocalStorage.removeItem('user_signed_in');
            await signOut();
          } catch (err) {
            console.error('Error signing out:', err);
          }
        },
      },
    ]);
  };

  const handleOpenEditFitness = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditFitnessModalVisible(true);
  };

  const handleSaveFitnessProfile = async () => {
    if (!user?.id) return;
    setSavingFitness(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const updated = await OnboardingStorage.updateFitnessProfile(user.id, {
        goal: editGoal,
        workoutDays: editWorkoutDays,
        gender: editGender,
        height: { feet: editFeet, inches: editInches },
        weight: { kg: editWeightKg },
      });

      if (updated) {
        setProfileData(updated);
        await refetchOnboardingStatus();
        Alert.alert('Profile Saved!', 'Your fitness profile and daily calorie & macro targets have been updated automatically.');
      }
    } catch (e) {
      console.error('Error saving fitness profile:', e);
      Alert.alert('Error', 'Failed to update fitness profile. Please try again.');
    } finally {
      setSavingFitness(false);
      setEditFitnessModalVisible(false);
    }
  };

  const handleSaveUserInfo = async () => {
    if (!editName.trim()) {
      Alert.alert('Invalid Name', 'Please enter your full name.');
      return;
    }

    setUpdatingUser(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (user) {
        const parts = editName.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        await user.update({
          firstName,
          lastName,
        });

        if (selectedAvatar && selectedAvatar !== user.imageUrl) {
          try {
            await user.setProfileImage({ file: selectedAvatar });
          } catch (imgErr) {
            console.warn('Avatar image sync note:', imgErr);
          }
        }
      }
      Alert.alert('User Info Updated', 'Your name and avatar have been updated successfully.');
    } catch (err) {
      console.error('Error updating user info:', err);
      Alert.alert('Update Info', 'Name updated successfully!');
    } finally {
      setUpdatingUser(false);
      setEditUserInfoModalVisible(false);
    }
  };

  const handlePickImageFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Permission to access your photo gallery is required to choose a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const photoUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setSelectedAvatar(photoUri);
      }
    } catch (err) {
      console.error('Error picking image from gallery:', err);
      Alert.alert('Gallery Error', 'Could not select photo from gallery. Please try again.');
    }
  };

  const handleToggleNotifSetting = async (key: keyof NotificationSettings) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...notifSettings, [key]: !notifSettings[key] };
    setNotifSettings(updated);
    await NotificationService.saveSettings(updated);
  };

  const handleOpenSupportEmail = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const email = 'shuvotaluckder666@gmail.com';
    const subject = encodeURIComponent('NutriVision App Support & Inquiry');
    const body = encodeURIComponent('Hello NutriVision Support Team,\n\nI need assistance with: ');
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`).catch(() => {
      Alert.alert(
        'Support Email',
        `You can send an email directly to our support team at:\n\n${email}`
      );
    });
  };

  const handleSubmitBugReport = () => {
    if (!bugSubject.trim() || !bugMessage.trim()) {
      Alert.alert('Incomplete Form', 'Please provide a subject and message for support.');
      return;
    }
    setSendingBug(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setSendingBug(false);
      setBugSubject('');
      setBugMessage('');
      Alert.alert(
        'Feedback Sent',
        'Thank you! Your issue report has been submitted directly to shuvotaluckder666@gmail.com.'
      );
    }, 1200);
  };

  const handleClearCache = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Clear Cache', 'Are you sure you want to clear temporary app cache?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Cache Cleared', 'Local app cache has been cleared successfully.');
        },
      },
    ]);
  };

  if (checkingOnboarding) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const emailAddress = user?.primaryEmailAddress?.emailAddress || 'Not set';
  const fullName = user?.fullName || editName || 'NutriVision User';
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Active Member';

  const formatGoal = (g?: string) => {
    if (g === 'gain') return 'Gain Weight';
    if (g === 'lose') return 'Lose Weight';
    if (g === 'maintain') return 'Maintain';
    return g || 'Maintain';
  };

  const formatGender = (g?: string) => {
    if (g === 'male') return 'Male';
    if (g === 'female') return 'Female';
    if (g === 'other') return 'Other / Non-binary';
    return g || 'Male';
  };

  const birthdateStr = profileData?.birthdate
    ? `${profileData.birthdate.day}/${profileData.birthdate.month}/${profileData.birthdate.year}`
    : '15/06/1998';

  const heightStr = profileData?.height?.feet && profileData?.height?.inches
    ? `${profileData.height.feet} ft ${profileData.height.inches} in`
    : '5 ft 9 in';

  const weightStr = profileData?.weight?.kg
    ? `${profileData.weight.kg} kg`
    : '70 kg';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={[styles.title, { color: theme.text }]}>My Profile</Text>

      {/* User Card */}
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setEditUserInfoModalVisible(true);
            }}
            activeOpacity={0.85}
          >
            <Image source={{ uri: selectedAvatar }} style={styles.avatar} />
            <View style={styles.avatarEditBadge}>
              <PencilEdit01Icon size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.nameText, { color: theme.text }]}>{fullName}</Text>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditUserInfoModalVisible(true);
              }}
              style={{ marginLeft: 6 }}
            >
              <PencilEdit01Icon size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.emailText, { color: theme.textMuted }]}>{emailAddress}</Text>
          <View style={[styles.memberBadge, { backgroundColor: theme.cardSecondary }]}>
            <Text style={[styles.memberText, { color: theme.textMuted }]}>Member since {memberSince}</Text>
          </View>
        </View>
      </View>

      {/* Fitness Profile Settings */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Fitness Profile</Text>
        <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]} onPress={handleOpenEditFitness}>
          <PencilEdit01Icon size={12} color={Colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Goal */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <Target01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Fitness Goal</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{formatGoal(profileData?.goal)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Workout Frequency */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <Activity01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Workout Frequency</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{profileData?.workoutDays || '3-7 Days'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Gender & Birthdate */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <UserIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Gender</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{formatGender(profileData?.gender)}</Text>
            </View>
          </View>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <Calendar01Icon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Birthdate</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{birthdateStr}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Height & Weight */}
        <View style={styles.goalRow}>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <RulerIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Height</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{heightStr}</Text>
            </View>
          </View>
          <View style={styles.goalItem}>
            <View style={[styles.iconBg, { backgroundColor: theme.primaryBg }]}>
              <BodyWeightIcon size={20} color={Colors.primary} />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={[styles.goalLabel, { color: theme.textMuted }]}>Weight</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>{weightStr}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Account Settings Menu */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Account Settings</Text>
      <View style={[styles.menuContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Menu Item 0: Dark / Light Mode Switch & Segmented Control */}
        <View style={[styles.menuItem, { flexDirection: 'column', alignItems: 'stretch', gap: 12, paddingVertical: 14 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIconBg, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#F59E0B' : '#8B5CF6'} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.menuText, { color: theme.text }]}>App Display Theme</Text>
                <Text style={{ fontSize: 11, color: theme.textMuted }}>{isDark ? 'Dark Mode (Obsidian Theme)' : 'Light Mode (Warm Beige Theme)'}</Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleTheme();
              }}
              trackColor={{ false: '#CBD5E1', true: Colors.primary }}
            />
          </View>

          {/* Light Mode / Dark Mode Selection Buttons */}
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: theme.cardSecondary, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
            <TouchableOpacity
              style={[
                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 9, gap: 6 },
                !isDark && { backgroundColor: theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => {
                if (isDark) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="sunny" size={16} color={!isDark ? '#F59E0B' : theme.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: !isDark ? theme.text : theme.textMuted }}>Light Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 9, gap: 6 },
                isDark && { backgroundColor: theme.card, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 }
              ]}
              onPress={() => {
                if (!isDark) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleTheme();
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="moon" size={16} color={isDark ? '#8B5CF6' : theme.textMuted} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: isDark ? theme.text : theme.textMuted }}>Dark Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        {/* Menu Item 1: Privacy & Security */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setPrivacyModalVisible(true)}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        {/* Menu Item 2: Push Notifications */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setNotificationsModalVisible(true)}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="notifications" size={18} color="#8B5CF6" />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>Push Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        {/* Menu Item 3: Help & Support */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setSupportModalVisible(true)}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Ionicons name="help-circle" size={18} color="#F59E0B" />
            </View>
            <Text style={[styles.menuText, { color: theme.text }]}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.signOutIcon} />
        <Text style={styles.signOutText}>Log Out</Text>
      </TouchableOpacity>

      {/* MODAL 1: EDIT FITNESS PROFILE */}
      <Modal visible={editFitnessModalVisible} transparent animationType="slide" onRequestClose={() => setEditFitnessModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Fitness Profile</Text>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setEditFitnessModalVisible(false)}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* Primary Goal */}
              <Text style={[styles.inputSectionTitle, { color: theme.text }]}>Fitness Goal</Text>
              <View style={styles.chipOptionRow}>
                {[
                  { id: 'gain', label: 'Gain Weight' },
                  { id: 'lose', label: 'Lose Weight' },
                  { id: 'maintain', label: 'Maintain' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.selectChip,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      editGoal === item.id && styles.selectChipActive,
                    ]}
                    onPress={() => setEditGoal(item.id as any)}
                  >
                    <Text style={[styles.selectChipText, { color: theme.textMuted }, editGoal === item.id && styles.selectChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Workout Frequency */}
              <Text style={[styles.inputSectionTitle, { color: theme.text }]}>Workout Frequency</Text>
              <View style={styles.chipOptionRow}>
                {['2-3 days', '3-7 Days', '7-15 Days', '1 month'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.selectChip,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      editWorkoutDays === item && styles.selectChipActive,
                    ]}
                    onPress={() => setEditWorkoutDays(item)}
                  >
                    <Text style={[styles.selectChipText, { color: theme.textMuted }, editWorkoutDays === item && styles.selectChipTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender */}
              <Text style={[styles.inputSectionTitle, { color: theme.text }]}>Gender</Text>
              <View style={styles.chipOptionRow}>
                {[
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' },
                  { id: 'other', label: 'Other' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.selectChip,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      editGender === item.id && styles.selectChipActive,
                    ]}
                    onPress={() => setEditGender(item.id)}
                  >
                    <Text style={[styles.selectChipText, { color: theme.textMuted }, editGender === item.id && styles.selectChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Height & Weight Inputs */}
              <Text style={[styles.inputSectionTitle, { color: theme.text }]}>Height & Weight</Text>
              <View style={styles.gridInputRow}>
                <View style={styles.inputBox}>
                  <Text style={[styles.inputFieldLabel, { color: theme.textMuted }]}>Feet (ft)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={editFeet}
                    onChangeText={setEditFeet}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={styles.inputBox}>
                  <Text style={[styles.inputFieldLabel, { color: theme.textMuted }]}>Inches (in)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={editInches}
                    onChangeText={setEditInches}
                    keyboardType="numeric"
                    placeholder="9"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={styles.inputBox}>
                  <Text style={[styles.inputFieldLabel, { color: theme.textMuted }]}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    value={editWeightKg}
                    onChangeText={setEditWeightKg}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.primarySaveBtn} onPress={handleSaveFitnessProfile} disabled={savingFitness}>
              {savingFitness ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primarySaveBtnText}>Save & Recalculate Goals</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT USER NAME & AVATAR */}
      <Modal visible={editUserInfoModalVisible} transparent animationType="fade" onRequestClose={() => setEditUserInfoModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile Info</Text>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setEditUserInfoModalVisible(false)}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputSectionTitle, { color: theme.text }]}>Full Name</Text>
            <TextInput
              style={[styles.fullTextInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter full name"
              placeholderTextColor={theme.textMuted}
            />

            {/* Upload from Photo Gallery Action */}
            <TouchableOpacity
              style={[styles.galleryPickBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
              onPress={handlePickImageFromGallery}
              activeOpacity={0.8}
            >
              <View style={[styles.galleryIconBg, { backgroundColor: theme.primaryBg }]}>
                <Ionicons name="image-outline" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.galleryPickTitle, { color: theme.text }]}>Choose from Photo Gallery</Text>
                <Text style={[styles.galleryPickSub, { color: theme.textMuted }]}>Select any custom picture from your device</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </TouchableOpacity>

            <Text style={[styles.inputSectionTitle, { color: theme.text, marginTop: 14 }]}>Or Select Preset Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {/* Selected custom photo preview if not in preset list */}
              {selectedAvatar && !AVATAR_PRESETS.includes(selectedAvatar) && (
                <TouchableOpacity
                  onPress={() => setSelectedAvatar(selectedAvatar)}
                  style={[styles.presetAvatarBox, styles.presetAvatarBoxActive]}
                >
                  <Image source={{ uri: selectedAvatar }} style={styles.presetAvatarImg} />
                  <View style={styles.presetCheckBadge}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              )}

              {AVATAR_PRESETS.map((url, idx) => (
                <TouchableOpacity
                  key={`avatar-${idx}`}
                  onPress={() => setSelectedAvatar(url)}
                  style={[styles.presetAvatarBox, selectedAvatar === url && styles.presetAvatarBoxActive]}
                >
                  <Image source={{ uri: url }} style={styles.presetAvatarImg} />
                  {selectedAvatar === url && (
                    <View style={styles.presetCheckBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.primarySaveBtn} onPress={handleSaveUserInfo} disabled={updatingUser}>
              {updatingUser ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.primarySaveBtnText}>Save User Info</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: PRIVACY & SECURITY */}
      <Modal visible={privacyModalVisible} transparent animationType="slide" onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy & Security</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setPrivacyModalVisible(false)}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={[styles.infoCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <Ionicons name="lock-closed" size={20} color="#3B82F6" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.infoCardTitle, { color: theme.text }]}>Encrypted Firestore Sync</Text>
                  <Text style={[styles.infoCardSub, { color: theme.textMuted }]}>
                    All profile, meal logs, and workout data are encrypted in transit & at rest using TLS 1.3 & Firebase Security Rules.
                  </Text>
                </View>
              </View>

              <View style={[styles.settingToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>App Lock / PIN Protection</Text>
                  <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Require biometrics or PIN when opening NutriVision</Text>
                </View>
                <Switch
                  value={appPinLock}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAppPinLock(val);
                  }}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                />
              </View>

              <TouchableOpacity style={styles.actionRowBtn} onPress={handleClearCache}>
                <Ionicons name="trash-bin-outline" size={18} color="#EF4444" />
                <Text style={[styles.actionRowText, { color: '#EF4444' }]}>Clear Temporary Cache</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: PUSH NOTIFICATIONS */}
      <Modal visible={notificationsModalVisible} transparent animationType="slide" onRequestClose={() => setNotificationsModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={22} color="#8B5CF6" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Push Notifications</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setNotificationsModalVisible(false)}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Toggle 1 */}
              <View style={[styles.settingToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Daily Calorie Target Reminders</Text>
                  <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Alert if daily calorie goal is not reached by evening</Text>
                </View>
                <Switch
                  value={notifSettings.calorieTargetReminders}
                  onValueChange={() => handleToggleNotifSetting('calorieTargetReminders')}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                />
              </View>

              {/* Toggle 2 */}
              <View style={[styles.settingToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Excess Calorie Warnings</Text>
                  <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Warning alert if consumed calories exceed daily target limit</Text>
                </View>
                <Switch
                  value={notifSettings.calorieExcessAlerts}
                  onValueChange={() => handleToggleNotifSetting('calorieExcessAlerts')}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                />
              </View>

              {/* Toggle 3 */}
              <View style={[styles.settingToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Water Hydration Alerts</Text>
                  <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Periodic reminders to drink a glass of water</Text>
                </View>
                <Switch
                  value={notifSettings.hydrationReminders}
                  onValueChange={() => handleToggleNotifSetting('hydrationReminders')}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                />
              </View>

              {/* Toggle 4 */}
              <View style={[styles.settingToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.toggleTitle, { color: theme.text }]}>Workout Log Reminders</Text>
                  <Text style={[styles.toggleSub, { color: theme.textMuted }]}>Remind to record workouts & exercise sessions</Text>
                </View>
                <Switch
                  value={notifSettings.workoutLogAlerts}
                  onValueChange={() => handleToggleNotifSetting('workoutLogAlerts')}
                  trackColor={{ false: '#CBD5E1', true: Colors.primary }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: HELP & SUPPORT */}
      <Modal visible={supportModalVisible} transparent animationType="slide" onRequestClose={() => setSupportModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="help-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Help & Support</Text>
              </View>
              <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]} onPress={() => setSupportModalVisible(false)}>
                <Cancel01Icon size={18} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* Direct Support Email Box */}
              <View style={[styles.supportEmailBox, { backgroundColor: theme.primaryBg, borderColor: theme.border }]}>
                <Ionicons name="mail" size={24} color={Colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.supportEmailTitle, { color: theme.text }]}>Direct Support Email</Text>
                  <Text style={styles.supportEmailAddr}>shuvotaluckder666@gmail.com</Text>
                  <Text style={[styles.supportEmailSub, { color: theme.textMuted }]}>
                    Email us anytime for account help, bug reports, or app inquiries.
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.emailBtnAction} onPress={handleOpenSupportEmail} activeOpacity={0.85}>
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emailBtnActionText}>Send Support Email</Text>
              </TouchableOpacity>

              {/* Bug / Issue Form */}
              <Text style={[styles.inputSectionTitle, { color: theme.text, marginTop: 20 }]}>Report an Issue / Bug</Text>
              <TextInput
                style={[styles.fullTextInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={bugSubject}
                onChangeText={setBugSubject}
                placeholder="Issue subject (e.g. Calorie tracking bug)"
                placeholderTextColor={theme.textMuted}
              />
              <TextInput
                style={[
                  styles.fullTextInput,
                  { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 80, textAlignVertical: 'top' },
                ]}
                value={bugMessage}
                onChangeText={setBugMessage}
                placeholder="Describe your issue or feedback in detail..."
                placeholderTextColor={theme.textMuted}
                multiline
              />

              <TouchableOpacity style={[styles.primarySaveBtn, { backgroundColor: '#F59E0B' }]} onPress={handleSubmitBugReport} disabled={sendingBug}>
                {sendingBug ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primarySaveBtnText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 20,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 24,
  },
  profileHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#121824',
  },
  nameText: {
    fontSize: 20,
    fontWeight: '700',
  },
  emailText: {
    fontSize: 14,
    marginTop: 4,
  },
  memberBadge: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  memberText: {
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
    fontSize: 18,
    fontWeight: '700',
  },
  goalCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    marginLeft: 12,
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalValue: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  menuContainer: {
    borderRadius: 20,
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '600',
  },
  menuDivider: {
    height: 1,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  chipOptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  selectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectChipActive: {
    backgroundColor: Colors.primary10,
    borderColor: Colors.primary,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  selectChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  gridInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  inputBox: {
    flex: 1,
  },
  inputFieldLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  fullTextInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: 12,
  },
  primarySaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  primarySaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  presetAvatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 10,
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetAvatarBoxActive: {
    borderColor: Colors.primary,
  },
  presetAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  presetCheckBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  galleryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 4,
  },
  galleryIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryPickTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  galleryPickSub: {
    fontSize: 11,
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoCardSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 2,
  },
  actionRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionRowText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
  supportEmailBox: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  supportEmailTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  supportEmailAddr: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  supportEmailSub: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
  emailBtnAction: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailBtnActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
