const vscode = require('vscode');
const path = require('path');
const dbService = require('../db/databaseService');

class WorkspaceManager {
  constructor() {
    this.workspaceName = null;
    this.workspacePath = null;
    this.workspaceId = null;
  }

  getWorkspacePath() {
    return this.workspacePath;
  }

  getWorkspaceNmae() {
    return this.workspaceName;
  }
  getWorkspaceId() {
    return this.workspaceId;
  }

  updateWorkspaceName(name) {
    this.workspaceName = name;
  }
  updateWorkspacePath(path) {
    this.workspacePath = path;
  }
  updateWorkspaceID(id) {
    this.workspaceId = id;
  }

  async loadWorkspace() {
    if (!this.isInWorkspace()) return;

    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const workspaceName = vscode.workspace.name;
    let workspaceId = dbService.getWorkspaceIdByName(workspaceName);
    
    if (!workspaceId) {
      dbService.insertWorkspace(workspaceName, workspacePath);
      workspaceId = dbService.getWorkspaceIdByName(workspaceName);
    }
    this.updateWorkspaceName(workspaceName);
    this.updateWorkspacePath(workspacePath);
    this.updateWorkspaceID(workspaceId);
  }

  isWorkspaceRegistered() {
    if (!this.isInWorkspace()) return;

    const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const workspaceName = vscode.workspace.name;
    const workspaceId = dbService.getWorkspaceIdByName(workspaceName);
    
    return workspaceId != null;
  }

  isInWorkspace(warning = false) {
    if (vscode.workspace.workspaceFolders !== undefined) return true;
    
    if (warning) {
      vscode.window.showInformationMessage('Snip Notes: You must be in a workspace for Snip Notes to be active!');
    }
    return false;
  }
}

module.exports = new WorkspaceManager();
