import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export const DateBanner: React.FC = () => {
  const now = new Date();
  const dayNumber = now.getDate();
  const monthName = now.toLocaleDateString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  const dateString = `${dayNumber} ${monthName}, ${year}`;

  return (
    <View style={styles.dateBox}>
      <Text style={styles.dateText}>{dateString}</Text>
      <Text style={styles.dayText}>{dayOfWeek}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
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

export default DateBanner;
