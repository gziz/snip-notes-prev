const vscode = require('vscode');
const path = require('path');
const dbService = require('./db/databaseService');
const workspace = require('./managers/workspaceManager');
const fileManager = require('./managers/fileManager');
const icons = require('./icons');

class NoteTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, id, contextValue, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.id = id;
        this.contextValue = contextValue;
        this.command = command ? command : null;
        this.children = [];
    }
}

class NoteTreeProvider {
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element) {
        if (element.contextValue === "directory") {
            element.iconPath = vscode.ThemeIcon.Folder;
        } else if (element.contextValue === "file") {
            element.iconPath = vscode.ThemeIcon.File;
        }
        return element;
    }

    async getChildren(element) {
        if (element) {
            return element.children;
        } else {
            return this.buildRoot();
        }
    }

    async buildRoot() {
        const workspaceId = workspace.getWorkspaceId();
        const files = await dbService.getFilesFromWorkspaceId(workspaceId);
        const root = await this.buildHierarchy(files);
        return this.compressPath(root);
    }

    async getFileChildren(fileObj) {
        const notes = await dbService.getNotesFromFileId(fileObj.id);
        const notesChildren = [];
        for (const note of notes) {
            // @ts-ignore
            const noteLabel = icons.getEmoji(note.category) + " " + note.title.substring(0, 50) + (note.title.length > 50 ? "..." : "");
            const noteItem = new NoteTreeItem(
                noteLabel,
                vscode.TreeItemCollapsibleState.None,
                `note-${note.id}`,
                "note",
                this.focusOnNoteCommand(fileObj, note));
            notesChildren.push(noteItem);
        }
        return notesChildren;
    }

    async buildHierarchy(files) {
        const root = [];
    
        for (const file of files) {
            const notesChildren = await this.getFileChildren(file);
            if (notesChildren.length == 0) {
                continue;
            }
            const parts = file.relative_path.split('/');
            let currentChildren = root;
    
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
    
                let directoryItem = currentChildren.find(item => item.label === part);
    
                if (!directoryItem) {
                    directoryItem = new NoteTreeItem(part, vscode.TreeItemCollapsibleState.Collapsed, undefined, 'directory');
                    currentChildren.push(directoryItem);
                }

                currentChildren = directoryItem.children;
            }
    
            const fileName = parts[parts.length - 1];
            const fileExists = fileManager.isFileInDb(file.relative_path);
            const fileUri = vscode.Uri.file(path.join(this.workspaceRoot, file.relative_path));

            const fileItem = new NoteTreeItem(fileName, vscode.TreeItemCollapsibleState.Expanded, `file-${file.id}`, 'file', this.openFileCommand(file))

            fileItem.children = notesChildren;
            currentChildren.push(fileItem);
        }
        return root;
    }

    compressPath(root) {
        for (let i = 0; i < root.length; i++) {
            const node = root[i];
    
            // If the node is a directory and has only one child which is also a directory, compress the path.
            while (node.contextValue === 'directory' && node.children.length === 1 && node.children[0].contextValue === 'directory') {
                const childNode = node.children[0];
                node.label += '/' + childNode.label;
                node.children = childNode.children;
            }
    
            // Recursively process children nodes.
            if (node.children && node.children.length > 0) {
                this.compressPath(node.children);
            }
        }
        return root;
    }
    openFileCommand(fileObj){
        return {
            command: 'snip-notes.openFile',
            title: '',
            arguments: [fileObj.relative_path]
        };
    }

    focusOnNoteCommand(fileObj, noteObj) {
        return {
            command: 'snip-notes.focusOnNote',
            title: '',
            arguments: [fileObj.relative_path, noteObj.id]
        };
    }
}
module.exports = NoteTreeProvider;