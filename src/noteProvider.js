const vscode = require('vscode');
const path = require('path');
const file = require('./handlers/fileHandlers');
const dbService = require('./db/databaseService');
const notes = require('./handlers/notesHandlers');
class NotesProvider {

    static viewType = 'snipNotesView';

    constructor(extensionUri) {
        this._extensionUri = extensionUri;
    }
    
    resolveWebviewView(webviewView) {
		this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		  };
        
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
		webviewView.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case "noteClicked": {
                    if (message.value != null) {

                        let editor = vscode.window.activeTextEditor;
                        let targetLine = new vscode.Position(message.value, 0);
                        editor.selection = new vscode.Selection(targetLine, targetLine);
                        editor.revealRange(new vscode.Range(targetLine, targetLine));
                    } 
                    break;
                }
                case "refreshNotes": {
                    this.refreshNotes();
                    break;
                }
                case "noteUpdated": {
                    notes.updateNote(message.newNote);
                    break;
                }
                case "rightClickedNote": {
                    notes.setRightClickNote(message.noteId);
                    break;
                }
            }
		});
    }

    focusWebview(){
        if (this._view) {
            this._view.show(true);  // this will force the webview to come into focus
        }
    }

	_getHtmlForWebview(webview) {
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">

            <title>Snip Notes</title>

            <link href="${styleMainUri}" rel="stylesheet">
        </head>
        <body>
            <h1>Snip Notes</h1>
            <input class="search-bar" type="text" placeholder="Search notes..." />

            <div class="notes-div">
            </div>
            <script src="${scriptUri}"></script>
        </body>
        </html>`;
	}

    async refreshNotes(newNoteId = null) {
        if (this._view) {
            await file.loadCurrFileNotes()
            const currFileNotes = file.getCurrFileNotes();
            this._view.webview.postMessage({ type: 'refreshNotes' , notes: currFileNotes , newNoteId: newNoteId });
        }
    }
    async deleteNote() {
        dbService.deleteNote()
    }
}

module.exports = NotesProvider;