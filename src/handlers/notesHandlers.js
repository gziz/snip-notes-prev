const vscode = require('vscode');
const path = require('path');
const workspace = require('./workspaceHandlers');
const dbService = require('../db/databaseService');
const file = require('./fileHandlers');

const createNote = async () => {

    let editor = vscode.window.activeTextEditor;
    if (editor) {
        
        let relativeFilePath = file.getFileRelativePath()
        let fileId = file.getFileId()

        let selection = editor.selection;
        let note = await vscode.window.showInputBox({ prompt: 'Enter your note' });
        
        if (note) {
            let startLine = selection.start.line
            let endLine = selection.end.line;
            let codeRange = new vscode.Range(startLine, 0, endLine, editor.document.lineAt(endLine).text.length);
            let selectedCode = editor.document.getText(codeRange);
            dbService.insertNote(note, selectedCode, startLine, endLine, fileId);
            vscode.window.showInformationMessage('Note succesfully created!');
        }
    }
}

const prepareToCreateNote = async () => {
    if (!workspace.isInWorkspace()) return;
    if (!workspace.isWorkspaceRegistered()) {
        await workspace.loadWorkspace();
        await file.loadCurrFile();
    }
}


const hoverProvider = {
    provideHover(document, position, token) {
        let line = position.line;
        const fileId = file.getFileId();
        const noteText = dbService.getNoteByLine(line, fileId);
        if(noteText) {
            return new vscode.Hover(noteText);
        }
    }
}

module.exports = {
    createNote,
    hoverProvider,
    prepareToCreateNote,
};