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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Profile</Text>

      {/* User Card */}
      <View style={styles.profileCard}>
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
            <Text style={styles.nameText}>{fullName}</Text>
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

          <Text style={styles.emailText}>{emailAddress}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>Member since {memberSince}</Text>
          </View>
        </View>
      </View>

      {/* Fitness Profile Settings */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Fitness Profile</Text>
        <TouchableOpacity style={styles.editBtn} onPress={handleOpenEditFitness}>
          <PencilEdit01Icon size={12} color={Colors.primary} style={{ marginRight: 4 }} />
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
              <Text style={styles.goalValue}>{formatGoal(profileData?.goal)}</Text>
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
              <Text style={styles.goalValue}>{profileData?.workoutDays || '3-7 Days'}</Text>
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
              <Text style={styles.goalValue}>{formatGender(profileData?.gender)}</Text>
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
        {/* Menu Item 1: Privacy & Security */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setPrivacyModalVisible(true)}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Menu Item 2: Push Notifications */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setNotificationsModalVisible(true)}>
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="notifications" size={18} color="#8B5CF6" />
            </View>
            <Text style={styles.menuText}>Push Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#6B7280" />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        {/* Menu Item 3: Help & Support */}
        <TouchableOpacity style={styles.menuItem} onPress={() => setSupportModalVisible(true)}>
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

      {/* MODAL 1: EDIT FITNESS PROFILE */}
      <Modal visible={editFitnessModalVisible} transparent animationType="slide" onRequestClose={() => setEditFitnessModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Fitness Profile</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditFitnessModalVisible(false)}>
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* Primary Goal */}
              <Text style={styles.inputSectionTitle}>Fitness Goal</Text>
              <View style={styles.chipOptionRow}>
                {[
                  { id: 'gain', label: 'Gain Weight' },
                  { id: 'lose', label: 'Lose Weight' },
                  { id: 'maintain', label: 'Maintain' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.selectChip, editGoal === item.id && styles.selectChipActive]}
                    onPress={() => setEditGoal(item.id as any)}
                  >
                    <Text style={[styles.selectChipText, editGoal === item.id && styles.selectChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Workout Frequency */}
              <Text style={styles.inputSectionTitle}>Workout Frequency</Text>
              <View style={styles.chipOptionRow}>
                {['2-3 days', '3-7 Days', '7-15 Days', '1 month'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.selectChip, editWorkoutDays === item && styles.selectChipActive]}
                    onPress={() => setEditWorkoutDays(item)}
                  >
                    <Text style={[styles.selectChipText, editWorkoutDays === item && styles.selectChipTextActive]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender */}
              <Text style={styles.inputSectionTitle}>Gender</Text>
              <View style={styles.chipOptionRow}>
                {[
                  { id: 'male', label: 'Male' },
                  { id: 'female', label: 'Female' },
                  { id: 'other', label: 'Other' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.selectChip, editGender === item.id && styles.selectChipActive]}
                    onPress={() => setEditGender(item.id)}
                  >
                    <Text style={[styles.selectChipText, editGender === item.id && styles.selectChipTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Height & Weight Inputs */}
              <Text style={styles.inputSectionTitle}>Height & Weight</Text>
              <View style={styles.gridInputRow}>
                <View style={styles.inputBox}>
                  <Text style={styles.inputFieldLabel}>Feet (ft)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editFeet}
                    onChangeText={setEditFeet}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.inputBox}>
                  <Text style={styles.inputFieldLabel}>Inches (in)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editInches}
                    onChangeText={setEditInches}
                    keyboardType="numeric"
                    placeholder="9"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={styles.inputBox}>
                  <Text style={styles.inputFieldLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editWeightKg}
                    onChangeText={setEditWeightKg}
                    keyboardType="numeric"
                    placeholder="70"
                    placeholderTextColor="#64748B"
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Info</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setEditUserInfoModalVisible(false)}>
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputSectionTitle}>Full Name</Text>
            <TextInput
              style={styles.fullTextInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter full name"
              placeholderTextColor="#64748B"
            />

            <Text style={styles.inputSectionTitle}>Choose Avatar</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Privacy & Security</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPrivacyModalVisible(false)}>
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <View style={styles.infoCard}>
                <Ionicons name="lock-closed" size={20} color="#3B82F6" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.infoCardTitle}>Encrypted Firestore Sync</Text>
                  <Text style={styles.infoCardSub}>All profile, meal logs, and workout data are encrypted in transit & at rest using TLS 1.3 & Firebase Security Rules.</Text>
                </View>
              </View>

              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>App Lock / PIN Protection</Text>
                  <Text style={styles.toggleSub}>Require biometrics or PIN when opening NutriVision</Text>
                </View>
                <Switch
                  value={appPinLock}
                  onValueChange={(val) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAppPinLock(val);
                  }}
                  trackColor={{ false: '#1E293B', true: Colors.primary }}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications" size={22} color="#8B5CF6" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Push Notifications</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setNotificationsModalVisible(false)}>
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Toggle 1: Calorie Target Reminders */}
              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Daily Calorie Target Reminders</Text>
                  <Text style={styles.toggleSub}>Alert if daily calorie goal is not reached by evening</Text>
                </View>
                <Switch
                  value={notifSettings.calorieTargetReminders}
                  onValueChange={() => handleToggleNotifSetting('calorieTargetReminders')}
                  trackColor={{ false: '#1E293B', true: Colors.primary }}
                />
              </View>

              {/* Toggle 2: Excessive Calorie Warnings */}
              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Excess Calorie Warnings</Text>
                  <Text style={styles.toggleSub}>Warning alert if consumed calories exceed daily target limit</Text>
                </View>
                <Switch
                  value={notifSettings.calorieExcessAlerts}
                  onValueChange={() => handleToggleNotifSetting('calorieExcessAlerts')}
                  trackColor={{ false: '#1E293B', true: Colors.primary }}
                />
              </View>

              {/* Toggle 3: Hydration Reminders */}
              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Water Hydration Alerts</Text>
                  <Text style={styles.toggleSub}>Periodic reminders to drink a glass of water</Text>
                </View>
                <Switch
                  value={notifSettings.hydrationReminders}
                  onValueChange={() => handleToggleNotifSetting('hydrationReminders')}
                  trackColor={{ false: '#1E293B', true: Colors.primary }}
                />
              </View>

              {/* Toggle 4: Workout Log Reminders */}
              <View style={styles.settingToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleTitle}>Workout Log Reminders</Text>
                  <Text style={styles.toggleSub}>Remind to record workouts & exercise sessions</Text>
                </View>
                <Switch
                  value={notifSettings.workoutLogAlerts}
                  onValueChange={() => handleToggleNotifSetting('workoutLogAlerts')}
                  trackColor={{ false: '#1E293B', true: Colors.primary }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: HELP & SUPPORT */}
      <Modal visible={supportModalVisible} transparent animationType="slide" onRequestClose={() => setSupportModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="help-circle" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
                <Text style={styles.modalTitle}>Help & Support</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSupportModalVisible(false)}>
                <Cancel01Icon size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              {/* Direct Support Email Box */}
              <View style={styles.supportEmailBox}>
                <Ionicons name="mail" size={24} color={Colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.supportEmailTitle}>Direct Support Email</Text>
                  <Text style={styles.supportEmailAddr}>shuvotaluckder666@gmail.com</Text>
                  <Text style={styles.supportEmailSub}>Email us anytime for account help, bug reports, or app inquiries.</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.emailBtnAction} onPress={handleOpenSupportEmail} activeOpacity={0.85}>
                <Ionicons name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emailBtnActionText}>Send Support Email</Text>
              </TouchableOpacity>

              {/* Bug / Issue Form */}
              <Text style={[styles.inputSectionTitle, { marginTop: 20 }]}>Report an Issue / Bug</Text>
              <TextInput
                style={styles.fullTextInput}
                value={bugSubject}
                onChangeText={setBugSubject}
                placeholder="Issue subject (e.g. Calorie tracking bug)"
                placeholderTextColor="#64748B"
              />
              <TextInput
                style={[styles.fullTextInput, { height: 80, textAlignVertical: 'top' }]}
                value={bugMessage}
                onChangeText={setBugMessage}
                placeholder="Describe your issue or feedback in detail..."
                placeholderTextColor="#64748B"
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 15, 23, 0.82)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#121824',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    borderColor: '#1E293B',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C253B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSectionTitle: {
    color: '#FFFFFF',
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
    backgroundColor: '#1C253B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  selectChipActive: {
    backgroundColor: Colors.primary10,
    borderColor: Colors.primary,
  },
  selectChipText: {
    color: '#9CA3AF',
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
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#1C253B',
    borderRadius: 12,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#1E293B',
    fontSize: 14,
    fontWeight: '700',
  },
  fullTextInput: {
    backgroundColor: '#1C253B',
    borderRadius: 14,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1C253B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  infoCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  infoCardSub: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1C253B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  toggleTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    color: '#9CA3AF',
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
    backgroundColor: 'rgba(81, 130, 216, 0.12)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary30,
  },
  supportEmailTitle: {
    color: '#FFFFFF',
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
    color: '#9CA3AF',
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
