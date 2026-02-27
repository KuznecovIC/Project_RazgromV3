import json
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:3b"  # 🔥 ИСПОЛЬЗУЕМ qwen2.5:3b (быстрее и легче)

SYSTEM_RULES = """
Ты — помощник модератора музыкальной платформы.
Твоя задача: сократить время проверки.

ВАЖНО:
- Ты НЕ принимаешь решений.
- Ты НЕ имеешь права разбанивать/отклонять/банить.
- Ты можешь только РЕКОМЕНДОВАТЬ модератору.
- Рекомендация формулируется как совет: "скорее стоит...", "скорее не стоит...", "нужно уточнить...".

Верни СТРОГО JSON без лишнего текста. Формат:
{
  "summary": "краткий пересказ",
  "recommendation": "совет модератору",
  "risk": 0-100,
  "tags": ["короткие", "теги"]
}
"""

def analyze_moderation_case(original_text: str, kind: str = "appeal") -> dict:
    text = (original_text or "").strip()
    if not text:
        return {
            "summary": "Нет текста — недостаточно данных.",
            "recommendation": "Недостаточно данных, нужна ручная проверка.",
            "risk": 10,
            "tags": ["empty"]
        }

    prompt = f"""{SYSTEM_RULES}

Тип кейса: {kind}
Текст кейса:
{text}

Ответ:
"""

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_predict": 350
        }
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=60)
        r.raise_for_status()
        data = r.json()
        raw = (data.get("response") or "").strip()
    except requests.exceptions.ConnectionError:
        # Если Ollama не запущена
        return {
            "summary": "Ошибка подключения к Ollama",
            "recommendation": "Сервис AI недоступен, проверьте запущен ли Ollama",
            "risk": 0,
            "tags": ["ollama_offline"]
        }
    except Exception as e:
        return {
            "summary": f"Ошибка при запросе: {str(e)}",
            "recommendation": "Техническая ошибка, требуется ручная проверка",
            "risk": 0,
            "tags": ["error"]
        }

    # парсим JSON (защита от "модель написала лишний текст")
    try:
        obj = json.loads(raw)
    except Exception:
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                obj = json.loads(raw[start:end+1])
            except Exception:
                obj = {
                    "summary": raw[:400],
                    "recommendation": "Модель ответила не JSON — нужна ручная проверка.",
                    "risk": 40,
                    "tags": ["bad_format"]
                }
        else:
            obj = {
                "summary": raw[:400],
                "recommendation": "Модель ответила не JSON — нужна ручная проверка.",
                "risk": 40,
                "tags": ["bad_format"]
            }

    obj.setdefault("summary", "")
    obj.setdefault("recommendation", "")
    obj.setdefault("risk", 0)
    obj.setdefault("tags", [])

    try:
        obj["risk"] = max(0, min(100, int(obj["risk"])))
    except Exception:
        obj["risk"] = 0

    return obj


# ==================== ФУНКЦИЯ ДЛЯ "MADE FOR YOU" (ТРЕКИ) ====================

def recommend_tracks_for_user(user_profile: dict, candidates: list, limit: int = 12) -> dict:
    """
    user_profile: краткий профиль вкуса пользователя
    candidates: список кандидатов [{id,title,artist,genre,tags,likes,plays}]
    return:
      {
        "track_ids": [..],
        "reasons": { "12": "почему", ... }
      }
    """
    import json
    import requests

    limit = max(1, min(24, int(limit or 12)))

    # режем кандидатов, чтобы промпт был маленький
    candidates = (candidates or [])[:30]

    prompt = f"""
Ты — рекомендательная система музыкальной платформы.
Твоя задача: выбрать лучшие треки для пользователя ИЗ СПИСКА КАНДИДАТОВ.
Важно:
- НИКАКИХ внешних ссылок, только IDs из кандидатов.
- Верни СТРОГО JSON.
- Будь осторожен: если данных мало, выбирай популярные и разнообразные.

Профиль пользователя (сигналы):
{json.dumps(user_profile, ensure_ascii=False, indent=2)}

Кандидаты (можно выбирать только из них):
{json.dumps(candidates, ensure_ascii=False, indent=2)}

Верни JSON формата:
{{
  "track_ids": [ID1, ID2, ...]  // максимум {limit}
  "reasons": {{
     "ID1": "коротко почему рекомендован",
     "ID2": "..."
  }}
}}
"""

    payload = {
        "model": MODEL,  # qwen2.5:3b
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.25,
            "num_predict": 450,
            "num_ctx": 2048
        }
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=80)
        r.raise_for_status()
        data = r.json()
        raw = (data.get("response") or "").strip()
    except requests.exceptions.ConnectionError:
        # Если Ollama не запущена — fallback на первые limit кандидатов
        ids = [c.get("id") for c in candidates if c.get("id")][:limit]
        return {"track_ids": ids, "reasons": {}}
    except Exception as e:
        # Любая другая ошибка — fallback
        ids = [c.get("id") for c in candidates if c.get("id")][:limit]
        return {"track_ids": ids, "reasons": {}}

    # парсим JSON
    try:
        obj = json.loads(raw)
    except Exception:
        # пробуем вытащить JSON из текста
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                obj = json.loads(raw[start:end+1])
            except Exception:
                # fallback: просто возьмём первые limit по порядку кандидатов
                ids = [c.get("id") for c in candidates if c.get("id")][:limit]
                obj = {"track_ids": ids, "reasons": {}}
        else:
            # fallback
            ids = [c.get("id") for c in candidates if c.get("id")][:limit]
            obj = {"track_ids": ids, "reasons": {}}

    track_ids = obj.get("track_ids") or []
    reasons = obj.get("reasons") or {}

    # чистим и ограничиваем
    cleaned = []
    seen = set()
    for tid in track_ids:
        try:
            tid = int(tid)
        except Exception:
            continue
        if tid in seen:
            continue
        seen.add(tid)
        cleaned.append(tid)
        if len(cleaned) >= limit:
            break

    # если после чистки ничего не осталось — берем первые limit кандидатов
    if not cleaned:
        cleaned = [c.get("id") for c in candidates if c.get("id")][:limit]

    return {"track_ids": cleaned, "reasons": reasons}


# ==================== НОВАЯ ФУНКЦИЯ ДЛЯ "PLAYLISTS FOR YOU" ====================

def recommend_playlists_for_user(user_profile: dict, candidates: list, limit: int = 12) -> dict:
    """
    user_profile: краткий профиль вкуса пользователя
    candidates: список кандидатов [{id,title,creator,tracks_count,match_liked,match_recent,match_genre}]
    return:
      {
        "playlist_ids": [..],
        "reasons": { "12": "почему", ... }
      }
    """
    import json
    import requests

    limit = max(1, min(24, int(limit or 12)))

    # режем кандидатов, чтобы промпт был маленький
    candidates = (candidates or [])[:30]

    prompt = f"""
Ты — рекомендательная система плейлистов музыкальной платформы.
Твоя задача: выбрать лучшие плейлисты для пользователя ИЗ СПИСКА КАНДИДАТОВ.
Важно:
- Выбирай ТОЛЬКО из кандидатов (только их id).
- Верни СТРОГО JSON.
- Старайся учитывать совпадение по лайкнутым трекам, жанрам, артистам.

Профиль пользователя:
{json.dumps(user_profile, ensure_ascii=False, indent=2)}

Кандидаты:
{json.dumps(candidates, ensure_ascii=False, indent=2)}

Верни JSON формата:
{{
  "playlist_ids": [ID1, ID2, ...],  // максимум {limit}
  "reasons": {{
    "ID1": "коротко почему",
    "ID2": "..."
  }}
}}
"""

    payload = {
        "model": MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.25,
            "num_predict": 450,
            "num_ctx": 2048
        }
    }

    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=80)
        r.raise_for_status()
        data = r.json()
        raw = (data.get("response") or "").strip()
    except requests.exceptions.ConnectionError:
        # Если Ollama не запущена — fallback на первые limit кандидатов
        ids = [c.get("id") for c in candidates if c.get("id")][:limit]
        return {"playlist_ids": ids, "reasons": {}}
    except Exception as e:
        # Любая другая ошибка — fallback
        ids = [c.get("id") for c in candidates if c.get("id")][:limit]
        return {"playlist_ids": ids, "reasons": {}}

    # парсим JSON
    try:
        obj = json.loads(raw)
    except Exception:
        # пробуем вытащить JSON из текста
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                obj = json.loads(raw[start:end+1])
            except Exception:
                # fallback: просто возьмём первые limit по порядку кандидатов
                ids = [c.get("id") for c in candidates if c.get("id")][:limit]
                obj = {"playlist_ids": ids, "reasons": {}}
        else:
            # fallback
            ids = [c.get("id") for c in candidates if c.get("id")][:limit]
            obj = {"playlist_ids": ids, "reasons": {}}

    playlist_ids = obj.get("playlist_ids") or []
    reasons = obj.get("reasons") or {}

    # чистим и ограничиваем
    cleaned = []
    seen = set()
    for pid in playlist_ids:
        try:
            pid = int(pid)
        except Exception:
            continue
        if pid in seen:
            continue
        seen.add(pid)
        cleaned.append(pid)
        if len(cleaned) >= limit:
            break

    # если после чистки ничего не осталось — берем первые limit кандидатов
    if not cleaned:
        cleaned = [c.get("id") for c in candidates if c.get("id")][:limit]

    return {"playlist_ids": cleaned, "reasons": reasons}