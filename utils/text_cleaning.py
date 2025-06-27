import re
import logging
from typing import Tuple

# Logger configuration (debug mode for emoji removal)
logger = logging.getLogger("emoji_cleaner")
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
formatter = logging.Formatter('[%(asctime)s][%(levelname)s] %(message)s')
handler.setFormatter(formatter)
if not logger.hasHandlers():
    logger.addHandler(handler)

# Regex stricte pour capturer toute séquence emoji (emoji + modificateurs + ZWJ + variation selector)
EMOJI_PATTERN = re.compile(
    r'((?:'
    r'[\U0001F600-\U0001F64F]'
    r'|[\U0001F300-\U0001F5FF]'
    r'|[\U0001F680-\U0001F6FF]'
    r'|[\U0001F1E6-\U0001F1FF]'
    r'|[\U00002702-\U000027B0]'
    r'|[\U0001F900-\U0001F9FF]'
    r'|[\U00002600-\U000026FF]'
    r'|[\U00002B05-\U00002B07]'
    r'|[\U00002B1B-\U00002B1C]'
    r'|[\U00002B50]'
    r'|[\U00002B55]'
    r')'
    r'(?:[\ufe0f\u200d\U0001F3FB-\U0001F3FF]*)*'  # modificateurs, ZWJ, variation selector
    r')',
    flags=re.UNICODE)

def remove_emojis(text: str) -> str:
    """
    Supprime tous les emojis d'une chaîne de caractères sans altérer le reste du contenu.
    Log chaque suppression en mode debug (position, codepoint, emoji).
    Thread-safe et réutilisable.
    """
    def _log_emoji(match: re.Match) -> str:
        emoji = match.group(0)
        logger.debug(f"Suppression emoji: '{emoji}' (codepoints: {[hex(ord(c)) for c in emoji]})")
        return ''
    return EMOJI_PATTERN.sub(_log_emoji, text) 