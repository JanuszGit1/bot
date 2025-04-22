const fs = require('fs');
const { generateTombstone } = require('./generateTombstone');

(async () => {
    const buffer = await generateTombstone({
        name: "Stanisław Mordarski",
        birthYear: "1999",
        deathYear: "2025",
        cause: "zabiła go łopata"
    });

    fs.writeFileSync('nagrobek.png', buffer);
})();
