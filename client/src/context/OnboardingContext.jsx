import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const OnboardingContext = createContext(null);

export const TOUR_STEPS = [
  'STEP_DUEL',
  'STEP_SPECIAL_MODES',
  'STEP_LISTS',
  'STEP_VENGEANCE',
  'STEP_SOLO'
];

export const OnboardingProvider = ({ children }) => {
  const [isCompleted, setIsCompleted] = useState(() => {
    try {
      return localStorage.getItem('wana_onboarding_completed') === 'true';
    } catch {
      return false;
    }
  });

  const [isActive, setIsActive] = useState(false);
  const [showWelcomePrompt, setShowWelcomePrompt] = useState(false);
  const [currentStep, setCurrentStep] = useState('WELCOME_PROMPT');
  
  // Store targets' DOM elements
  const [targets, setTargets] = useState({});
  const [activeTargetRect, setActiveTargetRect] = useState(null);

  // Helper to update active target rectangle
  const updateRect = useCallback(() => {
    if (isActive && currentStep && targets[currentStep]) {
      const el = targets[currentStep];
      if (el && typeof el.getBoundingClientRect === 'function') {
        const rect = el.getBoundingClientRect();
        setActiveTargetRect(rect);
        return;
      }
    }
    setActiveTargetRect(null);
  }, [isActive, currentStep, targets]);

  // Resize and scroll listener to recalculate rects
  useEffect(() => {
    if (!isActive) {
      setActiveTargetRect(null);
      return;
    }
    
    updateRect();
    const handleScrollOrResize = () => {
      requestAnimationFrame(updateRect);
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isActive, updateRect, currentStep, targets]);

  // Auto-scroll target element into center of viewport when step changes
  useEffect(() => {
    if (!isActive || !currentStep || !targets[currentStep]) return;
    const el = targets[currentStep];
    if (el && typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.debug('scrollIntoView notice:', e);
      }
    }

    // Continuous rect tracking during smooth scroll animation (~600ms)
    let frameId;
    const start = performance.now();
    const track = () => {
      updateRect();
      if (performance.now() - start < 700) {
        frameId = requestAnimationFrame(track);
      }
    };
    frameId = requestAnimationFrame(track);

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isActive, currentStep, targets, updateRect]);

  const registerTarget = useCallback((stepName, element) => {
    if (!stepName || !element) return;
    if (Array.isArray(stepName)) {
      setTargets(prev => {
        let changed = false;
        const next = { ...prev };
        stepName.forEach(s => {
          if (next[s] !== element) {
            next[s] = element;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } else {
      setTargets(prev => {
        if (prev[stepName] === element) return prev;
        return { ...prev, [stepName]: element };
      });
    }
  }, []);

  const unregisterTarget = useCallback((stepName) => {
    if (!stepName) return;
    if (Array.isArray(stepName)) {
      setTargets(prev => {
        const next = { ...prev };
        stepName.forEach(s => delete next[s]);
        return next;
      });
    } else {
      setTargets(prev => {
        const next = { ...prev };
        delete next[stepName];
        return next;
      });
    }
  }, []);

  // Called when user is authenticated with Google and enters app
  const triggerAuthOnboarding = useCallback((user) => {
    if (!user) return;
    const completed = localStorage.getItem('wana_onboarding_completed') === 'true';
    if (!completed) {
      setShowWelcomePrompt(true);
      setIsActive(true);
      setCurrentStep('WELCOME_PROMPT');
    }
  }, []);

  const startTour = useCallback(() => {
    setShowWelcomePrompt(false);
    setIsActive(true);
    setCurrentStep('STEP_DUEL');
  }, []);

  const confirmWelcome = useCallback(() => {
    startTour();
  }, [startTour]);

  const nextStep = useCallback((explicitStep) => {
    if (explicitStep) {
      setCurrentStep(explicitStep);
      return;
    }
    const idx = TOUR_STEPS.indexOf(currentStep);
    if (idx >= 0 && idx < TOUR_STEPS.length - 1) {
      setCurrentStep(TOUR_STEPS[idx + 1]);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const idx = TOUR_STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(TOUR_STEPS[idx - 1]);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    setIsActive(false);
    setShowWelcomePrompt(false);
    setIsCompleted(true);
    try {
      localStorage.setItem('wana_onboarding_completed', 'true');
    } catch {}
  }, []);

  const resetOnboarding = useCallback(() => {
    try {
      localStorage.removeItem('wana_onboarding_completed');
    } catch {}
    setIsCompleted(false);
    setIsActive(true);
    setShowWelcomePrompt(false);
    setCurrentStep('STEP_DUEL');
  }, []);

  const value = {
    isCompleted,
    isActive,
    showWelcomePrompt,
    currentStep,
    activeTargetRect,
    registerTarget,
    unregisterTarget,
    triggerAuthOnboarding,
    startTour,
    confirmWelcome,
    nextStep,
    prevStep,
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
