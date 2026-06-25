import { invoke } from "@tauri-apps/api/core";

export type AppInfo = {
  name: string;
  version: string;
};

export type Repository = {
  id: string;
  name: string;
  path: string;
};

export type GitCommitSummary = {
  hash: string;
  message: string;
  author: string;
  date: string;
};

export const repositoryKeys = {
  all: ["repositories"] as const,
  history: (repositoryId: string) => ["repositories", repositoryId, "history"] as const,
};

export function getAppInfo() {
  return invoke<AppInfo>("app_info");
}

export function listRepositories() {
  return invoke<Repository[]>("list_repositories");
}

export function createRepository(path: string) {
  return invoke<Repository>("create_repository", {
    request: {
      path,
    },
  });
}

export function listHistory(repositoryId: string) {
  return invoke<GitCommitSummary[]>("list_history", {
    request: {
      repositoryId,
    },
  });
}
