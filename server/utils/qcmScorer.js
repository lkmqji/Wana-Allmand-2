/**
 * QCM & QCU Scorer with Partial Credit for Multiple Choice Questions.
 */
function calculateQcmScore(question, userSelection, timeRemaining = 0) {
  if (!question || !question.options) {
    return { score: 0, baseScore: 0, bonus: 0, isPerfect: false, correctLetters: [] };
  }

  const correctOptions = question.options.filter(o => o.is_correct);
  const correctLetters = correctOptions.map(o => o.letter.toUpperCase()).sort();
  const totalCorrect = correctLetters.length || 1;

  // Normalize user selection to array of uppercase letters
  const selectedLetters = Array.isArray(userSelection)
    ? userSelection.map(l => String(l).trim().toUpperCase()).filter(Boolean)
    : (userSelection ? String(userSelection).split(',').map(l => l.trim().toUpperCase()).filter(Boolean) : []);

  const correctChosen = selectedLetters.filter(l => correctLetters.includes(l)).length;
  const wrongChosen = selectedLetters.filter(l => !correctLetters.includes(l)).length;

  // Proportion: (correctChosen - wrongChosen) / totalCorrect
  const netCorrect = Math.max(0, correctChosen - wrongChosen);
  const proportion = totalCorrect > 0 ? (netCorrect / totalCorrect) : 0;
  const baseScore = Math.max(0, Math.min(100, Math.round(proportion * 100)));

  const isPerfect = (baseScore === 100 && selectedLetters.length === totalCorrect);
  const bonus = (isPerfect && timeRemaining > 0) ? Math.floor(timeRemaining) : 0;
  const totalScore = baseScore + bonus;

  return {
    score: totalScore,
    baseScore,
    bonus,
    isPerfect,
    correctLetters,
    selectedLetters,
    correctCount: correctChosen,
    wrongCount: wrongChosen,
    totalExpected: totalCorrect
  };
}

module.exports = {
  calculateQcmScore
};
