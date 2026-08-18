import { useState, useEffect } from "react";

export default function OnboardingTour({ isOpen, onClose, onNavigateTab }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Bienvenue sur Wana-Allmand ! 🇩🇪",
      icon: "🎉",
      badge: "Étape 1 / 5",
      description: "Prépare-toi à maîtriser le vocabulaire allemand grâce à des duels en direct et des outils d'apprentissage intelligents.",
      tip: "Astuce : Tu peux jouer en solo ou affronter des amis en temps réel !",
      targetAction: null
    },
    {
      title: "1. Crée ou Rejoins un Duel ⚔️",
      icon: "🎮",
      badge: "Étape 2 / 5",
      description: "Clique sur 'Créer une partie' pour générer un code de salon à 4 lettres. Partage-le à tes amis ou clique sur 'Rejoindre' avec un code existant.",
      tip: "Tu peux aussi inviter directement n'importe quel joueur en ligne depuis le menu latéral !",
      tabTarget: "learn"
    },
    {
      title: "2. Importe tes listes ou utilise l'IA 📄✨",
      icon: "📑",
      badge: "Étape 3 / 5",
      description: "Dépose un fichier PDF de cours ou tape simplement un thème comme 'Restaurant' pour que notre IA Gemini génère ta liste en 2 secondes.",
      tip: "Toutes tes listes peuvent être sauvegardées en privé ou partagées avec la communauté.",
      tabTarget: "lists"
    },
    {
      title: "3. Nouveaux Modes & Parcours Médical 🩺",
      icon: "🧠",
      badge: "Étape 4 / 5",
      description: "Explore le module spécialisé Allemand Médical (Anatomie, Diagnostics, Instruments), la lecture interactive mot-à-mot et les mini-jeux de conjugaison.",
      tip: "Idéal pour les professionnels de santé ou pour booster son niveau B1/B2.",
      tabTarget: "medical"
    },
    {
      title: "4. Coffre d'Erreurs & Personnalisation 🎨",
      icon: "🏆",
      badge: "Étape 5 / 5",
      description: "L'application retient automatiquement tes fautes dans le Coffre de Révision. Gagne de l'XP à chaque partie pour débloquer de nouveaux thèmes, avatars et skins de cartes !",
      tip: "Prêt(e) à relever le défi ? Lance ton premier match !",
      tabTarget: "vault"
    }
  ];

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const current = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      if (steps[nextStep].tabTarget && onNavigateTab) {
        onNavigateTab(steps[nextStep].tabTarget);
      }
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (steps[prevStep].tabTarget && onNavigateTab) {
        onNavigateTab(steps[prevStep].tabTarget);
      }
    }
  };

  const handleComplete = () => {
    localStorage.setItem("wana_onboarding_completed", "true");
    onClose();
  };

  return (
    <div className="onboarding-overlay" onClick={handleComplete}>
      <div 
        className="onboarding-modal glass-panel animate-scale-up" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="onboarding-header">
          <span className="onboarding-badge">{current.badge}</span>
          <button className="onboarding-close-btn" onClick={handleComplete} title="Passer le tutoriel">
            ✕
          </button>
        </div>

        <div className="onboarding-content">
          <div className="onboarding-icon-wrapper animate-bounce">
            <span className="onboarding-icon">{current.icon}</span>
          </div>

          <h2 className="onboarding-title">{current.title}</h2>
          <p className="onboarding-description">{current.description}</p>

          {current.tip && (
            <div className="onboarding-tip">
              <span>💡</span>
              <p>{current.tip}</p>
            </div>
          )}
        </div>

        <div className="onboarding-progress-dots">
          {steps.map((_, idx) => (
            <span 
              key={idx} 
              className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              onClick={() => setCurrentStep(idx)}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          {currentStep > 0 && (
            <button className="btn-secondary" onClick={handlePrev}>
              Précédent
            </button>
          )}
          <button className="btn-primary" onClick={handleNext} style={{ flex: 1 }}>
            {currentStep === steps.length - 1 ? "C'est parti ! 🚀" : "Suivant →"}
          </button>
        </div>
      </div>
    </div>
  );
}
