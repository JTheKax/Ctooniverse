# CToon Jam radio starter charts

These 10 JSON files are playable **starter rhythm charts** for the currently published CTooniverse Radio recordings. They contain no audio and no transcription of the original melodies. The authoring process used song-specific public tempo estimates, repeated original five-lane patterns, and a zero-second alignment offset. **They have not been synchronized by listening to/analyzing the uploaded MP3s.** Actual intro length, BPM, and arrangement may differ. Treat them as drafts; use the in-game timing-offset adjustment to calibrate, and edit the files for professional beat-by-beat charts.

## File mapping
The filename is the MP3's storage ID. CToon Jam loads the matching `ctoon-jam-charts/<storage-id>.json` whenever that radio track is selected. New radio tracks without a chart still use the old generated practice grid.

## JSON format
```json
{
  "format": "ctoon-jam-chart",
  "version": 1,
  "title": "Song title",
  "sourceStoragePath": "tracks/<storage-id>.mp3",
  "bpm": 123,
  "offsetSeconds": 0,
  "timingQuality": "starter-estimate",
  "difficultyNotes": {
    "easy": [[2.1, 0], [2.6, 2]],
    "normal": [[2.1, 0], [2.35, 3]],
    "hard": [[2.1, 0], [2.1, 4], [2.35, 3]]
  }
}
```
Each note is `[timeInSecondsFromAudioStart, laneIndex]`. Lanes run from **0 (green)** through **4 (purple)**. Duplicate time positions with different lanes create two-button chords. Values can be adjusted independently per difficulty. Values beyond a recording's real duration are ignored. Start offsets can be tuned in the UI without editing the source charts.

| Published radio title | Reference starting tempo (BPM) |
| --- | ---: |
| Golden - Huntr/x | 123 |
| Soda Pop - Saja Boys | 126 |
| Gotta Catch Them All - Pokemon Theme | 145 |
| Simple & Clean - Kingdom Hearts | 88 |
| Sanctuary - Kingdom Hearts 2 | 109 |
| This Is Halloween - Nightmare Before Christmas | 84 |
| Under The Sea - The Little Mermaid | 101 |
| Hawaiian Roller Coaster - Lilo & Stitch | 115 |
| Your Idol - Saja Boys | 90 |
| Hakuna Matata - The Lion King | 83 |

The tempo values are only initial estimates and may refer to different releases or arrangements. In particular, “This Is Halloween” changes meter, so one constant-tempo pattern does not faithfully follow the whole arrangement. No radio audio was downloaded or copied into GitHub.
