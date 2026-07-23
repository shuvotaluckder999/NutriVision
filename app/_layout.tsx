import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { tokenCache } from '../utils/cache';
import { useSyncUser } from '../hooks/useSyncUser';
import { useOnboardingStatus } from '../hooks/useOnboardingStatus';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!publishableKey || publishableKey === 'pk_test_ZXhjaXRpbmctcmluZ3RhaWwtMS5jbGVyay5hY2NvdW50cy5kZXYk') {
  console.warn(
    '⚠️ Clerk Publishable Key is missing or using placeholder! Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctcmluZ3RhaWwtMS5jbGVyay5hY2NvdW50cy5kZXYk in your .env file.'
  );
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const segments = useSegments() as any;
  const router = useRouter();

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
        // User ALREADY has information in database -> skip onboarding form & navigate to tabs
        if (inAuthGroup || inOnboarding || segments.length === 0 || segments[0] === 'index') {
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
  }, [isSignedIn, isLoaded, checkingOnboarding, onboardingCompleted, segments, router]);

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
  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <InitialLayout />
    </ClerkProvider>
  );
}
