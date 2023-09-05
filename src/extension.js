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

    const hasBeenInitialized = context.globalState.get('snipNotesInitialized', false);
    if (!hasBeenInitialized) {
        await dbService.initializeSQLJs();
        await schemas.initializeTables();
        context.globalState.update('snipNotesInitialized', true);
    }

    /* Providers */
    const provider = new NotesProvider(context.extensionUri);
    context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(NotesProvider.viewType, provider));

    /* Commands */
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.initTables', async function () {
        schemas.initializeTables();
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.createNote', async function () {  
        await notes.prepareToCreateNote();
        await notes.createNote();
        await file.loadCurrFileNotes();
        provider.updateNotes();

    }));

    vscode.window.onDidChangeActiveTextEditor(async () => {
        setTimeout(async () => {
            await file.loadCurrFile();
            provider.updateNotes();
        }, 100);
    });
    

    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
        activateHelper();
    });

    /* Processes to run when activating */
    activateHelper();

    async function activateHelper() {
        if (!workspace.isInWorkspace()) return;
    
        await dbService.initializeSQLJs();
        if (!workspace.isWorkspaceRegistered()) {
            vscode.window.showInformationMessage('Seems like this workspace is not registered in SnipNotes!');
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
