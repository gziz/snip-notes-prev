const vscode = require('vscode');
const path = require('path');
const workspace = require('./workspaceManager');
const dbService = require('../db/databaseService');
const file = require('./fileManager');

class NoteManager {
    constructor() {
        this.rightClickedNoteId = null;
    }

    async createNote() {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            
            let relativeFilePath = file.getFileRelativePath()
            let fileId = file.getFileId()

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

    async updateNote(newNote) {
        if (newNote.note_text) {
            await dbService.updateNote(newNote);
            vscode.window.showInformationMessage('Snip Notes: Note succesfully updated!');
            vscode.commands.executeCommand('snip-notes.refreshNotes');
        }
    }

    async prepareToCreateNote() {
        if (!workspace.isInWorkspace(true)) return;
        if (!workspace.isWorkspaceRegistered()) {
            await workspace.loadWorkspace();
        }
        await file.loadCurrFile(true);
    }

    hoverProvider = {
        provideHover(document, position, token) {
            let line = position.line;
            const fileId = file.getFileId();
            const noteText = dbService.getNoteTextFromLine(line, fileId);
            if(noteText) {
                return new vscode.Hover(noteText);
            }
        }
    }

    setRightClickNote(noteId) {
        this.rightClickedNoteId = noteId;
    }

    deleteNote() {
        dbService.deleteNote(this.rightClickedNoteId);
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }
}

module.exports = new NoteManager();
