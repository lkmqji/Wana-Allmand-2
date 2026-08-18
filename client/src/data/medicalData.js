/**
 * Module d'Allemand Médical & Professionnel
 * 4 Modules spécialisés pour soignants, médecins et étudiants
 */

export const MEDICAL_MODULES = [
  {
    id: "instruments",
    title: "Instruments & Matériel Médical",
    icon: "🩺",
    level: "B1/B2 Médical",
    description: "Tout le vocabulaire des instruments chirurgicaux, dispositifs et outils d'examen clinique.",
    words: [
      { id: 1, question: "Le stéthoscope", english: "Stethoscope", answer: "das Stethoskop" },
      { id: 2, question: "La seringue", english: "Syringe", answer: "die Spritze" },
      { id: 3, question: "Le scalpel / bistouri", english: "Scalpel", answer: "das Skalpell" },
      { id: 4, question: "Le tensiomètre", english: "Blood pressure monitor", answer: "das Blutdruckmessgerät" },
      { id: 5, question: "Le thermomètre", english: "Thermometer", answer: "das Fieberthermometer" },
      { id: 6, question: "La compresse", english: "Compress / gauze", answer: "die Kompresse" },
      { id: 7, question: "Le pansement", english: "Bandage / plaster", answer: "das Pflaster" },
      { id: 8, question: "Le bandage / le pansement", english: "Dressing / bandage", answer: "der Verband" },
      { id: 9, question: "L'aiguille d'injection", english: "Injection needle", answer: "die Kanüle" },
      { id: 10, question: "Les gants chirurgicaux", english: "Surgical gloves", answer: "die OP-Handschuhe" },
      { id: 11, question: "L'électrocardiographe", english: "ECG machine", answer: "das EKG-Gerät" },
      { id: 12, question: "La perfusion", english: "Infusion / IV drip", answer: "die Infusion" },
      { id: 13, question: "Le cathéter", english: "Catheter", answer: "der Katheter" },
      { id: 14, question: "L'échographe", english: "Ultrasound device", answer: "das Ultraschallgerät" },
      { id: 15, question: "La pince chirurgicale", english: "Forceps / clamp", answer: "die Pinzette" }
    ]
  },
  {
    id: "anatomy",
    title: "Anatomie & Organes Vitaux",
    icon: "🫀",
    level: "B1/B2 Médical",
    description: "Les parties du corps humain, organes internes, circulation et système nerveux.",
    words: [
      { id: 1, question: "Le cœur", english: "Heart", answer: "das Herz" },
      { id: 2, question: "Le poumon", english: "Lung", answer: "die Lunge" },
      { id: 3, question: "Le foie", english: "Liver", answer: "die Leber" },
      { id: 4, question: "Le rein", english: "Kidney", answer: "die Niere" },
      { id: 5, question: "Le cerveau", english: "Brain", answer: "das Gehirn" },
      { id: 6, question: "L'estomac", english: "Stomach", answer: "der Magen" },
      { id: 7, question: "L'intestin", english: "Intestine / bowel", answer: "der Darm" },
      { id: 8, question: "Le vaisseau sanguin", english: "Blood vessel", answer: "das Blutgefäß" },
      { id: 9, question: "La rate", english: "Spleen", answer: "die Milz" },
      { id: 10, question: "La vésicule biliaire", english: "Gallbladder", answer: "die Gallenblase" },
      { id: 11, question: "La vessie", english: "Urinary bladder", answer: "die Harnblase" },
      { id: 12, question: "L'os", english: "Bone", answer: "der Knochen" },
      { id: 13, question: "L'articulation", english: "Joint", answer: "das Gelenk" },
      { id: 14, question: "La moelle épinière", english: "Spinal cord", answer: "das Rückenmark" },
      { id: 15, question: "Le pancréas", english: "Pancreas", answer: "die Bauchspeicheldrüse" }
    ]
  },
  {
    id: "diseases",
    title: "Maladies, Pathologies & Symptômes",
    icon: "🌡️",
    level: "B2 Médical",
    description: "Symptômes fréquents, diagnostics, états cliniques et urgences médicales.",
    words: [
      { id: 1, question: "La fièvre", english: "Fever", answer: "das Fieber" },
      { id: 2, question: "L'inflammation", english: "Inflammation", answer: "die Entzündung" },
      { id: 3, question: "L'hypertension artérielle", english: "Hypertension / high blood pressure", answer: "der Bluthochdruck" },
      { id: 4, question: "L'infarctus du myocarde", english: "Heart attack", answer: "der Herzinfarkt" },
      { id: 5, question: "L'AVC / accident vasculaire", english: "Stroke", answer: "der Schlaganfall" },
      { id: 6, question: "La fracture osseuse", english: "Bone fracture", answer: "der Knochenbruch" },
      { id: 7, question: "La nausée", english: "Nausea", answer: "die Übelkeit" },
      { id: 8, question: "L'étourdissement / vertige", english: "Dizziness / vertigo", answer: "der Schwindel" },
      { id: 9, question: "L'essoufflement / dyspnée", english: "Shortness of breath", answer: "die Atemnot" },
      { id: 10, question: "La douleur", english: "Pain", answer: "der Schmerz" },
      { id: 11, question: "L'infection", english: "Infection", answer: "die Infektion" },
      { id: 12, question: "La commotion cérébrale", english: "Concussion", answer: "die Gehirnerschütterung" },
      { id: 13, question: "L'insuffisance rénale", english: "Renal failure", answer: "die Niereninsuffizienz" },
      { id: 14, question: "L'allergie", english: "Allergy", answer: "die Allergie" },
      { id: 15, question: "La pneumonie", english: "Pneumonia", answer: "die Lungenentzündung" }
    ]
  },
  {
    id: "verbs",
    title: "Sémiologie & Verbes d'Action Médicale",
    icon: "💉",
    level: "B1/B2 Médical",
    description: "Les verbes essentiels de la pratique médicale, de la consultation et des soins.",
    words: [
      { id: 1, question: "Examiner (un patient)", english: "To examine", answer: "untersuchen" },
      { id: 2, question: "Traiter / soigner", english: "To treat", answer: "behandeln" },
      { id: 3, question: "Opérer", english: "To operate", answer: "operieren" },
      { id: 4, question: "Prescrire (une ordonnance)", english: "To prescribe", answer: "verschreiben" },
      { id: 5, question: "Vacciner", english: "To vaccinate", answer: "impfen" },
      { id: 6, question: "Désinfecter", english: "To disinfect", answer: "desinfizieren" },
      { id: 7, question: "Mesurer la tension", english: "To measure blood pressure", answer: "den Blutdruck messen" },
      { id: 8, question: "Faire une prise de sang", english: "To take blood", answer: "Blut abnehmen" },
      { id: 9, question: "Poser un diagnostic", english: "To diagnose", answer: "eine Diagnose stellen" },
      { id: 10, question: "Hospitaliser / admettre", english: "To admit to hospital", answer: "einweisen" },
      { id: 11, question: "Soulager la douleur", english: "To relieve pain", answer: "die Schmerzen lindern" },
      { id: 12, question: "Intuber", english: "To intubate", answer: "intubieren" },
      { id: 13, question: "Anesthésier", english: "To anesthetize", answer: "betäuben" },
      { id: 14, question: "Faire une radio", english: "To X-ray", answer: "röntgen" },
      { id: 15, question: "Réanimer", english: "To resuscitate", answer: "wiederbeleben" }
    ]
  }
];
