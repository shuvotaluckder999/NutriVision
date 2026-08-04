import { ClerkProvider, useAuth } from '@clerk/expo';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { tokenCache } from '../utils/cache';
import { useSyncUser } from '../hooks/useSyncUser';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

const publishableKey = (process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '').trim();

if (!publishableKey || publishableKey.includes('your_clerk_publishable_key') || publishableKey === 'YOUR_CLERK_PUBLISHABLE_KEY') {
  console.warn(
    '⚠️ Clerk Publishable Key is missing or using placeholder! Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env file.'
  );
}

// Catch offline dynamic chunk rejection errors gracefully
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && String(event.reason).includes('Clerk UI')) {
      event.preventDefault();
    }
  });
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments() as any;
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();

  // Synchronize user data to Firebase Firestore automatically upon sign-in/up
  useSyncUser();

  // Check if onboarding form has been completed in database / AsyncStorage
  const { checkingOnboarding, onboardingCompleted } = useOnboardingStatus();

  useEffect(() => {
    if (!isLoaded || checkingOnboarding) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === 'onboarding';
    const inGeneratingPlan = segments[0] === 'generating-plan';

    if (isSignedIn) {
      if (onboardingCompleted === false) {
        // User has not filled database onboarding form yet -> navigate to step form
        if (!inOnboarding && !inGeneratingPlan) {
          router.replace('/onboarding' as any);
        }
      } else if (onboardingCompleted === true) {
        // User ALREADY has information in database -> skip onboarding form unless editing profile
        const isEditing = params.mode === 'edit';
        if (inAuthGroup || (inOnboarding && !isEditing) || segments.length === 0 || segments[0] === 'index') {
          if (!inGeneratingPlan) {
            router.replace('/(tabs)' as any);
          }
        }
      }
    } else {
      // If signed out and not in auth screens, redirect to sign-in page
      if (!inAuthGroup) {
        router.replace('/sign-in' as any);
      }
    }
  }, [isSignedIn, isLoaded, checkingOnboarding, onboardingCompleted, segments, router, params.mode]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="generating-plan" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

export default function RootLayout() {
  // Use tokenCache only on native mobile platforms; web manages session tokens via native cookies/storage
  const cache = Platform.OS === 'web' ? undefined : tokenCache;

  return (
    <ClerkProvider tokenCache={cache} publishableKey={publishableKey}>
      <InitialLayout />
    </ClerkProvider>
  );
}
