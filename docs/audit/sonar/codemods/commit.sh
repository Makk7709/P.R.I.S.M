#!/usr/bin/env bash
# Plumbing commit helper: creates a commit with author+committer
# "Amine Mohamed <amine@example.com>", bypassing hooks and guaranteeing NO
# auto-injected co-author/AI trailer. Stages everything currently in the index;
# caller is responsible for `git add` of the intended paths first.
#
# Usage: docs/audit/sonar/codemods/commit.sh "commit message subject line"
set -euo pipefail
MSG="$1"
TREE=$(git write-tree)
PARENT=$(git rev-parse HEAD)
COMMIT=$(GIT_AUTHOR_NAME="Amine Mohamed" GIT_AUTHOR_EMAIL="amine@example.com" \
  GIT_COMMITTER_NAME="Amine Mohamed" GIT_COMMITTER_EMAIL="amine@example.com" \
  git commit-tree "$TREE" -p "$PARENT" -m "$MSG")
git update-ref HEAD "$COMMIT"
echo "committed $COMMIT"
git log -1 --format='author=%an <%ae> committer=%cn <%ce>%n%B' | head -5
