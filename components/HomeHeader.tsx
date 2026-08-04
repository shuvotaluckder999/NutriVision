import { useUser } from '@clerk/expo';
import * as Haptics from 'expo-haptics';
import { Notification01Icon, UserIcon } from 'hugeicons-react-native';
import React from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../constants/Colors';

interface HomeHeaderProps {
  onNotificationPress?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({ onNotificationPress }) => {
  const { user } = useUser();

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
            <View style={styles.avatarPlaceholder}>
              <UserIcon size={22} color={Colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome back </Text>
          <Text style={styles.userNameText} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
      </View>

      {/* Right Side: Notification Bell + Compact Date & Day */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={handlePressNotification}
          activeOpacity={0.75}
        >
          <Notification01Icon size={22} color="#FFFFFF" />
          <View style={styles.unreadBadge} />
        </TouchableOpacity>

        <View style={styles.dateBox}>
          <Text style={styles.dateText}>{dateString}</Text>
          <Text style={styles.dayText}>{dayOfWeek}</Text>
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
    backgroundColor: '#121824',
    borderWidth: 2,
    borderColor: Colors.primary20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 14,
    flex: 1,
  },
  welcomeText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  userNameText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'center',
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#121824',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 8,
  },
  unreadBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    borderWidth: 1.5,
    borderColor: '#121824',
  },
  dateBox: {
    backgroundColor: '#121824',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 125,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dateText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  dayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 3,
    textAlign: 'center',
  },
});

export default HomeHeader;
