from .loader import load_morse_dictionary, load_scheduled_tasks
import os

# --- Start of Cyrillic to Latin-1 mapping for source.dict compatibility ---
# source.dict uses Latin-1 escape sequences (e.g., \xe0) to represent Cyrillic characters.
# \xe0 unescapes to 'à' (Latin small a with grave, U+00E0).
# This map translates actual Unicode Cyrillic characters (like 'а', U+0430)
# to their Latin-1 equivalents as used in the loaded morse_codes dictionary.

CYRILLIC_LOWER = "абвгдежзийклмнопрстуфхцчшщъыьэюя"
# Ensure we only map up to the number of Latin-1 equivalents we have (\xe0-\xff for 'а'-'я')
# Standard CP1251 mapping: 'ё' is 0xA8, 'Ё' is 0xB8 - not in the contiguous e0-ff block.
# For now, this map covers 'а'-'я'. If 'ё' etc. are needed, they'd need specific handling.
# The original source.dict has \xe0-\xff for the 32 Russian letters.
# Python's chr(0xe0 + i) will give 'à', 'á', ... 'ÿ'.
LATIN1_LOWER_EQUIVS = "".join([chr(0xe0 + i) for i in range(len(CYRILLIC_LOWER))])

CYRILLIC_TO_LATIN1_MAP = {}
for cy, l1 in zip(CYRILLIC_LOWER, LATIN1_LOWER_EQUIVS):
    CYRILLIC_TO_LATIN1_MAP[cy] = l1  # e.g., 'а' -> 'à'
for cy_upper, l1_lower in zip(CYRILLIC_LOWER.upper(), LATIN1_LOWER_EQUIVS):
    CYRILLIC_TO_LATIN1_MAP[cy_upper] = l1_lower # e.g., 'А' -> 'à'
# --- End of Cyrillic to Latin-1 mapping ---


# Determine the correct base path for default files
# When running as a module (-m), __file__ is available and correct for settings.py
# CWD is the project root /app/morse_python
CONFIG_DIR = os.path.dirname(__file__) # This will be /app/morse_python/config

# Default file paths, relative to the config directory itself or absolute
# loader.py already makes its defaults relative to loader.py.
# For Settings, if it's to be configurable, the paths passed should be resolvable.
# Let's make them relative to the project root (CWD when running with -m)
DEFAULT_SOURCE_DICT_PATH = "config/source.dict"
DEFAULT_PROCS_TXT_PATH = "config/procs.txt"

class Settings:
    def __init__(self, dict_filepath=None, procs_filepath=None):
        # If no path is provided, use the loader's own default paths.
        # loader.py's defaults are relative to loader.py, which is correct.
        effective_dict_filepath = dict_filepath if dict_filepath is not None else None
        effective_procs_filepath = procs_filepath if procs_filepath is not None else None

        if effective_dict_filepath:
            raw_dict = load_morse_dictionary(effective_dict_filepath)
        else: # Rely on loader.py's default path mechanism
            raw_dict = load_morse_dictionary()

        if raw_dict is None:
            raw_dict = {} # Initialize with empty if loading failed

        if effective_procs_filepath:
            self.scheduled_tasks_raw = load_scheduled_tasks(effective_procs_filepath)
        else: # Rely on loader.py's default path mechanism
            self.scheduled_tasks_raw = load_scheduled_tasks()

        # Application settings with defaults
        self.speed = int(raw_dict.get("/speed", 70)) # Default WPM, check if /speed exists
        self.pitch = int(raw_dict.get("/pitch", 600)) # Default Hz, e.g. 600-1000Hz
        self.sound_on = True
        self.typewriter_sound_on = False
        self.speak_letters_on = False

        self.braille_representación = raw_dict.get("/braille", "") # From source.dict
        self.replace_chars_map = self._parse_replace_chars(raw_dict.get("/replace", ""))

        # Morse code dictionaries and alphabets
        self.alphabets = {}
        self.morse_codes = {} # This will store char -> morse
        self.reverse_morse_codes = {} # This will store morse -> char for decoding

        self._initialize_language_data(raw_dict)

        # Default language
        default_layout_key = raw_dict.get("/deflayout", "0") # 0 for RU, 1 for EN as per original
        if default_layout_key == "0" and "/russian" in raw_dict:
            self.current_language_key = "RU"
        elif default_layout_key == "1" and "/english" in raw_dict:
            self.current_language_key = "EN"
        elif "/english" in raw_dict: # Fallback to English if deflayout is weird
             self.current_language_key = "EN"
        elif self.alphabets: # Fallback to the first loaded language
            self.current_language_key = list(self.alphabets.keys())[0]
        else:
            self.current_language_key = None # No languages loaded

        # Other specific settings from source.dict
        self.output_device = raw_dict.get("/output", "def")

    def _parse_replace_chars(self, replace_string):
        """ Parses the /replace string e.g., "я=ja,ю=ju" into a dict. """
        mapping = {}
        if not replace_string:
            return mapping
        pairs = replace_string.split(',')
        for pair in pairs:
            if '=' in pair:
                key, value = pair.split('=', 1)
                mapping[key.strip()] = value.strip()
        return mapping

    def _initialize_language_data(self, raw_dict):
        """
        Initializes alphabets and Morse code mappings from the raw dictionary.
        Expected keys in raw_dict:
        /english=abc...
        /russian=абв...
        /numbers=123...
        /punct=.,?!
        a=.-
        b=-...
        1=.----
        .=.-.-
        """
        lang_keys = {
            "EN": raw_dict.get("/english", ""),
            "RU": raw_dict.get("/russian", ""),
        }
        # Numbers and Punctuation are common to all languages as per original structure
        common_chars_alphabet = raw_dict.get("/numbers", "") + raw_dict.get("/punct", "")

        for lang_code, alphabet_str in lang_keys.items():
            if not alphabet_str: # Skip if language alphabet is not defined
                continue

            self.alphabets[lang_code] = alphabet_str + common_chars_alphabet
            self.morse_codes[lang_code] = {}
            self.reverse_morse_codes[lang_code] = {}

            for char_set in [alphabet_str, common_chars_alphabet]:
                for char_in_lang in char_set:
                    # Ensure char is treated as lowercase if that's how codes are stored
                    # The original morser.bgt does string_to_lower_case before lookup
                    char_lookup = char_in_lang.lower()

                    morse_val = raw_dict.get(char_lookup)

                    if morse_val:
                        # Store morse code using the 'lookup' version of the char (usually lowercase)
                        self.morse_codes[lang_code][char_lookup] = morse_val
                        # If char_in_lang was originally uppercase (e.g. 'A' from an alphabet like "ABC...")
                        # also map the uppercase char directly for convenience in get_morse_code if needed,
                        # though current get_morse_code primarily uses .lower() or the Cyrillic map.
                        if char_in_lang != char_lookup:
                             self.morse_codes[lang_code][char_in_lang] = morse_val

                        # Determine the character to use for reverse mapping
                        char_for_reverse_map = char_lookup # Default (e.g., 'a' for EN, 'à' for RU before map)

                        if lang_code == "RU":
                            # If char_lookup is a Latin-1 char that represents a Cyrillic char,
                            # get the actual Cyrillic char for the reverse map.
                            for cyrillic_char_key, latin1_val_in_map in CYRILLIC_TO_LATIN1_MAP.items():
                                if latin1_val_in_map == char_lookup:
                                    char_for_reverse_map = cyrillic_char_key # Store actual Cyrillic 'а'
                                    break

                        # Populate reverse morse codes, avoiding overwrites
                        if morse_val not in self.reverse_morse_codes[lang_code]:
                             self.reverse_morse_codes[lang_code][morse_val] = char_for_reverse_map

        # Fallback for characters not in any specific language but present in dict (e.g. standalone symbols)
        # This might not be needed if numbers/punct already cover them well
        # For now, we rely on numbers and punct being added to each lang's alphabet

    def get_morse_code(self, char, lang=None):
        if lang is None:
            lang = self.current_language_key
        if lang not in self.morse_codes: # Language itself not loaded
            return None

        char_for_lookup = char # Default to original char

        if lang == "RU":
            # If the input char is Russian (Cyrillic), map it to its Latin-1 equivalent key.
            # This map handles both upper and lower case Cyrillic input and
            # maps them to the corresponding *lowercase* Latin-1 char ('à', 'á', etc.)
            # which are the keys used in self.morse_codes["RU"].
            if char in CYRILLIC_TO_LATIN1_MAP:
                 char_for_lookup = CYRILLIC_TO_LATIN1_MAP[char]
            else: # Not a Cyrillic char that needs mapping (e.g. numbers, punctuation, English letters)
                 char_for_lookup = char.lower()
        else: # Not Russian language, or a non-mapped char in Russian mode
            char_for_lookup = char.lower()

        # Final lookup in the language-specific morse codes table
        return self.morse_codes[lang].get(char_for_lookup)

    def get_char_from_morse(self, morse_sequence, lang=None):
        # This function might need adjustment if reverse lookup for RU should yield Cyrillic.
        # Currently, self.reverse_morse_codes for RU would map '.-' -> 'à'.
        # We might want '.-' -> 'а' (Cyrillic).
        # This requires building reverse_morse_codes with Cyrillic chars for RU.
        if lang is None:
            lang = self.current_language_key
        if lang not in self.reverse_morse_codes:
            return None
        return self.reverse_morse_codes[lang].get(morse_sequence)

    def set_language(self, lang_key): # e.g., "EN", "RU"
        if lang_key in self.alphabets:
            self.current_language_key = lang_key
            print(f"Language set to {lang_key}")
        else:
            print(f"Error: Language {lang_key} not supported/loaded.")

    def get_current_alphabet(self):
        if self.current_language_key:
            return self.alphabets.get(self.current_language_key, "")
        return ""

    # Add getters and setters for other settings as needed
    def set_speed(self, wpm):
        self.speed = int(wpm)

    def get_speed(self):
        return self.speed

    # ... other getters/setters

if __name__ == '__main__':
    # When running settings.py directly for testing (e.g. python -m config.settings)
    # we want it to use the actual files from their correct locations.
    # The loader.py defaults (relative to loader.py) are suitable here.
    settings = Settings()
    print(f"Loaded settings. Current language: {settings.current_language_key}")
    print(f"Default speed: {settings.speed} WPM")
    print(f"Output device: {settings.output_device}")

    if settings.current_language_key:
        print(f"Alphabet for {settings.current_language_key}: {settings.get_current_alphabet()[:30]}...") # Print first 30 chars

        # Test Morse code lookup
        test_chars_en = ['a', 'b', 'c', '1', '.', 'A']
        test_chars_ru = ['а', 'б', 'в', '1', '.'] # Assuming 'а', 'б', 'в' are in source.dict

        active_lang = settings.current_language_key
        test_chars = test_chars_en if active_lang == "EN" else test_chars_ru

        if active_lang == "RU" and "RU" not in settings.alphabets:
            print("Russian language data not found in source.dict, switching to EN for test")
            settings.set_language("EN")
            active_lang = "EN"
            test_chars = test_chars_en


        print(f"--- Testing Morse Codes for {active_lang} ---")
        for char_to_test in test_chars:
            code = settings.get_morse_code(char_to_test)
            print(f"Morse for '{char_to_test}': {code}")
            if code:
                reversed_char = settings.get_char_from_morse(code)
                print(f"From Morse '{code}' back to char: '{reversed_char}'")

        # Test a non-existent char
        print(f"Morse for 'Ω': {settings.get_morse_code('Ω')}")

    print("\n--- Raw Scheduled Tasks ---")
    if settings.scheduled_tasks_raw:
        for task_line in settings.scheduled_tasks_raw[:5]:
            print(task_line)
    else:
        print("No scheduled tasks loaded.")

    # Test language switching
    if "RU" in settings.alphabets and "EN" in settings.alphabets:
        print("\n--- Switching language to RU ---")
        settings.set_language("RU")
        print(f"Current language: {settings.current_language_key}")
        print(f"Alphabet for RU: {settings.get_current_alphabet()[:30]}...")
        for char_to_test in test_chars_ru:
            code = settings.get_morse_code(char_to_test)
            print(f"Morse for '{char_to_test}' (RU): {code}")
            if code:
                reversed_char = settings.get_char_from_morse(code)
                print(f"From Morse '{code}' back to char (RU): '{reversed_char}'")
