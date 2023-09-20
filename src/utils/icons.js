const fs = require('fs');
const path = require('path');

class IconFetcher {
    emojiMap = {
        note: "💡",
        todo: "✅",
        fix: "🔧"
    };
    constructor() { }
    
    getEmoji(noteCategory) {
        return this.emojiMap[noteCategory] || "💡";
    }
}

module.exports = new IconFetcher();