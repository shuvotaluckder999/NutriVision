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
import { LogWorkoutModal } from '../../components/LogWorkoutModal';
import { LogWaterModal } from '../../components/LogWaterModal';
import { useTheme } from '../../context/ThemeContext';

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [logMealVisible, setLogMealVisible] = useState(false);
  const [logWorkoutVisible, setLogWorkoutVisible] = useState(false);
  const [logWaterVisible, setLogWaterVisible] = useState(false);

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

  return (
    <>
      <View style={[styles.floatingContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
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
            const inactiveColor = theme.textMuted;

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && { backgroundColor: theme.primaryBg },
                ]}
                activeOpacity={0.7}
              >
                {tab.icon(isFocused ? activeColor : inactiveColor)}
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : { color: inactiveColor },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vertical Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />

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
          style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setQuickActionVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Quick Action</Text>
              <TouchableOpacity
                onPress={() => setQuickActionVisible(false)}
                style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
              >
                <Cancel01Icon size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => {
                  setQuickActionVisible(false);
                  setAiChatVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(81, 130, 216, 0.15)' }]}>
                  <SparklesIcon size={24} color={Colors.primary} />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.text }]}>AI Chatbot</Text>
                <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>Ask & calculate calories</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => {
                  setQuickActionVisible(false);
                  setLogMealVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Restaurant01Icon size={24} color="#EF4444" />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.text }]}>Log Meal</Text>
                <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>Add custom macros</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => {
                  setQuickActionVisible(false);
                  setLogWaterVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <DropletIcon size={24} color="#38BDF8" />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.text }]}>Log Water</Text>
                <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>+250ml glass</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
                onPress={() => {
                  setQuickActionVisible(false);
                  setLogWorkoutVisible(true);
                }}
              >
                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Dumbbell01Icon size={24} color="#F59E0B" />
                </View>
                <Text style={[styles.actionCardTitle, { color: theme.text }]}>Log Workout</Text>
                <Text style={[styles.actionCardSub, { color: theme.textMuted }]}>Burned calories</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full-Screen ChatGPT-Style AI Nutrition Chatbot Modal */}
      <AIChatModal visible={aiChatVisible} onClose={() => setAiChatVisible(false)} />

      {/* Log Meal Modal */}
      <LogMealModal visible={logMealVisible} onClose={() => setLogMealVisible(false)} />

      {/* Log Workout & Manage Activities Modal */}
      <LogWorkoutModal visible={logWorkoutVisible} onClose={() => setLogWorkoutVisible(false)} />

      {/* Log Water & Hydration Modal */}
      <LogWaterModal visible={logWaterVisible} onClose={() => setLogWaterVisible(false)} />
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
    borderRadius: 32,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
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
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
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
    marginBottom: 20,
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
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
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
    fontSize: 14,
    fontWeight: '700',
  },
  actionCardSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
