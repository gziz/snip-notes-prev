const fs = require('fs');
const dbService = require('./databaseService');

async function initializeTables() {
    const db = await dbService.loadDatabase();

    db.run(`CREATE TABLE IF NOT EXISTS workspaces (
        id INTEGER PRIMARY KEY, 
        name TEXT UNIQUE,
        path TEXT UNIQUE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY, 
        relative_path TEXT UNIQUE, 
        workspace_id INTEGER, 
        FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY, 
        note_text TEXT, 
        code_text TEXT,
        start_line INTEGER, 
        end_line INTEGER, 
        language_id TEXT,
        file_id INTEGER,
        FOREIGN KEY(file_id) REFERENCES files(id)
    )`);

    dbService.saveDatabase(db);
}

async function isDbExistent() {
    if (!fs.existsSync(dbService.dbFilePath)) {
        await initializeTables()
    }
}

module.exports = { 
    initializeTables,
    isDbExistent };