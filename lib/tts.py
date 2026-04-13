#!/usr/bin/env python3
"""
Moteur TTS F5-TTS — appelé par Next.js via subprocess.
Écrit les logs dans jobs/<jobId>/progress.log
Génère les segments dans jobs/<jobId>/output/
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

NOMBRES = {
    0: "zéro", 1: "un", 2: "deux", 3: "trois", 4: "quatre",
    5: "cinq", 6: "six", 7: "sept", 8: "huit", 9: "neuf",
    10: "dix", 11: "onze", 12: "douze", 13: "treize", 14: "quatorze",
    15: "quinze", 16: "seize", 17: "dix-sept", 18: "dix-huit", 19: "dix-neuf",
    20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante",
    60: "soixante", 70: "soixante-dix", 80: "quatre-vingts", 90: "quatre-vingt-dix",
    100: "cent", 1000: "mille",
}


def nombre_en_lettres(n: int) -> str:
    if n < 0:
        return "moins " + nombre_en_lettres(-n)
    if n in NOMBRES:
        return NOMBRES[n]
    if n < 70:
        d, u = (n // 10) * 10, n % 10
        if u == 0:
            return NOMBRES[d]
        if u == 1 and d in (20, 30, 40, 50, 60):
            return f"{NOMBRES[d]} et un"
        return f"{NOMBRES[d]}-{NOMBRES[u]}"
    if n < 80:
        return f"soixante-{nombre_en_lettres(n - 60)}"
    if n < 100:
        r = n - 80
        return "quatre-vingts" if r == 0 else f"quatre-vingt-{nombre_en_lettres(r)}"
    if n < 200:
        r = n - 100
        return "cent" if r == 0 else f"cent {nombre_en_lettres(r)}"
    if n < 1000:
        c, r = n // 100, n % 100
        p = f"{nombre_en_lettres(c)} cent{'s' if r == 0 else ''}"
        return p if r == 0 else f"{p} {nombre_en_lettres(r)}"
    if n < 1000000:
        m, r = n // 1000, n % 1000
        p = "mille" if m == 1 else f"{nombre_en_lettres(m)} mille"
        return p if r == 0 else f"{p} {nombre_en_lettres(r)}"
    return str(n)


def normaliser_texte(texte: str) -> str:
    texte = re.sub(r'["\u201c\u201d\u00ab\u00bb""]', '', texte)
    texte = re.sub(r'[—\u2014\u2013–]\s*', '', texte)
    texte = texte.replace("...", ".")
    texte = re.sub(r'(\d{1,2})h(\d{2})?', lambda m: f"{nombre_en_lettres(int(m.group(1)))} heures{' ' + nombre_en_lettres(int(m.group(2))) if m.group(2) else ''}", texte)
    texte = re.sub(r'(\d+)\s*%', lambda m: nombre_en_lettres(int(m.group(1))) + " pour cent", texte)
    texte = re.sub(r'\b\d{1,6}\b', lambda m: nombre_en_lettres(int(m.group(0))), texte)
    texte = texte.replace(' : ', ', ').replace(' ; ', ', ')
    texte = texte.replace('\n', ' ')
    texte = re.sub(r'\s+', ' ', texte).strip()
    return texte


def decouper_en_phrases(texte: str, max_len: int = 200) -> list:
    segments = re.split(r'(?<=[.!?])\s+', texte)
    phrases = []
    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue
        if len(seg) <= max_len:
            phrases.append(seg)
            continue
        buffer = ""
        for ss in seg.split(','):
            ss = ss.strip()
            if buffer and len(buffer) + len(ss) + 2 > max_len:
                phrases.append(buffer.strip())
                buffer = ss
            else:
                buffer = f"{buffer}, {ss}" if buffer else ss
        if buffer.strip():
            phrases.append(buffer.strip())
    return [p for p in phrases if len(p) > 1]


def concatener_avec_silence(fichiers: list, output: str, silence_ms: int = 300):
    if len(fichiers) == 1:
        shutil.copy2(fichiers[0], output)
        return
    silence_file = os.path.join(tempfile.gettempdir(), "silence.wav")
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i",
        f"anullsrc=r=24000:cl=mono:d={silence_ms / 1000}",
        "-t", str(silence_ms / 1000), silence_file
    ], capture_output=True)
    list_file = os.path.join(tempfile.gettempdir(), "concat_list.txt")
    with open(list_file, "w") as f:
        for i, fichier in enumerate(fichiers):
            p = os.path.abspath(fichier).replace("\\", "/")
            f.write(f"file '{p}'\n")
            if i < len(fichiers) - 1:
                sp = os.path.abspath(silence_file).replace("\\", "/")
                f.write(f"file '{sp}'\n")
    tmp_out = output + ".tmp.wav"
    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file,
        "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", tmp_out
    ], capture_output=True)
    if output.endswith(".mp3"):
        subprocess.run(["ffmpeg", "-y", "-i", tmp_out, "-b:a", "192k", output], capture_output=True)
        os.remove(tmp_out)
    else:
        os.rename(tmp_out, output)
    for f in [silence_file, list_file]:
        if os.path.exists(f):
            os.remove(f)


def log(log_file: str, message: str):
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(message + "\n")
    print(message, flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("-r", "--reference", required=True)
    parser.add_argument("-o", "--output-dir", required=True)
    parser.add_argument("-l", "--log-file", required=True)
    parser.add_argument("-f", "--format", choices=["wav", "mp3"], default="mp3")
    parser.add_argument("--gpu", action="store_true")
    parser.add_argument("--silence", type=int, default=300)
    parser.add_argument("--max-len", type=int, default=200)
    parser.add_argument("--lang", default="fr")
    args = parser.parse_args()

    log_file = args.log_file

    with open(args.input, "r", encoding="utf-8") as f:
        segments = json.load(f)

    if not isinstance(segments, list):
        log(log_file, "ERROR:Le JSON doit être une liste de chaînes.")
        sys.exit(1)

    log(log_file, f"TOTAL:{len(segments)}")
    log(log_file, "STATUS:loading")

    import torch
    from f5_tts.api import F5TTS

    device = "cuda" if (args.gpu and torch.cuda.is_available()) else "cpu"
    tts = F5TTS(device=device)

    log(log_file, "STATUS:ready")
    os.makedirs(args.output_dir, exist_ok=True)
    tmpdir = tempfile.mkdtemp(prefix="tts_")

    for idx, segment_brut in enumerate(segments):
        num = f"{idx + 1:03d}"
        log(log_file, f"SEGMENT:{idx + 1}/{len(segments)}")

        texte = normaliser_texte(segment_brut)
        phrases = decouper_en_phrases(texte, max_len=args.max_len)

        fichiers_phrases = []
        for i, phrase in enumerate(phrases):
            out_path = os.path.join(tmpdir, f"seg{num}_p{i:03d}.wav")
            try:
                wav, sr, _ = tts.infer(
                    ref_file=args.reference,
                    ref_text="",
                    gen_text=phrase,
                    file_wave=out_path,
                )
                if os.path.exists(out_path):
                    fichiers_phrases.append(out_path)
            except Exception as e:
                log(log_file, f"WARN:Segment {idx+1} phrase {i+1}: {str(e)[:100]}")

        if not fichiers_phrases:
            log(log_file, f"WARN:Aucun audio pour le segment {idx + 1}")
            continue

        output_file = os.path.join(args.output_dir, f"segment_{num}.{args.format}")
        concatener_avec_silence(fichiers_phrases, output_file, silence_ms=args.silence)

        for f in fichiers_phrases:
            if os.path.exists(f):
                os.remove(f)

        log(log_file, f"DONE:{idx + 1}:segment_{num}.{args.format}")

    try:
        os.rmdir(tmpdir)
    except OSError:
        pass

    log(log_file, "STATUS:finished")


if __name__ == "__main__":
    main()
