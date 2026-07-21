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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary30,
  },
  logo: {
    width: 50,
    height: 50,
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
