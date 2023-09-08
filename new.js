
const vscode = require('vscode');
const dbService = require('./db/databaseService');
const schemas = require('./db/schemas');
const workspace = require('./handlers/workspaceHandlers');
const notes = require('./handlers/notesHandlers');
const file = require('./handlers/fileHandlers');
const NotesProvider = require('./noteProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    try {
        await dbService.initializeSQLJs();
        await schemas.isDbExistent();
    } catch (error) {
        vscode.window.showErrorMessage("Failed to initialize extension: " + error.message);
        return;
    }

    const provider = new NotesProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(NotesProvider.viewType, provider));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.createNote', async () => {  
        try {
            await notes.prepareToCreateNote();
            const newNoteId = await notes.createNote();
            await file.loadCurrFileNotes();
            provider.focusWebview();
            provider.refreshNotes(newNoteId);
        } catch (error) {
            vscode.window.showErrorMessage("Failed to create note: " + error.message);
        }
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.refreshNotes', () => {  
        provider.refreshNotes();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.deleteNote', async () => {  
        try {
            await notes.deleteNote();
        } catch (error) {
            vscode.window.showErrorMessage("Failed to delete note: " + error.message);
        }
    }));

    vscode.window.onDidChangeActiveTextEditor(async () => {
        if (!workspace.isInWorkspace()) return;
        try {
            await file.loadCurrFile();
            provider.refreshNotes();
        } catch (error) {
            vscode.window.showErrorMessage("Failed to load file: " + error.message);
        }
    });

    if (!workspace.isInWorkspace()) return;
    try {
        await dbService.initializeSQLJs();
        if (!workspace.isWorkspaceRegistered()) {
            return;
        }
        await workspace.loadWorkspace();
        await file.loadCurrFile();
    } catch (error) {
        vscode.window.showErrorMessage("Failed to activate extension: " + error.message);
    }
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
}


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
        throw new Error("sql.js is not initialized");
    }
    if (!dbInstance) {
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

// ... rest of the code is the same ...


//workspaceHandlers.js:

const vscode = require('vscode');
const path = require('path');
const dbService = require('../db/databaseService');

class Workspace {
    constructor() {
        this.workspaceName = null;
        this.workspaceId = null;
    }

    updateWorkspaceName(newPath) {
        this.workspaceName = newPath;
    }

    getWorkspacePath() {
        return this.workspaceName;
    }

    updateWorkspaceID(id) {
        this.workspaceId = id;
    }

    getWorkspaceId() {
        return this.workspaceId;
    }

    async loadWorkspace() {
        if (!this.isInWorkspace()) return;
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const workspaceName = path.basename(workspacePath);
        let workspaceId = dbService.getWorkspaceIdByName(workspaceName);
        if (!workspaceId) {
            dbService.insertWorkspace(workspaceName, workspacePath);
            workspaceId = dbService.getWorkspaceIdByName(workspaceName);
        }
        this.updateWorkspaceName(workspaceName);
        this.updateWorkspaceID(workspaceId);
    }

    isWorkspaceRegistered() {
        if (!this.isInWorkspace()) return;
        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const workspaceName = path.basename(workspacePath);
        const workspaceId = dbService.getWorkspaceIdByName(workspaceName);
        return workspaceId != null;
    }

    isInWorkspace(warning=false) {
        if (vscode.workspace.workspaceFolders !== undefined) return true;
        if (warning) {
            vscode.window.showInformationMessage('Snip Notes: You must be in a workspace for Snip Notes to be active!');
        }
        return false;
    }
}

module.exports = new Workspace();


//fileHandlers.js:

const path = require('path');
const vscode = require('vscode');
const workspace = require('./workspaceHandlers');
const dbService = require('../db/databaseService');

class File {
    constructor() {
        this.fileRelativePath = null;
        this.fileId = null;
        this.currFileNotes = null;
    }

    updateFileRelativePath(relativePath) {
        this.fileRelativePath = relativePath;
    }

    getFileRelativePath() {
        return this.fileRelativePath;
    }

    updateFileID(id) {
        this.fileId = id;
    }

    getFileId() {
        return this.fileId;
    }

    updateCurrFileNotes(newFileNotes) {
        this.currFileNotes = newFileNotes;
    }

    async loadCurrFileNotes() {
        const fileId = this.getFileId();
        const newFileNotes = dbService.getAllFileNotes(fileId);
        this.updateCurrFileNotes(newFileNotes);
    }

    getCurrFileNotes() {
        return this.currFileNotes;
    }

    async loadCurrFile() {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            const workspacePath = workspace.getWorkspacePath();
            const workspaceId = workspace.getWorkspaceId();

            let relativeFilePath = path.relative(workspacePath, editor.document.fileName);
            let fileId = dbService.getFileIdByPath(relativeFilePath, workspaceId);
            let newFileNotes = dbService.getAllFileNotes(fileId);

            this.updateFileRelativePath(relativeFilePath);
            this.updateFileID(fileId);
            this.updateCurrFileNotes(newFileNotes);
        }
    }
}

module.exports = new File();


//notehandlers.js:

const vscode = require('vscode');
const path = require('path');
const workspace = require('./workspaceHandlers');
const dbService = require('../db/databaseService');
const file = require('./fileHandlers');

class Note {
    constructor() {
        this.rightClickedNoteId = null;
    }

    async createNote() {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let relativeFilePath = file.getFileRelativePath();
            let fileId = file.getFileId();

            let selection = editor.selection;
            let noteText = await vscode.window.showInputBox({ prompt: 'Enter your note:' });
            
            if (noteText) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;
                let codeRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
                let selectedCode = editor.document.getText(codeRange);

                const noteId = await dbService.insertNote(noteText, selectedCode, startLine, endLine, fileId);
                vscode.window.showInformationMessage('Snip Notes: Note succesfully created!');
                return noteId;
            }
        }
    }

    // ... rest of the code is the same ...
}

module.exports = new Note();
