import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  Dumbbell01Icon,
  PencilEdit01Icon,
  SparklesIcon,
} from 'hugeicons-react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { ActivityStorage, UserActivity } from '../utils/activityStorage';
import { OnboardingStorage } from '../utils/onboardingStorage';
import { calculateAIActivityBurn } from '../services/geminiService';

interface LogWorkoutModalProps {
  visible: boolean;
  onClose: () => void;
  onActivityAdded?: () => void;
  onActivityUpdated?: () => void;
  editingActivity?: UserActivity | null;
}

export function LogWorkoutModal({
  visible,
  onClose,
  onActivityAdded,
  onActivityUpdated,
  editingActivity,
}: LogWorkoutModalProps) {
  const { user } = useUser();
  const { theme, isDark } = useTheme();

  const [activeTab, setActiveTab] = useState<'log' | 'manage'>('log');
  const [userWeightKg, setUserWeightKg] = useState<number>(70);

  // New Workout Logging State
  const [title, setTitle] = useState('Strength & Gym Workout');
  const [type, setType] = useState('workout');
  const [duration, setDuration] = useState('30');
  const [calories, setCalories] = useState('250');
  const [isSaving, setIsSaving] = useState(false);

  // Manage Recent Activities State
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState('workout');
  const [editDuration, setEditDuration] = useState('30');
  const [editCalories, setEditCalories] = useState('250');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.id && visible) {
      // Load user profile weight for AI calorie calculation
      OnboardingStorage.getOnboardingData(user.id).then((profile) => {
        if (profile?.weight?.kg) {
          const w = parseFloat(profile.weight.kg) || 70;
          setUserWeightKg(w);
        }
      });

      // Load activities for management
      loadActivities();

      // If pre-selected editing activity passed
      if (editingActivity) {
        setActiveTab('manage');
        startEditing(editingActivity);
      } else {
        setActiveTab('log');
        resetNewForm();
      }
    }
  }, [user?.id, visible, editingActivity]);

  const loadActivities = async () => {
    if (!user?.id) return;
    setLoadingActivities(true);
    try {
      const data = await ActivityStorage.getUserActivities(user.id);
      setActivities(data);
    } catch (err) {
      console.warn('Error loading activities in modal:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const resetNewForm = () => {
    setTitle('Strength & Gym Workout');
    setType('workout');
    setDuration('30');
    updateAiBurn('workout', '30');
  };

  const updateAiBurn = (selectedType: string, durStr: string) => {
    const dur = parseInt(durStr, 10) || 30;
    const burned = calculateAIActivityBurn(selectedType, dur, userWeightKg);
    setCalories(burned.toString());
  };

  const handleSelectType = (newType: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setType(newType);
    const titles: Record<string, string> = {
      workout: 'Strength & Gym Workout',
      running: 'Outdoor Running',
      walking: 'Brisk Walk',
      cycling: 'Bicycle Ride',
      swimming: 'Pool Swimming',
      yoga: 'Yoga & Stretching',
    };
    setTitle(titles[newType] || 'Workout Activity');
    updateAiBurn(newType, duration);
  };

  const handleDurationChange = (durStr: string) => {
    setDuration(durStr);
    updateAiBurn(type, durStr);
  };

  const handleQuickAddDuration = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseInt(duration.trim(), 10) || 30;
    const updated = Math.max(5, Math.min(600, curr + delta));
    setDuration(updated.toString());
    updateAiBurn(type, updated.toString());
  };

  const handleSaveNewActivity = async () => {
    if (!user?.id) return;

    const durNum = parseInt(duration.trim(), 10);
    const calNum = parseInt(calories.trim(), 10);

    if (!title.trim()) {
      Alert.alert('Invalid Title', 'Please enter a title for the workout.');
      return;
    }
    if (isNaN(durNum) || durNum <= 0 || durNum > 600) {
      Alert.alert('Invalid Duration', 'Please enter a workout duration between 1 and 600 minutes.');
      return;
    }
    if (isNaN(calNum) || calNum < 0 || calNum > 5000) {
      Alert.alert('Invalid Calories', 'Please enter valid calories burned (0 - 5000 kcal).');
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await ActivityStorage.addActivity(user.id, {
        title: title.trim(),
        type,
        durationMinutes: durNum,
        caloriesBurned: calNum,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });

      if (onActivityAdded) onActivityAdded();
      await loadActivities();
      Alert.alert('Workout Logged!', `Successfully logged "${title.trim()}" (${calNum} kcal burned).`);
      onClose();
    } catch (err) {
      console.error('Error saving workout:', err);
      Alert.alert('Error', 'Failed to save workout activity.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (item: UserActivity) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditType(item.type || 'workout');
    setEditDuration(item.durationMinutes.toString());
    setEditCalories(item.caloriesBurned.toString());
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleSaveEditedActivity = async (activityId: string) => {
    if (!user?.id) return;

    const durNum = parseInt(editDuration.trim(), 10);
    const calNum = parseInt(editCalories.trim(), 10);

    if (!editTitle.trim()) {
      Alert.alert('Invalid Title', 'Please enter a valid title.');
      return;
    }
    if (isNaN(durNum) || durNum <= 0 || durNum > 600) {
      Alert.alert('Invalid Duration', 'Please enter duration between 1 and 600 minutes.');
      return;
    }
    if (isNaN(calNum) || calNum < 0 || calNum > 5000) {
      Alert.alert('Invalid Calories', 'Please enter valid calories (0 - 5000 kcal).');
      return;
    }

    setIsUpdating(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      await ActivityStorage.updateActivity(user.id, activityId, {
        title: editTitle.trim(),
        type: editType,
        durationMinutes: durNum,
        caloriesBurned: calNum,
      });

      setEditingId(null);
      await loadActivities();
      if (onActivityUpdated) onActivityUpdated();
      Alert.alert('Activity Updated', 'Workout activity details updated successfully.');
    } catch (err) {
      console.error('Error updating activity:', err);
      Alert.alert('Update Error', 'Failed to update activity details.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteActivity = (item: UserActivity) => {
    if (!user?.id) return;

    Alert.alert('Delete Activity', `Are you sure you want to remove "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await ActivityStorage.deleteActivity(user.id, item.id);
          setActivities((prev) => prev.filter((a) => a.id !== item.id));
          if (onActivityUpdated) onActivityUpdated();
        },
      },
    ]);
  };

  const getActivityIconConfig = (activityType: string) => {
    switch (activityType) {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <View style={[styles.headerIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Dumbbell01Icon size={20} color="#F59E0B" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Log & Manage Workouts</Text>
                <Text style={[styles.modalSub, { color: theme.textMuted }]}>Record workouts or manage recent activity items</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
              onPress={onClose}
            >
              <Cancel01Icon size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Mode Tabs: Log New Workout vs Manage Recent List */}
          <View style={[styles.tabSelectorRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'log' && { backgroundColor: theme.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('log');
              }}
            >
              <Add01Icon size={16} color={activeTab === 'log' ? Colors.primary : theme.textMuted} />
              <Text style={[styles.tabBtnText, { color: activeTab === 'log' ? theme.text : theme.textMuted }]}>
                Log New Workout
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'manage' && { backgroundColor: theme.card }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab('manage');
              }}
            >
              <Activity01Icon size={16} color={activeTab === 'manage' ? Colors.primary : theme.textMuted} />
              <Text style={[styles.tabBtnText, { color: activeTab === 'manage' ? theme.text : theme.textMuted }]}>
                Manage Recent ({activities.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* TAB 1: LOG NEW WORKOUT FORM */}
          {activeTab === 'log' && (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Activity Type Selection */}
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Select Activity Type</Text>
              <View style={styles.typeGrid}>
                {[
                  { id: 'workout', label: 'Gym / Strength', icon: 'dumbbell', color: '#EF4444' },
                  { id: 'running', label: 'Running', icon: 'run', color: '#10B981' },
                  { id: 'walking', label: 'Brisk Walk', icon: 'walk', color: '#38BDF8' },
                  { id: 'cycling', label: 'Cycling', icon: 'bike', color: '#F59E0B' },
                  { id: 'swimming', label: 'Swimming', icon: 'swim', color: '#3B82F6' },
                  { id: 'yoga', label: 'Yoga & Stretch', icon: 'flower-tulip-outline', color: '#A855F7' },
                ].map((item) => {
                  const isSelected = type === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.typeChip,
                        { backgroundColor: theme.cardSecondary, borderColor: isSelected ? item.color : theme.border },
                        isSelected && { backgroundColor: `${item.color}15` },
                      ]}
                      onPress={() => handleSelectType(item.id)}
                    >
                      <MaterialCommunityIcons name={item.icon as any} size={18} color={item.color} />
                      <Text style={[styles.typeChipText, { color: isSelected ? item.color : theme.textMuted }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Title Field */}
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Workout Title</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Workout title (e.g. Legs & Cardio)"
                placeholderTextColor="#64748B"
              />

              {/* Duration Field with Quick Controls */}
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Duration (Minutes)</Text>
              <View style={styles.durationControlRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  value={duration}
                  onChangeText={handleDurationChange}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#64748B"
                />

                <View style={styles.quickDurGroup}>
                  {[+5, +15, +30].map((delta) => (
                    <TouchableOpacity
                      key={delta}
                      style={[styles.quickDurBtn, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      onPress={() => handleQuickAddDuration(delta)}
                    >
                      <Text style={[styles.quickDurBtnText, { color: Colors.primary }]}>+{delta}m</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calories Burned Field & AI Estimate Banner */}
              <View style={styles.labelWithAiRow}>
                <Text style={[styles.fieldLabel, { color: theme.text, marginBottom: 0 }]}>Calories Burned (kcal)</Text>
                <View style={styles.aiBadge}>
                  <SparklesIcon size={11} color={Colors.primary} />
                  <Text style={styles.aiBadgeText}>AI Estimated</Text>
                </View>
              </View>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor="#64748B"
              />

              {/* Log Workout Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: Colors.primary }]}
                onPress={handleSaveNewActivity}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Add01Icon size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>Log Workout ({calories} kcal)</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* TAB 2: MANAGE & EDIT RECENT ACTIVITIES LIST */}
          {activeTab === 'manage' && (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {loadingActivities ? (
                <View style={styles.emptyCard}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>Loading recent activities...</Text>
                </View>
              ) : activities.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <Activity01Icon size={32} color={Colors.primary} />
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Recent Workouts</Text>
                  <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                    No logged workouts found for today. Switch to the "Log New Workout" tab to add your exercise.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 12, paddingVertical: 6 }}>
                  {activities.map((item) => {
                    const iconConfig = getActivityIconConfig(item.type);
                    const isEditingThis = editingId === item.id;

                    if (isEditingThis) {
                      return (
                        <View
                          key={item.id}
                          style={[styles.editItemCard, { backgroundColor: theme.cardSecondary, borderColor: Colors.primary }]}
                        >
                          <Text style={[styles.editItemHeader, { color: Colors.primary }]}>Editing: {item.title}</Text>

                          {/* Edit Title Input */}
                          <Text style={[styles.fieldLabel, { color: theme.text }]}>Title</Text>
                          <TextInput
                            style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                            value={editTitle}
                            onChangeText={setEditTitle}
                          />

                          {/* Edit Duration & Calories */}
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.fieldLabel, { color: theme.text }]}>Duration (min)</Text>
                              <TextInput
                                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                                value={editDuration}
                                onChangeText={setEditDuration}
                                keyboardType="numeric"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.fieldLabel, { color: theme.text }]}>Burned (kcal)</Text>
                              <TextInput
                                style={[styles.textInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                                value={editCalories}
                                onChangeText={setEditCalories}
                                keyboardType="numeric"
                              />
                            </View>
                          </View>

                          {/* Action Buttons: Save Edit & Cancel */}
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                            <TouchableOpacity
                              style={[styles.editActionBtn, { backgroundColor: Colors.primary, flex: 1 }]}
                              onPress={() => handleSaveEditedActivity(item.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <>
                                  <CheckmarkCircle01Icon size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                                  <Text style={styles.editActionBtnText}>Save Changes</Text>
                                </>
                              )}
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.editActionBtn, { backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border }]}
                              onPress={cancelEditing}
                            >
                              <Text style={[styles.editActionBtnText, { color: theme.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    }

                    return (
                      <View
                        key={item.id}
                        style={[styles.activityRowCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                      >
                        <View style={[styles.activityIconBg, { backgroundColor: iconConfig.bg }]}>
                          <MaterialCommunityIcons name={iconConfig.icon as any} size={20} color={iconConfig.color} />
                        </View>

                        <View style={styles.activityInfo}>
                          <Text style={[styles.activityTitle, { color: theme.text }]}>{item.title}</Text>
                          <Text style={[styles.activityMeta, { color: theme.textMuted }]}>
                            {item.durationMinutes} mins • {item.timestamp}
                          </Text>
                        </View>

                        <View style={styles.activityRight}>
                          <View style={styles.burnedBadge}>
                            <Ionicons name="flame" size={12} color="#EF4444" />
                            <Text style={styles.burnedText}>-{item.caloriesBurned} kcal</Text>
                          </View>

                          {/* Control Buttons: Edit & Delete */}
                          <View style={{ flexDirection: 'row', gap: 6, marginLeft: 6 }}>
                            <TouchableOpacity
                              style={[styles.controlIconBtn, { backgroundColor: theme.inputBg }]}
                              onPress={() => startEditing(item)}
                            >
                              <PencilEdit01Icon size={14} color={Colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.controlIconBtn, { backgroundColor: theme.inputBg }]}
                              onPress={() => handleDeleteActivity(item)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          )}
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
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '84%',
    padding: 20,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 11,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelectorRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typeChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    fontSize: 14,
  },
  durationControlRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  quickDurGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  quickDurBtn: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickDurBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  labelWithAiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBadgeText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  saveBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  activityRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  activityIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  activityRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
  },
  burnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  burnedText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  controlIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editItemCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
  },
  editItemHeader: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  editActionBtn: {
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  editActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default LogWorkoutModal;
