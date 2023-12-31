const path = require('path');
const vscode = require('vscode');
const workspace = require('./workspaceManager');
const dbService = require('../db/databaseService');
const fs = require('fs');

class FileManager {
  constructor() {
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
    if (!this.getFileId()) return
    const fileId = this.getFileId();
    const newFileNotes = await dbService.getNotesFromFileId(fileId);
    this.updateCurrFileNotes(newFileNotes);
  }

  getCurrFileNotes() {
    return this.currFileNotes ? this.currFileNotes : [];
  }

  isFileInDb(relativeFilePath) {
    const workspacePath = workspace.getWorkspacePath();
    const absolutePath = path.join(workspacePath, relativeFilePath);
    return fs.existsSync(absolutePath);
  }

  async loadCurrFile(insertIfNotExists=false) {
      let editor = vscode.window.activeTextEditor;
      if (editor) {
          const workspaceId = workspace.getWorkspaceId();

          const relativeFilePath = vscode.workspace.asRelativePath(editor.document.uri);
          const fileId = dbService.getFileIdByPath(relativeFilePath, workspaceId, insertIfNotExists);
          this.updateFileID(fileId);
          if (fileId) {
            let newFileNotes = dbService.getNotesFromFileId(fileId);
            this.updateCurrFileNotes(newFileNotes);
          }
          else {
            this.updateCurrFileNotes([]);
          }
      }
  }
}

module.exports = new FileManager();