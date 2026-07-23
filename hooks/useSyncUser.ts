import { useUser } from '@clerk/expo';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Cache of synced user IDs to prevent duplicate Firestore queries during the app lifecycle
const syncedUsersCache: { [userId: string]: boolean } = {};

export function useSyncUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !isSignedIn || !user) {
        setIsSynced(false);
        return;
      }

      if (syncedUsersCache[user.id]) {
        setIsSynced(true);
        setError(null);
        return;
      }

      setIsSyncing(true);
      setIsSynced(false);
      try {
        const userDocRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Document doesn't exist, create it
          await setDoc(userDocRef, {
            uid: user.id,
            email: user.primaryEmailAddress?.emailAddress || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            fullName: user.fullName || '',
            imageUrl: user.imageUrl || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log('User profile successfully synchronized to Firestore!');
        } else {
          // Document exists, update it, preserving existing onboarding and nutrition fields
          const existingData = userDoc.data();
          await setDoc(
            userDocRef,
            {
              uid: user.id,
              email: user.primaryEmailAddress?.emailAddress || '',
              firstName: user.firstName || '',
              lastName: user.lastName || '',
              fullName: user.fullName || '',
              imageUrl: user.imageUrl || '',
              createdAt: existingData?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log('User profile successfully updated/refreshed in Firestore.');
        }
        syncedUsersCache[user.id] = true;
        setIsSynced(true);
        setError(null); // Clear any stale error on success
      } catch (err) {
        console.error('Error syncing user to Firestore:', err);
        setError(err as Error);
        setIsSynced(false);
      } finally {
        setIsSyncing(false);
      }
    }

    syncUser();
  }, [user, isLoaded, isSignedIn]);

  return { isSyncing, isSynced, error };
}
