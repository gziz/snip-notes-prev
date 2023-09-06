const path = require('path');
const vscode = require('vscode');
const workspace = require('./workspaceHandlers');
const dbService = require('../db/databaseService');

let fileRelativePath = null;
let fileId = null;
let currFileNotes = null;

function updateFileRelativePath(relativePath) {
    fileRelativePath = relativePath;
}

function getFileRelativePath() {
  return fileRelativePath;
}

function updateFileID(id) {
  fileId = id;
}

function getFileId() {
  return fileId;
}

function updateCurrFileNotes(newFileNotes) {
    currFileNotes = newFileNotes;
}

async function loadCurrFileNotes() {
  const fileId = getFileId();
  const newFileNotes = dbService.getAllFileNotes(fileId);
  updateCurrFileNotes(newFileNotes);
}

function getCurrFileNotes() {
    return currFileNotes;
}

async function loadCurrFile() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        const workspacePath = workspace.getWorkspacePath();
        const workspaceId = workspace.getWorkspaceId();

        let relativeFilePath = path.relative(workspacePath, editor.document.fileName);
        let fileId = dbService.getFileIdByPath(relativeFilePath, workspaceId);
        let newFileNotes = dbService.getAllFileNotes(fileId);

        updateFileRelativePath(relativeFilePath);
        updateFileID(fileId);
        updateCurrFileNotes(newFileNotes);
    }
}

module.exports = {
    updateFileRelativePath,
    getFileRelativePath,
    updateFileID,
    getFileId,
    updateCurrFileNotes,
    getCurrFileNotes,
    loadCurrFile,
    loadCurrFileNotes
};
