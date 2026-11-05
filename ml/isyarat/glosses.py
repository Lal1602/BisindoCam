"""Gloss names across datasets: one spelling per sign, with English glosses
for the bilingual site."""

from __future__ import annotations

import re

# Different datasets spell the same sign differently.
ALIASES = {
    "dimana": "di mana",
    "terimakasih": "terima kasih",
}

# Indonesian -> English, for every gloss that can appear in the vocabulary.
ENGLISH = {
    "air": "water", "apa": "what", "apa kabar": "how are you", "bagaimana": "how", "baik": "fine",
    "belajar": "learn", "berangkat": "depart", "berapa": "how many", "berdiri": "stand", "bingung": "confused",
    "cari": "search", "datang": "come", "dengar": "hear", "di mana": "where", "dia": "he / she",
    "duduk": "sit", "halo": "hello", "hari": "day", "hijau": "green", "hitam": "black", "ingat": "remember",
    "kalian": "you (plural)", "kami": "we (exclusive)", "kamu": "you", "kapan": "when", "keluarga": "family",
    "kemana": "where to", "kita": "we", "kuning": "yellow", "lagi": "again", "maaf": "sorry", "makan": "eat",
    "malam": "night", "mandi": "bathe", "marah": "angry", "melihat": "see", "membaca": "read",
    "menulis": "write", "mengapa": "why", "merah": "red", "mereka": "they", "minum": "drink",
    "motor": "motorcycle", "pagi": "morning", "pendek": "short", "ramah": "friendly", "rumah": "house",
    "sabar": "patient", "saya": "I", "sedih": "sad", "selamat malam": "good night",
    "selamat pagi": "good morning", "selamat siang": "good afternoon", "selamat sore": "good evening",
    "senang": "happy", "siang": "noon", "siapa": "who", "sore": "afternoon", "teman": "friend",
    "terima kasih": "thank you", "tidur": "sleep", "tinggi": "tall", "tuli": "Deaf",
}


def canonical_gloss(raw: str) -> str:
    g = re.sub(r"[_\-]+", " ", raw).strip().lower()
    g = re.sub(r"\s+", " ", g)
    return ALIASES.get(g, g)
