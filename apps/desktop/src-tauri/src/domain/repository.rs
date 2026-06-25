use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: String,
}

impl Repository {
    pub fn new(path: String, git_root: String) -> Self {
        let name = git_root
            .rsplit(std::path::MAIN_SEPARATOR)
            .find(|segment| !segment.is_empty())
            .unwrap_or(git_root.as_str())
            .to_string();

        Self {
            id: git_root.clone(),
            name,
            path,
        }
    }
}
