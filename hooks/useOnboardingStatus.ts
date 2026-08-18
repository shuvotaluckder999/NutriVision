import { useUser } from '@clerk/expo';
import { useEffect, useState } from 'react';
import { OnboardingStorage, UserOnboardingData } from '../utils/onboardingStorage';

export function useOnboardingStatus() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [onboardingData, setOnboardingData] = useState<UserOnboardingData | null>(null);

  const checkStatus = async (): Promise<boolean> => {
    if (!isLoaded || !isSignedIn || !user) {
      setOnboardingCompleted(null);
      setOnboardingData(null);
      setCheckingOnboarding(false);
      return false;
    }

    setCheckingOnboarding(true);
    let isCompleted = false;
    try {
      isCompleted = await OnboardingStorage.isOnboardingCompleted(user.id);
      setOnboardingCompleted(isCompleted);

      if (isCompleted) {
        const data = await OnboardingStorage.getOnboardingData(user.id);
        setOnboardingData(data);
      }
    } catch (e) {
      console.error('Error checking onboarding status:', e);
      setOnboardingCompleted(false);
      isCompleted = false;
    } finally {
      setCheckingOnboarding(false);
    }
    return isCompleted;
  };

  useEffect(() => {
    checkStatus();
  }, [user?.id, isLoaded, isSignedIn]);

  return {
    checkingOnboarding,
    onboardingCompleted,
    onboardingData,
    refetchOnboardingStatus: checkStatus,
  };
}
