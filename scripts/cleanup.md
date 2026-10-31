# Cleanup ("clean up old content")

The artifact database holds at most 5,000 documents and each asset is at most 20 MiB, so old content is pruned.

| What | Rule |
|---|---|
| news | keep 14 days; older documents deleted unless `saved: true` |
| literature | keep 30 days back plus everything ahead; older deleted unless `saved: true` |
| episodes | audio only for the newest 10 (see `pipeline/upload.md` step 4); transcripts kept |
| dict | if it passes 1,500 documents, delete the oldest half |
| inbox | delete `done` requests older than 30 days |
| highlights | delete documents whose source no longer exists (deleted news/literature) |
| words, essays, submissions, daily | never deleted automatically |

Before deleting, run a backup (`scripts/backup.md`). Use ArtifactData `batch` deletes pinned with each document's `if_version`. Report what was removed and the current document count.
