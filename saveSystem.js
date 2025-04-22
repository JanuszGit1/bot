const fs = require('fs');
const path = require('path');

const savePath = path.join(__dirname, 'stories');

if (!fs.existsSync(savePath)) {
  fs.mkdirSync(savePath);
}

function saveStory(storyId, data) {
  const filePath = path.join(savePath, `${storyId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Historia zapisana jako "${storyId}.json"`);
}

function loadStory(storyId) {
  const filePath = path.join(savePath, `${storyId}.json`);
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } else {
    console.log(`❌ Brak historii o ID "${storyId}"`);
    return null;
  }
}

module.exports = {
  saveStory,
  loadStory
};