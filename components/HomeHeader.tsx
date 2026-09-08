import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useUser } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Notification01Icon, UserIcon } from 'hugeicons-react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';

interface HomeHeaderProps {
  onNotificationPress?: () => void;
  unreadCount?: number;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onNotificationPress, unreadCount = 0 }) => {
  const { user } = useUser();
  const { theme, isDark, toggleTheme } = useTheme();

  const handlePressNotification = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      Alert.alert('Notifications', 'You have no new notifications.');
    }
  };

  const displayName = user?.fullName || user?.firstName || 'NutriVision User';
  const avatarUrl = user?.imageUrl;

  // Dynamic Date calculations
  const now = new Date();
  const dayNumber = now.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  const dateString = `${dayNumber} ${monthName}, ${year}`;

  return (
    <View style={styles.headerContainer}>
      {/* Left Side: Avatar + Welcome Text & User Name */}
      <View style={styles.leftSection}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.card, borderColor: Colors.primary20 }]}>
              <UserIcon size={22} color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.welcomeText, { color: theme.textMuted }]}>Welcome back 👋</Text>
          <Text style={[styles.userNameText, { color: theme.text }]} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>

      {/* Right Side: Theme Toggle + Notification Bell + Compact Date */}
      <View style={styles.rightSection}>
        <View style={styles.topIconRow}>
          {/* Quick Theme Switcher Button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              toggleTheme();
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={18}
              color={isDark ? '#F59E0B' : '#8B5CF6'}
            />
          </TouchableOpacity>

          {/* Notification Button */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={handlePressNotification}
            activeOpacity={0.75}
          >
            <Notification01Icon size={19} color={theme.text} />
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { borderColor: theme.card }]}>
                <Text style={styles.unreadCountText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.dateBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.dateText, { color: theme.text }]}>{dateString}</Text>
          <Text style={[styles.dayText, { color: Colors.primary }]}>{dayOfWeek}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    marginTop: 2,
  },
  avatarWrapper: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 14,
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  topIconRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
  dateBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  dayText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default HomeHeader;
