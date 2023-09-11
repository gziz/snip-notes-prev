const vscode = require('vscode');
const file = require('./managers/fileManager');
const dbService = require('./db/databaseService');
const notes = require('./managers/noteManager');

class NotesProvider {

    static viewType = 'snipNotes.webView';

    constructor(extensionUri) {
        this._extensionUri = extensionUri;
    }
    
    resolveWebviewView(webviewView) {
        this.initializeWebview(webviewView);
        this.listenForWebviewMessages(webviewView);
    }

    initializeWebview(webviewView) {
        this._view = webviewView;
		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};
		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    listenForWebviewMessages(webviewView) {
        webviewView.webview.onDidReceiveMessage(message => {
            switch (message.type) {
                case "noteClicked": 
                    this.handleNoteClicked(message.value);
                    break;
                case "refreshNotes":
                    this.refreshNotes();
                    break;
                case "noteUpdated":
                    notes.updateNote(message.updatedNote);
                    break;
                case "rightClickedNote":
                    notes.setRightClickNote(message.noteId);
                    break;
            }
        });
    }

    handleNoteClicked(lineNumber) {
        if (lineNumber != null) {
            let editor = vscode.window.activeTextEditor;
            let targetLine = new vscode.Position(lineNumber, 0);
            editor.selection = new vscode.Selection(targetLine, targetLine);
            editor.revealRange(new vscode.Range(targetLine, targetLine));
        }
    }

    focusWebview() {
        if (this._view) {
            this._view.show(true);
        }
    }

	_getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));
        const scriptPrismUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'prism.js'));
        const stylePrismUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'prism.css'));

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Snip Notes</title>
            <link href="${styleMainUri}" rel="stylesheet">
            <link href="${stylePrismUri}" rel="stylesheet">
        </head>
        <body>
            <input class="note-search-bar" type="text" placeholder="Search notes..." />
            <div class="notes-div"></div>
            <script src="${scriptUri}"></script>
            <script src="${scriptPrismUri}"></script>
        </body>
        </html>`;
	}

    async refreshNotes(newNoteId = null) {
        if (this._view) {
            await file.loadCurrFileNotes();
            const currFileNotes = file.getCurrFileNotes();
            this._view.webview.postMessage({ type: 'refreshNotes' , notes: currFileNotes, newNoteId: newNoteId });
        }
    }

    async deleteNote() {
        dbService.deleteNote();
    }
}

module.exports = NotesProvider;
