import { useUser } from '@clerk/expo';
import { db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Cache of synced user IDs to prevent duplicate Firestore queries during the app lifecycle
const syncedUsersCache: { [userId: string]: boolean } = {};

export function useSyncUser() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isLoaded || !isSignedIn || !user) return;

      if (syncedUsersCache[user.id]) {
        console.log('User profile already synchronized in this app session.');
        return;
      }

      setIsSyncing(true);
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
          console.log('User profile already synced in Firestore.');
        }
        syncedUsersCache[user.id] = true;
      } catch (err) {
        console.error('Error syncing user to Firestore:', err);
        setError(err as Error);
      } finally {
        setIsSyncing(false);
      }
    }

    syncUser();
  }, [user, isLoaded, isSignedIn]);

  return { isSyncing, error };
}
