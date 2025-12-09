import git
from pathlib import Path

def is_git_repo(path: Path) -> bool:
    try:
        _ = git.Repo(path).git_dir
        return True
    except git.InvalidGitRepositoryError:
        return False

