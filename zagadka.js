const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const { setCorrectAnswer } = require('./odp'); // ⬅ Dodane

const questionsPath = path.join(__dirname, 'questions.json');

// Sprawdzanie istnienia pliku
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Ładowanie historii pytań
async function loadQuestions() {
    if (!await fileExists(questionsPath)) return [];
    try {
        const data = await fs.readFile(questionsPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error("[ERROR] Błąd przy ładowaniu pytań:", err);
        return [];
    }
}

// Zapisywanie historii pytań
async function saveQuestions(questions) {
    try {
        await fs.writeFile(questionsPath, JSON.stringify(questions, null, 2), 'utf8');
    } catch (err) {
        console.error("[ERROR] Błąd przy zapisie pytań:", err);
    }
}

// Dekodowanie encji HTML (&#039; → ')
function decodeHtmlEntities(text) {
    return text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec))
               .replace(/&quot;/g, '"')
               .replace(/&amp;/g, '&')
               .replace(/&lt;/g, '<')
               .replace(/&gt;/g, '>')
               .replace(/&apos;/g, "'")
               .replace(/&nbsp;/g, ' ');
}

// Pobieranie pytania z OpenTriviaDB
async function fetchTrivia(category, difficulty) {
    const url = `https://opentdb.com/api.php?amount=1&type=multiple&category=${category}&difficulty=${difficulty}`;
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.response_code === 0 && data.results.length > 0) {
            let question = decodeHtmlEntities(data.results[0].question);
            let correctAnswer = decodeHtmlEntities(data.results[0].correct_answer);

            return { question, correctAnswer };
        } else {
            console.error("[ERROR] API zwróciło pustą odpowiedź lub błąd:", data);
            return { question: null, correctAnswer: null };
        }
    } catch (err) {
        console.error("[ERROR] Błąd przy pobieraniu pytań:", err);
        return { question: null, correctAnswer: null };
    }
}

// Zapisywanie do historii
async function addQuestionToHistory(question, correctAnswer) {
    const questions = await loadQuestions();
    questions.push({
        question,
        correctAnswer,
        date: Date.now()
    });
    await saveQuestions(questions);
}

async function handleTriviaCommand(command, page) {
    if (command.toLowerCase().startsWith("!zagadka")) {
        const [_, category, difficulty] = command.split(" ");
        const validDifficulties = ['easy', 'medium', 'hard'];

        if (!category || !difficulty) {
            return "❌ Użycie: `!zagadka <kategoria> <trudność>` (np. !zagadka 9 easy).";
        }

        if (isNaN(category) || !validDifficulties.includes(difficulty)) {
            return "❌ Kategoria musi być liczbą, a trudność: `easy`, `medium`, `hard`.";
        }

        const { question, correctAnswer } = await fetchTrivia(category, difficulty);

        if (question && correctAnswer) {
            console.log(`[BOT] → Pytanie: ${question}`);
            console.log(`[BOT] → Poprawna odpowiedź: ${correctAnswer}`);

            await addQuestionToHistory(question, correctAnswer);
            await setCorrectAnswer("zagadka", question, correctAnswer); // ⬅ Dodane
            await sendMessage(page, `🎲 Pytanie: ${question}\nPodaj swoją odpowiedź! (komenda !odp zagadka <twoja odpowiedź>)`);
        } else {
            return "❌ Nie udało się pobrać pytania. Sprawdź kategorię lub spróbuj później.";
        }
    }
    return "❌ Nie rozpoznano komendy!";
}

// Historia pytań
async function getQuestionsHistory() {
    const questions = await loadQuestions();
    if (!questions.length) return "❌ Brak historii pytań.";
    return questions.map(q => `Pytanie: ${q.question}\nOdpowiedź: ${q.correctAnswer}`).join("\n\n");
}

// Eksport
module.exports = { 
    handleTriviaCommand, 
    fetchTrivia,
    addQuestionToHistory, 
    getQuestionsHistory 
};
