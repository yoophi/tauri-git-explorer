use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    adapters::outbound::{
        git_cli::GitCliRepositoryValidator, json_repository_store::JsonRepositoryStore,
    },
    application::history_service::HistoryService,
    application::repository_service::RepositoryService,
    domain::{commit::GitCommitSummary, repository::Repository},
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    name: String,
    version: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepositoryRequest {
    path: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListHistoryRequest {
    repository_id: String,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        name: env!("CARGO_PKG_NAME").to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
pub fn list_repositories(app: AppHandle) -> Result<Vec<Repository>, String> {
    repository_service(app)?.list_repositories()
}

#[tauri::command]
pub fn create_repository(
    app: AppHandle,
    request: CreateRepositoryRequest,
) -> Result<Repository, String> {
    repository_service(app)?.create_repository(request.path)
}

#[tauri::command]
pub fn list_history(
    app: AppHandle,
    request: ListHistoryRequest,
) -> Result<Vec<GitCommitSummary>, String> {
    history_service(app)?.list_history(request.repository_id)
}

fn repository_service(
    app: AppHandle,
) -> Result<RepositoryService<JsonRepositoryStore, GitCliRepositoryValidator>, String> {
    let store = repository_store(app)?;
    let validator = GitCliRepositoryValidator;

    Ok(RepositoryService::new(store, validator))
}

fn history_service(
    app: AppHandle,
) -> Result<HistoryService<JsonRepositoryStore, GitCliRepositoryValidator>, String> {
    let store = repository_store(app)?;
    let reader = GitCliRepositoryValidator;

    Ok(HistoryService::new(store, reader))
}

fn repository_store(app: AppHandle) -> Result<JsonRepositoryStore, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

    Ok(JsonRepositoryStore::new(
        app_data_dir.join("repositories.json"),
    ))
}
