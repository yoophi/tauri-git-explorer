use std::process::Command;

use crate::{
    application::ports::{GitHistoryReader, GitRepositoryValidator},
    domain::commit::GitCommitSummary,
};

pub struct GitCliRepositoryValidator;

impl GitRepositoryValidator for GitCliRepositoryValidator {
    fn validate_repository(&self, path: &str) -> Result<String, String> {
        let output = Command::new("git")
            .args(["-C", path, "rev-parse", "--show-toplevel"])
            .output()
            .map_err(|error| format!("Failed to run git: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if stderr.is_empty() {
                "Path is not a Git repository.".to_string()
            } else {
                stderr
            });
        }

        let git_root = String::from_utf8(output.stdout)
            .map_err(|error| format!("Git returned invalid UTF-8: {error}"))?
            .trim()
            .to_string();

        if git_root.is_empty() {
            return Err("Git repository root could not be resolved.".to_string());
        }

        Ok(git_root)
    }
}

impl GitHistoryReader for GitCliRepositoryValidator {
    fn list_history(&self, repository_path: &str) -> Result<Vec<GitCommitSummary>, String> {
        let output = Command::new("git")
            .args([
                "-C",
                repository_path,
                "log",
                "--max-count=100",
                "--pretty=format:%H%x00%s%x00%an%x00%cI%x1e",
            ])
            .output()
            .map_err(|error| format!("Failed to run git: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
            return Err(if stderr.is_empty() {
                "Failed to list Git history.".to_string()
            } else {
                stderr
            });
        }

        let stdout = String::from_utf8(output.stdout)
            .map_err(|error| format!("Git returned invalid UTF-8: {error}"))?;

        parse_commit_history(&stdout)
    }
}

fn parse_commit_history(output: &str) -> Result<Vec<GitCommitSummary>, String> {
    output
        .split('\x1e')
        .filter(|record| !record.trim().is_empty())
        .map(|record| {
            let fields = record
                .trim_start_matches('\n')
                .split('\0')
                .collect::<Vec<_>>();

            if fields.len() != 4 {
                return Err(format!("Git history output is invalid: {record}"));
            }

            Ok(GitCommitSummary::new(
                fields[0].to_string(),
                fields[1].to_string(),
                fields[2].to_string(),
                fields[3].to_string(),
            ))
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_commit_history() {
        let output = "\
abc123\0Initial commit\0A Developer\02026-06-25T00:00:00+09:00\x1e
def456\0Add feature\0B Developer\02026-06-25T01:00:00+09:00\x1e";

        let commits = parse_commit_history(output).expect("history should parse");

        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].hash, "abc123");
        assert_eq!(commits[0].message, "Initial commit");
        assert_eq!(commits[1].author, "B Developer");
    }
}
