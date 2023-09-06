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

    await dbService.initializeSQLJs();
    await schemas.isDbExistent();

    /* Providers */
    const provider = new NotesProvider(context.extensionUri);
    context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(NotesProvider.viewType, provider));


    /* Commands */    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.createNote', async function () {  
        await notes.prepareToCreateNote();
        const newNoteId = await notes.createNote();
        await file.loadCurrFileNotes();
        provider.focusWebview();
        provider.refreshNotes(newNoteId);
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.refreshNotes', async function () {  
        provider.refreshNotes();
    }));

    /* Listeners */
    vscode.window.onDidChangeActiveTextEditor(async () => {
        if (!workspace.isInWorkspace()) return;
        setTimeout(async () => {
            await file.loadCurrFile();
            provider.refreshNotes();
        }, 100);
    });

    /* Processes to run when activating */
    activateHelper();

    async function activateHelper() {
        if (!workspace.isInWorkspace()) return;
    
        await dbService.initializeSQLJs();
        if (!workspace.isWorkspaceRegistered()) {
            return;
        }
        await workspace.loadWorkspace();
        await file.loadCurrFile();

        context.subscriptions.push(
            vscode.languages.registerHoverProvider('*', notes.hoverProvider)
        );
    }
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
