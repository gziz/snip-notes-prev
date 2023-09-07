const vscode = require('vscode');
const path = require('path');

const dbService = require('../db/databaseService');

let workspaceName = null;
let workspaceId = null;

function updateWorkspaceName(newPath) {
  workspaceName = newPath;
}

function getWorkspacePath() {
  return workspaceName;
}

function updateWorkspaceID(id) {
  workspaceId = id;
}

function getWorkspaceId() {
  return workspaceId;
}

async function loadWorkspace() {
  if (!isInWorkspace()) return;
  const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspacePath);
  let workspaceId = dbService.getWorkspaceIdByName(workspaceName);
  if (!workspaceId) {
    dbService.insertWorkspace(workspaceName, workspacePath);
    workspaceId = dbService.getWorkspaceIdByName(workspaceName);
  }
  updateWorkspaceName(workspaceName);
  updateWorkspaceID(workspaceId);
}

function isWorkspaceRegistered() {
  if (!isInWorkspace()) return;
  const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const workspaceName = path.basename(workspacePath);
  const workspaceId = dbService.getWorkspaceIdByName(workspaceName);
  return workspaceId != null;
}

function isInWorkspace(warning=false) {
  if (vscode.workspace.workspaceFolders !== undefined) return true;
  if (warning) {
    vscode.window.showInformationMessage('Snip Notes: You must be in a workspace for Snip Notes to be active!');
  }
  return false;
}

module.exports = {
  updateWorkspaceName,
  getWorkspacePath,
  updateWorkspaceID,
  getWorkspaceId,
  loadWorkspace,
  isWorkspaceRegistered,
  isInWorkspace
};
