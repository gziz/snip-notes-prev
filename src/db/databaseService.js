const vscode = require('vscode');
const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

let SQL;
let dbInstance;
let dbFilePath = path.join( __dirname, '../../snip-notes.sqlite');

async function initializeSQLJs() {
    if (!SQL) {
        try {
            SQL = await initSqlJs();
        } catch (error) {
            throw new Error("Failed to initialize sql.js: " + error.message);
        }
    }
    return SQL;
}

function loadDatabase() {
    if (!SQL) {
        return vscode.window.showErrorMessage("sql.js initializing, try your command again!");
    }
    if (!dbInstance) {
        console.log("Loading DB from memory");
        if (fs.existsSync(dbFilePath)) {
            dbInstance = new SQL.Database(fs.readFileSync(dbFilePath));
        } else {
            dbInstance = new SQL.Database();
        }
    }
    return dbInstance;
}

function saveDatabase(db) {
    const updatedData = db.export();
    const updatedBuffer = Buffer.from(updatedData);
    fs.writeFileSync(dbFilePath, updatedBuffer);
}

/* CRUD Operations for workspaces */
function insertWorkspace(name, path) {
    const db = loadDatabase();
    db.run("INSERT INTO workspaces (name, path) VALUES (?, ?);", [name, path]);
    saveDatabase(db);
}

function getWorkspaceById(id) {
    const db = loadDatabase();
    return db.exec(`SELECT * FROM workspaces WHERE id = ${id};`);
}

function getWorkspaceIdByName(name, path) {
    const db = loadDatabase();
    const stmt = db.prepare("SELECT * FROM workspaces WHERE name = $name");
    const res = stmt.getAsObject({$name:name})
    return res.id
}

function deleteWorkspace(id) {
    const db = loadDatabase();
    const stmt = db.prepare("DELETE FROM workspaces WHERE id = ?;");
    stmt.run(id);
    saveDatabase(db);
}

/* CRUD Operations for files */
function insertFile(relativePath, workspaceId) {
    const db = loadDatabase();
    db.run("INSERT INTO files (relative_path, workspace_id) VALUES (?, ?);", [relativePath, workspaceId]);
    saveDatabase(db);
}

// function getFileById(id) {
//     const db = loadDatabase();
//     return db.exec(`SELECT * FROM files WHERE id = ${id};`);
// }

function getFileIdByPath(relativePath, workspaceId) {

    const db = loadDatabase();
    const stmt = db.prepare("SELECT * FROM files WHERE relative_path = $relative_path");
    const res = stmt.getAsObject({$relative_path:relativePath})
    if (!res.id) {
        insertFile(relativePath, workspaceId);
        return getFileIdByPath(relativePath, workspaceId);
    }
    return res.id
}

function updateFileName(id, newName) {
    const db = loadDatabase();
    const stmt = db.prepare("UPDATE files SET name = ? WHERE id = ?;");
    stmt.run(newName, id);
    saveDatabase(db);
}

function deleteFile(id) {
    const db = loadDatabase();
    const stmt = db.prepare("DELETE FROM files WHERE id = ?;");
    stmt.run(id);
    saveDatabase(db);
}

/* CRUD Operations for notes */
async function insertNote(note_text, code_text, start_line, end_line, file_id) {
    const db = loadDatabase();
    db.run("INSERT INTO notes (note_text, code_text, start_line, end_line, file_id) VALUES (?, ?, ?, ?, ?);",
        [note_text, code_text, start_line, end_line, file_id]);
    
    const rowId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
    saveDatabase(db);
    return rowId;
}

function getNoteById(id) {
    const db = loadDatabase();
    return db.exec(`SELECT * FROM notes WHERE id = ${id};`);
}

function getNoteByLine(line, fileId) {
    const db = loadDatabase();
    const stmt = db.prepare("SELECT * FROM notes WHERE file_id = $file_id AND $line BETWEEN start_line AND end_line;");
    const res = stmt.getAsObject({$file_id:fileId, $line:line})
    if (res.id) { 
        return res.note_text;
    }
    return null;
}

function getAllFileNotes(fileId) {
    const db = loadDatabase();
    const stmt = db.prepare("SELECT * FROM notes WHERE file_id = $file_id");
    stmt.bind({$file_id:fileId})
    const rows = [];
    while(stmt.step()) {
        const row = stmt.getAsObject();
        rows.push(row);
      }
    return rows;
}

async function updateNote(newNote) {
    const db = loadDatabase();
    db.run("UPDATE notes SET note_text = ?, code_text = ?, start_line = ?, end_line = ?, file_id = ? WHERE id = ?;",
        [newNote.note_text, newNote.code_text, newNote.start_line, newNote.end_line, newNote.file_id, newNote.id]);
    saveDatabase(db);
}

function deleteNote(id) {
    const db = loadDatabase();
    db.run("DELETE FROM notes WHERE id = ?;", [id]);
    saveDatabase(db);
}


module.exports = {
    dbFilePath,
    initializeSQLJs,
    loadDatabase,
    saveDatabase,
    insertWorkspace,
    getWorkspaceById,
    getWorkspaceIdByName,
    deleteWorkspace,
    getFileIdByPath,
    insertNote,
    updateNote,
    deleteNote,
    getNoteByLine,
    getAllFileNotes,
};