const vscode = require('vscode');
const dbService = require('./db/databaseService');
const schemas = require('./db/schemas');
const workspace = require('./managers/workspaceManager');
const notes = require('./managers/noteManager');
const file = require('./managers/fileManager');
const NotesProvider = require('./noteProvider');
const NoteTreeProvider = require('./noteTreeProvider');

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    dbService.setGlobalStoragePath(context.globalStorageUri);
    await dbService.initializeSQLJs();
    await schemas.isDbExistent();

    /* Providers */
    const provider = new NotesProvider(context.extensionUri);
    context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(NotesProvider.viewType, provider));

    const workspaceRoot = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
    const treeDataProvider = new NoteTreeProvider(workspaceRoot);
    vscode.window.createTreeView('snipNotes.treeView', 
        {treeDataProvider: treeDataProvider, showCollapseAll: true});

    /* Commands */    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.createNote', async function () {  
        await notes.prepareToCreateNote();
        const newNoteId = await notes.createNote();
        provider.focusWebview();
        provider.refreshNotes(newNoteId);
        treeDataProvider.refresh();
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.refreshNotes', async function () {  
        provider.refreshNotes();
        treeDataProvider.refresh();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.deleteNote', async function () {  
        notes.deleteNote();
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.updateNoteCategoryToNote', async function (event) {  
        notes.updateCategory('note')
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.updateNoteCategoryToTodo', async function (event) {  
        notes.updateCategory('todo')
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('snip-notes.updateNoteCategoryToFix', async function (event) {  
        notes.updateCategory('fix')
        vscode.commands.executeCommand('snip-notes.refreshNotes');
    }));

    /* Listeners */
    vscode.window.onDidChangeActiveTextEditor(async () => {
        if (!workspace.isInWorkspace() || !workspace.getWorkspaceId()) return;
            await file.loadCurrFile();
            provider.refreshNotes();
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
