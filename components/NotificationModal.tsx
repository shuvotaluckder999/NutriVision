import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Activity01Icon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  Notification01Icon,
  Restaurant01Icon,
} from 'hugeicons-react-native';
import { Colors } from '../constants/Colors';
import { useTheme } from '../context/ThemeContext';
import { AppNotification } from '../utils/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onNotificationAction: (actionType: 'log_meal' | 'log_workout' | 'log_water') => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onMarkAsRead: (id: string) => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  notifications,
  onNotificationAction,
  onMarkAllAsRead,
  onClearAll,
  onMarkAsRead,
}) => {
  const { theme } = useTheme();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'alert':
        return { icon: 'flame', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'warning':
        return { icon: 'warning-outline', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
      case 'hydration':
        return { icon: 'water-outline', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'success':
        return { icon: 'checkmark-circle-outline', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'workout':
        return { icon: 'barbell-outline', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
      case 'info':
      default:
        return { icon: 'information-circle-outline', color: Colors.primary, bg: 'rgba(16, 185, 129, 0.15)' };
    }
  };

  const handleActionPress = (item: AppNotification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMarkAsRead(item.id);
    if (item.actionType) {
      onClose();
      onNotificationAction(item.actionType);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Notification01Icon size={22} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} New</Text>
                </View>
              )}
            </View>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: theme.cardSecondary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Cancel01Icon size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Subheader Toolbar */}
          {notifications.length > 0 && (
            <View style={[styles.toolbarRow, { borderColor: theme.border }]}>
              {unreadCount > 0 ? (
                <TouchableOpacity
                  style={styles.toolbarBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onMarkAllAsRead();
                  }}
                >
                  <Ionicons name="checkmark-done" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.toolbarBtnText, { color: Colors.primary }]}>Mark all as read</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ fontSize: 12, color: theme.textMuted }}>All notifications read</Text>
              )}

              <TouchableOpacity
                style={styles.toolbarBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onClearAll();
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={[styles.toolbarBtnText, { color: '#EF4444' }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notification List */}
          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <View style={[styles.emptyIconBg, { backgroundColor: theme.primaryBg }]}>
                  <CheckmarkCircle01Icon size={36} color={Colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>All Caught Up!</Text>
                <Text style={[styles.emptySubtext, { color: theme.textMuted }]}>
                  You have no pending notifications right now. Keep logging meals, water, and workouts!
                </Text>
              </View>
            ) : (
              notifications.map((item) => {
                const iconInfo = getNotificationIcon(item.type);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notificationCard,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      !item.read && styles.unreadCard,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onMarkAsRead(item.id);
                    }}
                    activeOpacity={0.85}
                  >
                    {!item.read && <View style={styles.unreadDot} />}

                    <View style={[styles.iconBg, { backgroundColor: iconInfo.bg }]}>
                      <Ionicons name={iconInfo.icon as any} size={20} color={iconInfo.color} />
                    </View>

                    <View style={styles.contentContainer}>
                      <View style={styles.itemHeaderRow}>
                        <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={[styles.itemTime, { color: theme.textMuted }]}>{item.timestamp}</Text>
                      </View>

                      <Text style={[styles.itemBody, { color: theme.textMuted }]}>{item.body}</Text>

                      {item.actionType && (
                        <TouchableOpacity
                          style={[
                            styles.actionBtn,
                            item.actionType === 'log_workout'
                              ? { backgroundColor: '#EF4444' }
                              : item.actionType === 'log_water'
                              ? { backgroundColor: '#0284C7' }
                              : { backgroundColor: Colors.primary },
                          ]}
                          onPress={() => handleActionPress(item)}
                          activeOpacity={0.8}
                        >
                          {item.actionType === 'log_workout' ? (
                            <Activity01Icon size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          ) : item.actionType === 'log_water' ? (
                            <Ionicons name="water" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          ) : (
                            <Restaurant01Icon size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                          )}
                          <Text style={styles.actionBtnText}>{item.actionLabel || 'Take Action'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    borderWidth: 1.5,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollList: {
    maxHeight: 460,
  },
  emptyContainer: {
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    marginVertical: 10,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },
  itemBody: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
