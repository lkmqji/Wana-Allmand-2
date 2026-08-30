import { useEffect, useRef } from 'react';
import { useOnboarding } from '../context/OnboardingContext';

export const useSpotlightTarget = (stepName) => {
  const { registerTarget, unregisterTarget, isActive } = useOnboarding();
  const ref = useRef(null);

  useEffect(() => {
    // Only register if onboarding is active to save resources
    if (isActive && ref.current) {
      const steps = Array.isArray(stepName) ? stepName : [stepName];
      steps.forEach(s => registerTarget(s, ref.current));
    }
    return () => {
      if (isActive) {
        const steps = Array.isArray(stepName) ? stepName : [stepName];
        steps.forEach(s => unregisterTarget(s));
      }
    };
  }, [stepName, registerTarget, unregisterTarget, isActive]);

  return ref;
};
