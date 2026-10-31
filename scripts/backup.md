# Backup (weekly, or "back up the app data")

Audio is never backed up (it can be re-downloaded from the source URL).

1. For each collection in `words, essays, submissions, highlights, episodes, news, literature, inbox, daily`:
   ArtifactData `list` with `url: https://claude.ai/artifact/5c81mtfKm7dcCxmmjR2F7R`, `query.limit: 1000`, and `out_dir: backups/<YYYY-MM-DD>` (follow `next_cursor` if present).
   This writes `backups/<date>/<collection>/<id>.json` without passing the data through the conversation.
2. Skip `dict` (a lookup cache; it rebuilds itself).
3. Commit: `git add backups/<date> && git commit -m "Backup <date>"` and push.
4. Keep the last 8 weekly backups; delete older `backups/<date>` folders in the same commit.

Restore: read the JSON files and write them back with ArtifactData `batch` (50 per call, no `if_version` for documents that no longer exist).
