const paraTexts = require('./paraTexts');
const achievements = require('./achievements');
const { saveStory } = require('./saveSystem');

function unlockAchievement(id, unlockedList) {
  if (!unlockedList.includes(id)) {
    unlockedList.push(id);
    console.log(`🏆 Osiągnięcie odblokowane: ${achievements[id].name}`);
  }
}

function playStory(pair, isNSFW) {
  const unlockedAchievements = [];
  const storyPath = [];

  console.log(paraTexts.getIntro(isNSFW));
  console.log(`📜 Cytat: "${paraTexts.getRandomQuote()}"\n`);

  // Wybieramy odpowiednie sceny w zależności od tego, czy NSFW
  const scenes = getScenes(isNSFW);
  scenes.forEach((scene, step) => {
    const stageText = paraTexts.getRelationshipStage(step, pair.percent);
    const storyStep = paraTexts.getStoryStep(step, isNSFW);

    console.log(stageText);
    console.log(storyStep.text);

    const choice = storyStep.choices[Math.floor(Math.random() * storyStep.choices.length)];
    console.log(`👉 Wybrano: ${choice.text}\n`);

    storyPath.push({
      step,
      choiceKey: choice.choice_id,
      choiceLabel: choice.text
    });

    // Sprawdzanie osiągnięć na podstawie wyborów
    if (choice.choice_id === 'choice1_1') unlockAchievement('firstKiss', unlockedAchievements);
    if (choice.choice_id === 'choice2_1') unlockAchievement('betrayal', unlockedAchievements);
  });

  if (pair.percent >= 90) {
    unlockAchievement('trueLove', unlockedAchievements);
  }

  const ending = paraTexts.getStoryEnd(pair);
  console.log(`🏁 Zakończenie: ${ending}`);

  console.log(`🏆 Osiągnięcia (${unlockedAchievements.length}):`);
  unlockedAchievements.forEach(id => {
    const ach = achievements[id];
    console.log(`- ${ach.name}: ${ach.description}`);
  });

  saveStory(pair.name, {
    pair,
    storyPath,
    ending,
    achievements: unlockedAchievements
  });
}

// Funkcja do zwracania odpowiednich scen
function getScenes(isNSFW) {
  return isNSFW ? erotic_scenes : psycho_scenes;
}

module.exports = playStory;
