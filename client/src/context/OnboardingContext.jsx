import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const OnboardingContext = createContext(null);

export const OnboardingProvider = ({ children }) => {
  // Try to get saved state from localStorage
  const [isCompleted, setIsCompleted] = useState(() => {
    return localStorage.getItem('wana_onboarding_completed') === 'true';
  });

  const [isActive, setIsActive] = useState(!isCompleted);
  const [currentStep, setCurrentStep] = useState('INTRO');
  
  // Store targets' DOM elements
  const [targets, setTargets] = useState({});
  const [activeTargetRect, setActiveTargetRect] = useState(null);

  // Helper to update rect
  const updateRect = useCallback(() => {
    if (isActive && currentStep && targets[currentStep]) {
      const rect = targets[currentStep].getBoundingClientRect();
      setActiveTargetRect(rect);
    } else {
      setActiveTargetRect(null);
    }
  }, [isActive, currentStep, targets]);

  // Resize listener to recalculate rects if window changes
  useEffect(() => {
    if (!isActive) return;
    
    updateRect();
    
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true); // true for capture phase to catch all scrolls
    
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isActive, updateRect]);

  const registerTarget = useCallback((stepName, element) => {
    setTargets(prev => {
        if(prev[stepName] === element) return prev;
        return { ...prev, [stepName]: element };
    });
  }, []);

  const unregisterTarget = useCallback((stepName) => {
    setTargets(prev => {
      const newTargets = { ...prev };
      delete newTargets[stepName];
      return newTargets;
    });
  }, []);

  const nextStep = useCallback((stepName) => {
    setCurrentStep(stepName);
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsActive(false);
    setIsCompleted(true);
    localStorage.setItem('wana_onboarding_completed', 'true');
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsActive(true);
    setIsCompleted(false);
    setCurrentStep('INTRO');
    localStorage.removeItem('wana_onboarding_completed');
  }, []);

  const value = {
    isActive,
    currentStep,
    activeTargetRect,
    registerTarget,
    unregisterTarget,
    nextStep,
    skipOnboarding,
    resetOnboarding
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
