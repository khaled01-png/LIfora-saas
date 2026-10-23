from enum import Enum

class BloodGroupEnum(str, Enum):
    A_POS = "A+"
    A_NEG = "A-"
    B_POS = "B+"
    B_NEG = "B-"
    AB_POS = "AB+"
    AB_NEG = "AB-"
    O_POS = "O+"
    O_NEG = "O-"

VALID_BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}

def validate_blood_group(bg: str) -> str:
    if not bg:
        raise ValueError("Blood group is required")
    cleaned = bg.strip().upper()
    if cleaned not in VALID_BLOOD_GROUPS:
        raise ValueError(f"Invalid blood group '{bg}'. Must be one of: {', '.join(sorted(VALID_BLOOD_GROUPS))}")
    return cleaned


import re as _re

# ---- phone numbers: Bangladesh mobile numbers (operators 013-019) --------------------------------------------
_BD_MOBILE = _re.compile(r"^(?:\+?88)?(01[3-9]\d{8})$")


def validate_phone(value, required: bool = True):
    """Accepts 01711000111, 01711-000111, +8801711000111 or +880 1711-000111. Stored as '+880 1711-000111'."""
    v = (value or "").strip()
    if not v:
        if required:
            raise ValueError("A phone number is required")
        return v
    compact = _re.sub(r"[\s\-()]", "", v)
    m = _BD_MOBILE.match(compact)
    if not m:
        raise ValueError("Please enter a valid Bangladesh mobile number, for example 01711-000111 or +880 1711-000111")
    national = m.group(1)[1:]  # 10 digits after the leading 0
    if len(set(national)) <= 2:  # 1111111111, 1212121212 ...
        raise ValueError("Please enter a real phone number")
    return f"+880 {national[:4]}-{national[4:]}"


# ---- names and places: reject keyboard mashing such as "hsjsj" or "asdfgh" -------------------------------------
_MASH = ("asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "qwer", "wert", "erty", "rtyu", "tyui", "yuio", "uiop",
         "zxcv", "xcvb", "cvbn", "vbnm", "qaz", "wsx", "edc", "rfv")
_VOWELS = set("aeiouyAEIOUY")


def _word_looks_real(word: str) -> bool:
    letters = "".join(ch for ch in word if ch.isalpha())
    if not letters:
        return True
    if any(ord(ch) > 0x24F for ch in letters):  # Bangla and other scripts: no Latin heuristics apply
        return True
    low = letters.lower()
    if len(low) >= 4 and not any(ch in _VOWELS for ch in low):
        return False
    if _re.search(r"[bcdfghjklmnpqrstvwxz]{5,}", low):
        return False
    if _re.search(r"(.)\1{3,}", low):
        return False
    if len(low) >= 4 and any(m in low for m in _MASH):
        return False
    return True


def validate_person_name(value: str) -> str:
    """Real-looking name: at least two letters, no digits or markup characters, not keyboard mash."""
    v = (value or "").strip()
    letters = sum(1 for ch in v if ch.isalpha())
    if letters < 2 or any(ch.isdigit() or ch in "@<>/\\" for ch in v):
        raise ValueError("Please enter a real name (letters only, no numbers or symbols like @ < > /)")
    words = [w for w in _re.split(r"[\s.\-']+", v) if w]
    if not any(sum(1 for ch in w if ch.isalpha()) >= 2 for w in words) or not all(_word_looks_real(w) for w in words):
        raise ValueError("That does not look like a real name. Please check the spelling.")
    return v


def validate_place_name(value: str) -> str:
    """Hospital / clinic name: at least three letters, not digits only, not keyboard mash."""
    v = (value or "").strip()
    letters = sum(1 for ch in v if ch.isalpha())
    if letters < 3 or any(ch in "<>" for ch in v):
        raise ValueError("Please enter the full hospital name")
    if not all(_word_looks_real(w) for w in _re.split(r"[\s.,\-()/&']+", v)):
        raise ValueError("That does not look like a real hospital name. Please check the spelling.")
    return v


_DEADLINE = _re.compile(r"^within (\d{1,3}) (hours?|days?)$", _re.I)


def validate_deadline(value: str) -> str:
    """Only 'Within N hours' / 'Within N days' (up to 14 days); the request expires automatically."""
    v = (value or "").strip()
    m = _DEADLINE.match(v)
    if not m:
        raise ValueError("Please choose how soon the blood is needed (for example: Within 6 hours)")
    hours = int(m.group(1)) * (24 if m.group(2).lower().startswith("day") else 1)
    if hours < 1 or hours > 24 * 14:
        raise ValueError("The deadline must be between 1 hour and 14 days")
    return f"Within {m.group(1)} {m.group(2).lower()}"
