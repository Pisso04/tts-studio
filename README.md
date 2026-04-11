# 🎙️ TTS Studio — Coqui XTTS v2

Interface web Next.js pour générer des audios par clonage vocal depuis un fichier JSON.

## Prérequis

- Node.js 18+
- Python 3.10+
- ffmpeg installé (`brew install ffmpeg`)
- Coqui TTS installé (`pip install TTS`)

## Installation

```bash
npm install
```

## Lancer le serveur

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Utilisation

1. **Uploader le JSON** — liste de segments texte `["segment 1...", "segment 2..."]`
2. **Uploader l'audio de référence** — 3 à 10 secondes de la voix à cloner (mp3/wav)
3. **Régler les paramètres** — langue, vitesse, format, silence entre phrases
4. **Lancer** — les segments apparaissent au fur et à mesure avec lecteur audio intégré

## Structure

```
tts-web/
├── app/
│   ├── page.tsx                          # UI principale
│   └── api/
│       ├── generate/route.ts             # Lance le subprocess Python
│       ├── stream/[jobId]/route.ts       # SSE progress en temps réel
│       ├── download/[jobId]/[segment]/   # Sert les fichiers audio
│       └── jobs/[jobId]/route.ts         # Liste les segments d'un job
├── components/
│   ├── UploadZone.tsx                    # Drag & drop upload
│   ├── ParamsPanel.tsx                   # Paramètres TTS
│   ├── ProgressPanel.tsx                 # Barre de progression + logs
│   └── ResultsPanel.tsx                 # Lecteur audio + téléchargement
├── lib/
│   └── tts.py                            # Moteur Coqui XTTS v2
└── jobs/                                 # Dossier des jobs (auto-créé)
    └── <jobId>/
        ├── input.json
        ├── reference.mp3
        ├── progress.log
        └── output/
            ├── segment_001.mp3
            └── ...
```

## Format JSON attendu

```json
[
  "Premier segment de texte...",
  "Deuxième segment...",
  "..."
]
```
