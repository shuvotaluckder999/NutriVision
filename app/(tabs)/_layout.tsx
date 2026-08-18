import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Tabs } from 'expo-router';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import {
  Add01Icon,
  AnalyticsUpIcon,
  Cancel01Icon,
  DropletIcon,
  Dumbbell01Icon,
  Home01Icon,
  Restaurant01Icon,
  SparklesIcon,
  UserIcon,
} from 'hugeicons-react-native';
import { Colors } from '../../constants/Colors';
import { AIChatModal } from '../../components/AIChatModal';
import { LogMealModal } from '../../components/LogMealModal';

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [logMealVisible, setLogMealVisible] = useState(false);

  const tabs = [
    {
      name: 'index',
      label: 'Home',
      icon: (color: string) => <Home01Icon size={22} color={color} />,
    },
    {
      name: 'analysis',
      label: 'Analysis',
      icon: (color: string) => <AnalyticsUpIcon size={22} color={color} />,
    },
    {
      name: 'profile',
      label: 'Profile',
      icon: (color: string) => <UserIcon size={22} color={color} />,
    },
  ];

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQuickActionVisible(true);
  };

  const handleActionSelect = (actionName: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuickActionVisible(false);
    setTimeout(() => {
      Alert.alert(actionName, `${actionName} feature quick action logged successfully!`);
    }, 200);
  };

  return (
    <>
      <View style={styles.floatingContainer}>
        {/* Tab Items Row */}
        <View style={styles.tabItemsRow}>
          {tabs.map((tab) => {
            const route = state.routes.find((r) => r.name === tab.name);
            const isFocused = route ? state.index === state.routes.indexOf(route) : false;

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (route) {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }
            };

            const activeColor = Colors.primary;
            const inactiveColor = '#64748B';

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && styles.tabButtonActive,
                ]}
                activeOpacity={0.7}
              >
                {tab.icon(isFocused ? activeColor : inactiveColor)}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vertical Divider */}
        <View style={styles.divider} />

        {/* Floating Rounded Plus Button on the Right */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={handleFabPress}
          activeOpacity={0.85}
        >
          <Add01Icon size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Action Modal */}
      <Modal
        visible={quickActionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickActionVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setQuickActionVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Action</Text>
              <TouchableOpacity
                onPress={() => setQuickActionVisible(false)}
                style={styles.closeBtn}
              >
                <Cancel01Icon size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setQuickActionVisible(false);
                  setAiChatVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(81, 130, 216, 0.15)' }]}>
                  <SparklesIcon size={24} color={Colors.primary} />
                </View>
                <Text style={styles.actionCardTitle}>AI Chatbot</Text>
                <Text style={styles.actionCardSub}>Ask & calculate calories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setQuickActionVisible(false);
                  setLogMealVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Restaurant01Icon size={24} color="#EF4444" />
                </View>
                <Text style={styles.actionCardTitle}>Log Meal</Text>
                <Text style={styles.actionCardSub}>Add custom macros</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleActionSelect('Track Water')}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <DropletIcon size={24} color="#38BDF8" />
                </View>
                <Text style={styles.actionCardTitle}>Log Water</Text>
                <Text style={styles.actionCardSub}>+250ml glass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleActionSelect('Log Workout')}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Dumbbell01Icon size={24} color="#F59E0B" />
                </View>
                <Text style={styles.actionCardTitle}>Log Workout</Text>
                <Text style={styles.actionCardSub}>Burned calories</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen ChatGPT-Style AI Nutrition Chatbot Modal */}
      <AIChatModal visible={aiChatVisible} onClose={() => setAiChatVisible(false)} />

      {/* Log Meal Modal */}
      <LogMealModal visible={logMealVisible} onClose={() => setLogMealVisible(false)} />
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="analysis" options={{ title: 'Analysis' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 64,
    backgroundColor: '#121824',
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItemsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(81, 130, 216, 0.12)',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: '#64748B',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E293B',
    marginHorizontal: 4,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 15, 23, 0.75)',
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
    marginBottom: 20,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#1C253B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  actionIconBg: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionCardSub: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
  },
});
