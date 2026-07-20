import { ClerkProvider, useAuth } from '@clerk/expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { tokenCache } from '../utils/cache';
import { useSyncUser } from '../hooks/useSyncUser';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

if (!publishableKey || publishableKey === 'pk_test_ZXhjaXRpbmctcmluZ3RhaWwtMS5jbGVyay5hY2NvdW50cy5kZXYk') {
  console.warn(
    '⚠️ Clerk Publishable Key is missing or using placeholder! Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZXhjaXRpbmctcmluZ3RhaWwtMS5jbGVyay5hY2NvdW50cy5kZXYk in your .env file.'
  );
}

function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments() as any;
  const router = useRouter();

  // Synchronize user data to Firebase Firestore automatically upon sign-in/up
  useSyncUser();

  useEffect(() => {
    if (!isLoaded) return;

    // Check if the user is currently on an authentication screen
    const inAuthGroup = segments[0] === '(auth)';

    if (isSignedIn) {
      // If signed in and still on the auth pages or landing index, redirect to tabs dashboard
      if (inAuthGroup || segments.length === 0 || segments[0] === 'index') {
        router.replace('/' as any);
      }
    } else {
      // If signed out and not in the auth screens, redirect to sign-in page
      if (!inAuthGroup) {
        router.replace('/sign-in' as any);
      }
    }
  }, [isSignedIn, isLoaded, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
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
