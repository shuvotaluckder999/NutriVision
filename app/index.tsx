import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image, StatusBar } from 'react-native';
import { Colors } from '../constants/Colors';

export default function EntryScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0C0F17" />
      <View style={styles.content}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>NutriVision</Text>
        <Text style={styles.appSubtitle}>AI Calories Calculator</Text>
        <ActivityIndicator size="small" color={Colors.primary} style={styles.loader} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0F17',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.4)',
    overflow: 'hidden',
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginTop: 6,
    marginBottom: 40,
  },
  loader: {
    marginTop: 10,
  },
});
