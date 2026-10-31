# Uploading an episode (for Claude Code)

After `pipeline/transcribe.sh` has produced `pipeline/work/<id>/audio.mp4` and `episode.json`:

1. **Check the transcript.** Read `episode.json`. If the audio has Singaporean, Indian or other accents and the text came from whisper (not official captions), skim for obvious mis-hearings of names and places and fix them in the file. Do not rewrite what the speaker said.
2. **Upload the audio** to the artifact's asset store:
   Artifact tool → `action: "publish"`, `url: <ARTIFACT_URL>`, `file_path: pipeline/work/<id>/audio.mp4`, `asset: true`.
   The result gives an asset `id` and `url`.
3. **Write the episode document**: ArtifactData → `action: "set"`, `collection: "episodes"`, `doc_id: <id>`, with the contents of `episode.json` plus
   `assetId` (from step 2), `audioUrl` (the `url` from step 2, exactly as given), `added` (ISO now).
   Pass `file_path` after adding those fields to the JSON file, so the transcript doesn't pass through the conversation.
4. **Retention (keep audio for the latest 10 episodes only).** List `episodes`. For every episode beyond the newest 10 that still has an `assetId`:
   delete the asset (Artifact tool → `action: "delete"`, `url: <ARTIFACT_URL>`, `path: <assetId>`), then `update` the episode with
   `{"assetId": {"__delete__": true}, "audioUrl": {"__delete__": true}}` (pinned with `if_version`). Transcripts stay.
5. **Clean up locally**: delete `pipeline/work/<id>/` (audio never goes into git).

Limits: 20 MiB per asset (the script aims for < 19 MB), 256 KiB per document (about 3 hours of transcript).
