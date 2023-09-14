const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

class DatabaseService {
    constructor() {
        this.SQL = null;
        this.dbInstance = null;
        this.dbFilePath = null;
    }

    setGlobalStoragePath(globalStorageUri) {
        const globalPath = globalStorageUri.path;
        if (!fs.existsSync( globalPath )){
            fs.mkdirSync( globalPath );
        }
        this.dbFilePath = path.join(globalPath, "db.sqlite");
    } 

    async initializeSQLJs() {
        if (!this.SQL) {
            try {
                this.SQL = await initSqlJs();
            } catch (error) {
                throw new Error("Failed to initialize sql.js: " + error.message);
            }
        }
        return this.SQL;
    }

    loadDatabase() {
        if (!this.dbInstance) {
            console.log("Loading DB from memory");
            if (fs.existsSync(this.dbFilePath)) {
                this.dbInstance = new this.SQL.Database(fs.readFileSync(this.dbFilePath));
            } else {
                this.dbInstance = new this.SQL.Database();
            }
        }
        return this.dbInstance;
    }

    saveDatabase(db) {
        const updatedData = db.export();
        const updatedBuffer = Buffer.from(updatedData);
        fs.writeFileSync(this.dbFilePath, updatedBuffer);
    }

    insertWorkspace(name, path) {
        const db = this.loadDatabase();
        db.run("INSERT INTO workspaces (name, path) VALUES (?, ?);", [name, path]);
        this.saveDatabase(db);
    }

    getWorkspaceIdByName(name, path) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM workspaces WHERE name = $name");
        const res = stmt.getAsObject({ $name: name });
        return res.id;
    }

    insertFile(relativePath, workspaceId) {
        const db = this.loadDatabase();
        db.run("INSERT INTO files (relative_path, workspace_id) VALUES (?, ?);", [relativePath, workspaceId]);
        this.saveDatabase(db);
    }

    getFileIdByPath(relativePath, workspaceId, insertIfNotExists) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM files WHERE relative_path = $relative_path");
        const res = stmt.getAsObject({ $relative_path: relativePath });
        if (!res.id && insertIfNotExists) {
            this.insertFile(relativePath, workspaceId);
            return this.getFileIdByPath(relativePath, workspaceId);
        }
        return res.id;
    }

    getPathByFileId(fileId) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM files WHERE id = $id");
        const res = stmt.getAsObject({ $id: fileId });
        if (res.id) {
            return res.relative_path
        }
        return "";
    }

    deleteFile(id) {
        const db = this.loadDatabase();
        const stmt = db.prepare("DELETE FROM files WHERE id = ?;");
        stmt.run(id);
        this.saveDatabase(db);
    }

    async insertNote(title, note_text, code_text, start_line, end_line, language_id, file_id) {
        const db = this.loadDatabase();
        db.run("INSERT INTO notes (title, note_text, code_text, start_line, end_line, language_id, file_id) VALUES (?, ?, ?, ?, ?, ?, ?);",
            [title, note_text, code_text, start_line, end_line, language_id, file_id]);
        const rowId = db.exec("SELECT last_insert_rowid() as id")[0].values[0][0];
        this.saveDatabase(db);
        return rowId;
    }

    getNoteById(id) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM notes WHERE id = ?;");
        const res = stmt.getAsObject([id]);
        return res;
    }

    getNoteTextFromLine(line, fileId) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM notes WHERE file_id = ? AND ? BETWEEN start_line AND end_line;");
        const res = stmt.getAsObject([fileId, line]);
        if (res.id) {
            return res.note_text.toString();
        }
        return "";
    }

    async getNotesFromFileId(fileId) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM notes WHERE file_id = ?");
        stmt.bind([fileId]);
        const rows = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            row.note_text = row.note_text.toString();
            rows.push(row);
        }
        return rows;
    }

    async getFilesFromWorkspaceId(workspaceId) {
        const db = this.loadDatabase();
        const stmt = db.prepare("SELECT * FROM files WHERE workspace_id = ?");
        stmt.bind([workspaceId]);
        const rows = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            rows.push(row);
        }
        return rows;
    }

    async updateNote(updatedNote) {
        const db = this.loadDatabase();
        db.run("UPDATE notes SET title = ?, note_text = ?, code_text = ?, start_line = ?, end_line = ?, file_id = ? WHERE id = ?;",
            [updatedNote.title, updatedNote.note_text, updatedNote.code_text, updatedNote.start_line, updatedNote.end_line, updatedNote.file_id, updatedNote.id]);
        this.saveDatabase(db);
    }

    deleteNote(id) {
        const db = this.loadDatabase();
        db.run("DELETE FROM notes WHERE id = ?;", [id]);
        this.saveDatabase(db);
    }

    updateNoteCategory(id, category) {
        const db = this.loadDatabase();
        db.run("UPDATE notes SET category = ? WHERE id = ?;",
            [category, id]);
        this.saveDatabase(db);
    }
}

module.exports = new DatabaseService();
