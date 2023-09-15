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

            const fileId = file.getFileId()
            const languageId = editor.document.languageId;

            const selection = editor.selection;
            const noteText = await vscode.window.showInputBox({ prompt: 'Enter your note:' });

            if (noteText) {
                const startLine = selection.start.line;
                const endLine = selection.end.line;
                const codeRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
                const selectedCode = editor.document.getText(codeRange);
                const title = noteText.substring(0, 40) + (noteText.length > 40 ? "..." : "");

                const noteId = await dbService.insertNote(title, noteText, selectedCode, startLine, endLine, languageId, fileId);
                vscode.window.showInformationMessage('Snip Notes: Note succesfully created!');
                return noteId;
            }
        }
    }

    async updateNote(updatedNote) {
        if (updatedNote.note_text) {
            await dbService.updateNote(updatedNote);
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

    updateCategory(category) {
        dbService.updateNoteCategory(this.rightClickedNoteId, category);
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }

}

module.exports = new NoteManager();
