import time as pytime # Alias to avoid conflict if a 'time' module is made locally
from datetime import datetime

# Placeholder for actual Settings and SoundManager classes if not directly importable
# For testing, these might be mocked.
# from ..config.settings import Settings # Adjust import path as needed
# from ..sound_manager import SoundManager # Adjust import path as needed

class MockSoundManager:
    def __init__(self, settings):
        self.settings = settings
        self.dkm_playing = False
        print("MockSoundManager initialized.")

    def play_dot(self):
        print("SOUND: DOT")
    def play_dash(self):
        print("SOUND: DASH")
    def wait_for_intra_char_space(self): # Already called by play_dot/dash in real SM
        # print("SILENCE: INTRA_CHAR_SPACE (1 unit)")
        pass # In the real SM, play_dot/dash includes this wait.
    def wait_for_char_space(self):
        print("SILENCE: CHAR_SPACE (3 units total)") # This is 2 more units after dot/dash's 1 unit
    def wait_for_word_space(self):
        print("SILENCE: WORD_SPACE (7 units total)") # This is 6 more units after dot/dash's 1 unit

    def play_dkm_start_if_needed(self):
        if self.settings.typewriter_sound_on and not self.dkm_playing:
            print("SOUND: DKM_START")
            self.dkm_playing = True

    def play_dkm_end_if_needed(self):
        if self.settings.typewriter_sound_on and self.dkm_playing:
            print("SOUND: DKM_END")
            self.dkm_playing = False

    def set_sound_set(self, index):
        print(f"MockSoundManager: Sound set to {index}")

    def cleanup(self):
        print("MockSoundManager cleaned up.")

class MockSettings:
    def __init__(self):
        self.current_language_key = "EN"
        self.morse_codes = {
            "EN": {
                "a": ".-", "b": "-...", "c": "-.-.", "d": "-..", "e": ".", "f": "..-.", "g": "--.", "h": "....", "i": "..",
                "j": ".---", "k": "-.-", "l": ".-..", "m": "--", "n": "-.", "o": "---", "p": ".--.", "q": "--.-", "r": ".-.",
                "s": "...", "t": "-", "u": "..-", "v": "...-", "w": ".--", "x": "-..-", "y": "-.--", "z": "--..",
                "1": ".----", "2": "..---", "3": "...--", "4": "....-", "5": ".....", "6": "-....", "7": "--...",
                "8": "---..", "9": "----.", "0": "-----",
                ".": ".-.-.-", ",": "--..--", "?": "..--..", " ": "/"
            },
            "RU": {"а": ".-", "б": "-...", "в": ".--", "г": "--.", "д": "-..", "е": ".", "л": ".-..", "о": "---", "м": "--", " ": "/"}
        }
        self.reverse_morse_codes = {
            "EN": {v: k for k, v in self.morse_codes["EN"].items()},
            "RU": {v: k for k, v in self.morse_codes["RU"].items()}
        }
        self.alphabets = { # For tomorse layout index
            "RU": 0, # Original BGT used 0 for RU, 1 for EN
            "EN": 1,
        }
        self.replace_chars_map = {"я": "ja"} # Example
        self.typewriter_sound_on = False
        self.speak_letters_on = False # For morze function
        print("MockSettings initialized.")

    def get_morse_code(self, char, lang=None):
        lang_to_use = lang if lang else self.current_language_key
        # Simplified: real one handles case and specific lang data better
        return self.morse_codes.get(lang_to_use, {}).get(char.lower())

    def get_char_from_morse(self, morse_seq, lang=None):
        lang_to_use = lang if lang else self.current_language_key
        return self.reverse_morse_codes.get(lang_to_use, {}).get(morse_seq)

    def get_alphabet_index(self, lang_key=None):
        lang_to_use = lang_key if lang_key else self.current_language_key
        return self.alphabets.get(lang_to_use, 1) # Default to EN index if not found


def morze_text(text_to_morse, settings, sound_manager, willsave=False):
    """
    Translates text to Morse code and plays it using SoundManager.
    Handles /time command and character replacements.
    Returns a list of morse actions (e.g. ['DOT', 'DASH', 'PAUSE_CHAR']) for potential saving.
    """
    if not text_to_morse:
        return []

    processed_text = text_to_morse.lower()

    # 1. Apply /time replacement
    if "/time" in processed_text:
        now = datetime.now()
        time_str = now.strftime("%H %M") # Original format: "HH MM"
        processed_text = processed_text.replace("/time", time_str)
        print(f"Processed /time, text is now: {processed_text}")

    # 2. Apply character replacements from settings.replace_chars_map
    # Example: "яблоко" with replace_map {"я": "ja"} -> "jabloko"
    # The original BGT script does:
    #   morse=string_replace(morse,str[i][0],str[i][1],true); where str[i] is a pair from /replace
    # This means it iterates through the replace map and applies.
    # We need to be careful about order if replacements can chain (e.g. a->b, b->c)
    # Assuming simple, non-chaining replacements for now.
    if settings.replace_chars_map:
        temp_processed_text = processed_text
        for original_char, replacement_str in settings.replace_chars_map.items():
            temp_processed_text = temp_processed_text.replace(original_char, replacement_str)
        if temp_processed_text != processed_text:
            processed_text = temp_processed_text
            print(f"After char replacement: {processed_text}")

    morse_actions = []

    # The original BGT 'morze' function has a 'synes' flag for direct dot/dash input like "1010"
    # This is toggled by '[' and ']'. For now, we focus on text translation.
    # It also had 'telegraf<2' condition for screen_reader_speak.
    if settings.speak_letters_on: # Simplified from original's speak(morse[i],2)
        print(f"SPEAK_LETTERS: {processed_text}")


    for i, char_in_text in enumerate(processed_text):
        # Original BGT: if(morse[i]!=" "){playdkm();}
        if char_in_text != ' ':
            sound_manager.play_dkm_start_if_needed()

        if char_in_text == ' ':
            sound_manager.play_dkm_end_if_needed() # End DKM before word space
            sound_manager.wait_for_word_space()
            morse_actions.append("WORD_SPACE")
            if settings.speak_letters_on: print(f"SPEAK: word space") # Or braille output
            continue

        morse_sequence = settings.get_morse_code(char_in_text)

        if morse_sequence:
            if settings.speak_letters_on: print(f"SPEAK: {char_in_text}") # Or braille output

            for morse_char_idx, morse_char in enumerate(morse_sequence):
                is_last_signal_in_char = (morse_char_idx == len(morse_sequence) - 1)
                if morse_char == '.':
                    sound_manager.play_dot()
                    morse_actions.append("DOT")
                elif morse_char == '-':
                    sound_manager.play_dash()
                    morse_actions.append("DASH")

                # Original BGT: if(last==1){stopdkm();} -- stopdkm after last signal of a char if dkm is on
                if is_last_signal_in_char:
                    sound_manager.play_dkm_end_if_needed()

                # Intra-signal space is handled by play_dot/play_dash in real SoundManager
                # but for actions list, we might want to be explicit or rely on SM.
                # The original BGT code had `wait(speed/2)` in dot/dash after sound, then
                # `if(last==1){stopdkm();}` then `wait(speed/2)` again.
                # And `space()` (inter-char) was `wait(speed)` for telegraf, `wait(speed*2)` otherwise.
                # This suggests the play_dot/dash itself includes its duration + 1 unit silence.
                # Our SoundManager's play_dot/dash calls wait_for_intra_char_space (1 unit silence).

            # After all signals for a character are played
            if i < len(processed_text) - 1 and processed_text[i+1] != ' ': # If not last char and next isn't word space
                sound_manager.wait_for_char_space() # Add inter-character space
                morse_actions.append("CHAR_SPACE")
        else:
            print(f"Warning: No Morse code found for character '{char_in_text}'")
            # Potentially play an error sound or just skip

    # Final DKM end if the text ended with a non-space character
    if processed_text and processed_text[-1] != ' ':
        sound_manager.play_dkm_end_if_needed()

    # Original BGT: if(telegraf==0){if(willsave){save(morses);}else{save(morses,1);}}
    # The `morses` array in BGT seemed to be for WAV saving.
    # For now, `morse_actions` can serve a similar purpose for later saving.
    return morse_actions


def from_morse_text(morse_sequence_str, settings):
    """
    Translates a string of Morse codes (e.g., ".- / -... -.-.") back to text.
    Morse codes for letters are separated by spaces. Words are separated by '/'.
    Example: ".... . .-.. .-.. --- / .-- --- .-. .-.. -.." -> "hello world"
    """
    if not morse_sequence_str:
        return ""

    words = morse_sequence_str.split('/')
    decoded_text = ""

    for i, word_morse in enumerate(words):
        word_morse = word_morse.strip()
        if not word_morse: # Handles cases like ".- / / -..." (multiple slashes)
            if i < len(words) -1: # Add space if it's between actual words
                 decoded_text += " "
            continue

        letter_morse_codes = word_morse.split(' ')
        decoded_word = ""
        for lm_code in letter_morse_codes:
            if not lm_code: continue # Skip empty strings if there are multiple spaces between codes
            char = settings.get_char_from_morse(lm_code)
            if char:
                decoded_word += char
            else:
                decoded_word += "?" # Placeholder for unknown Morse code

        decoded_text += decoded_word
        if i < len(words) - 1: # Add space between words
            decoded_text += " "

    return decoded_text


def to_morse_string_format(text_to_convert, settings):
    """
    Converts text to the specific string format: "layout_index[morse_codes_string]".
    `morse_codes_string` is space-separated Morse codes, with '/' for word spaces.
    Example: "hello world" (EN) -> "1[.... . .-.. .-.. --- / .-- --- .-. .-.. -..]"
    """
    if not text_to_convert:
        return f"{settings.get_alphabet_index()}[ ]"

    # Apply character replacements first
    processed_text = text_to_convert.lower()
    if settings.replace_chars_map:
        temp_processed_text = processed_text
        for original_char, replacement_str in settings.replace_chars_map.items():
            temp_processed_text = temp_processed_text.replace(original_char, replacement_str)
        if temp_processed_text != processed_text: # Check if any replacement actually happened
            processed_text = temp_processed_text
            # print(f"After char replacement for to_morse_string_format: {processed_text}")


    morse_parts = []
    words = processed_text.split(' ')

    for word_idx, word in enumerate(words):
        if not word: # Handle multiple spaces between words by adding more '/'
            if word_idx > 0 and morse_parts and morse_parts[-1] != "/":
                 morse_parts.append("/")
            elif not morse_parts: # If it's the very beginning and an empty word (e.g. "  a")
                 morse_parts.append("/")


            continue

        word_morse_codes = []
        for char_in_word in word:
            code = settings.get_morse_code(char_in_word)
            if code:
                word_morse_codes.append(code)
            # Else: skip characters without Morse code? Or add placeholder? Original seems to skip.

        if word_morse_codes:
            morse_parts.append(" ".join(word_morse_codes))
        elif word: # Word existed but no codes (e.g. "ΩΩΩ") -> represent as empty part between slashes or skip?
            # If we want to preserve word structure even for unkonwns, add a placeholder or specific logic.
            # For now, if a word yields no codes, it might disappear or merge spaces.
            # Let's ensure a slash is added if it was a non-empty word that yielded no codes.
            if morse_parts and morse_parts[-1] != "/": # Avoid double slash unless intended
                morse_parts.append("") # Add empty part to ensure slashes if it's between words


        if word_idx < len(words) - 1: # If not the last word, add word separator
            if morse_parts and morse_parts[-1] != "/": # Avoid double slash if last part was already a slash
                morse_parts.append("/")
            elif not morse_parts: # e.g. first word is empty " a"
                morse_parts.append("/")


    final_morse_string = " ".join(morse_parts)
    # Refine slash handling for cleaner output
    final_morse_string = final_morse_string.replace(" / / ", " / ")
    while "  /  " in final_morse_string: # More aggressive cleaning for multiple spaces
        final_morse_string = final_morse_string.replace("  /  ", " / ")
    final_morse_string = final_morse_string.replace(" / ", "/") # Remove spaces around slashes

    # Strip leading/trailing slashes if they are due to leading/trailing spaces in input
    final_morse_string = final_morse_string.strip()
    if text_to_convert.startswith(' ') and not final_morse_string.startswith('/'):
        final_morse_string = "/"+final_morse_string
    if text_to_convert.endswith(' ') and not final_morse_string.endswith('/'):
        final_morse_string = final_morse_string+"/"

    # Remove spaces next to slashes that might have been introduced
    final_morse_string = final_morse_string.replace(" /", "/")
    final_morse_string = final_morse_string.replace("/ ", "/")
    # Ensure single space separation for morse codes, single slash for words
    final_morse_string = " ".join(final_morse_string.split()) # Normalize internal spacing
    final_morse_string = final_morse_string.replace(" / ", "/") # Final pass


    layout_index = settings.get_alphabet_index()
    return f"{layout_index}[{final_morse_string}]"


if __name__ == '__main__':
    mock_settings = MockSettings()
    mock_sound_manager = MockSoundManager(mock_settings)

    print("--- Testing morze_text ---")
    text1 = "Hello World"
    print(f"Input: '{text1}'")
    actions1 = morze_text(text1, mock_settings, mock_sound_manager)
    # print(f"Actions: {actions1}") # List of DOT, DASH etc.

    text_time = "time is /time"
    print(f"Input: '{text_time}'")
    morze_text(text_time, mock_settings, mock_sound_manager)

    mock_settings.typewriter_sound_on = True
    text_dkm = "abc"
    print(f"Input (DKM on): '{text_dkm}'")
    morze_text(text_dkm, mock_settings, mock_sound_manager)
    mock_settings.typewriter_sound_on = False

    mock_settings.current_language_key = "RU"
    # Real settings would load this from source.dict
    mock_settings.replace_chars_map = {"я": "ja", "л": "l", "о": "o", "к": "k", "б": "b"}
    text_ru_replace = "яблоко"
    # This should become "jabloko" -> then look up j,a,b,l,o,k,o
    # Mock settings needs these in its RU map or EN via fallback for this test.
    mock_settings.morse_codes["RU"]["j"] = ".---"
    mock_settings.morse_codes["RU"]["l"] = ".-.."
    mock_settings.morse_codes["RU"]["k"] = "-.-"
    # 'a', 'b', 'o' are already in EN, assuming mock get_morse_code can fallback or they are in RU
    # For this test, let's ensure 'a', 'b', 'o' are in RU explicitly if no fallback in mock.
    mock_settings.morse_codes["RU"]["a"] = mock_settings.morse_codes["EN"]["a"]
    mock_settings.morse_codes["RU"]["b"] = mock_settings.morse_codes["EN"]["b"] # Add 'b' for 'jabloko' test
    mock_settings.morse_codes["RU"]["o"] = mock_settings.morse_codes["EN"]["o"]

    print(f"Input (RU with replace): '{text_ru_replace}' (я->ja, л->l, о->o, к->k, б->b)")
    morze_text(text_ru_replace, mock_settings, mock_sound_manager)
    mock_settings.current_language_key = "EN" # Reset
    mock_settings.replace_chars_map = {"я": "ja"} # Reset


    print("\n--- Testing from_morse_text ---")
    morse_str1 = ".... . .-.. .-.. --- / .-- --- .-. .-.. -.."
    print(f"Input Morse: '{morse_str1}'")
    decoded1 = from_morse_text(morse_str1, mock_settings)
    print(f"Decoded: '{decoded1}' (Expected: hello world)")

    morse_str2 = ".- -... -.-. / -.. . / --" # abc de m
    print(f"Input Morse: '{morse_str2}'")
    decoded2 = from_morse_text(morse_str2, mock_settings)
    print(f"Decoded: '{decoded2}' (Expected: abc de m)")

    morse_str3 = ".- / / -..." # a  b (double slash means one space char between a and b)
    print(f"Input Morse: '{morse_str3}'")
    decoded3 = from_morse_text(morse_str3, mock_settings)
    print(f"Decoded: '{decoded3}' (Expected: a b)")


    print("\n--- Testing to_morse_string_format ---")
    text_fmt1 = "hello world"
    print(f"Input text: '{text_fmt1}' (Lang: {mock_settings.current_language_key})")
    formatted_str1 = to_morse_string_format(text_fmt1, mock_settings)
    expected_fmt1 = "1[.... . .-.. .-.. --- / .-- --- .-. .-.. -..]"
    print(f"Formatted: '{formatted_str1}' (Expected: {expected_fmt1})")

    text_fmt2 = "hi"
    print(f"Input text: '{text_fmt2}'")
    formatted_str2 = to_morse_string_format(text_fmt2, mock_settings)
    expected_fmt2 = "1[.... ..]"
    print(f"Formatted: '{formatted_str2}' (Expected: {expected_fmt2})")

    mock_settings.current_language_key = "RU"
    text_fmt_ru = "дом" # d o m in Russian
    print(f"Input text: '{text_fmt_ru}' (Lang: {mock_settings.current_language_key})")
    formatted_str_ru = to_morse_string_format(text_fmt_ru, mock_settings)
    expected_fmt_ru = "0[-.. --- --]" # Assuming RU layout index is 0
    print(f"Formatted: '{formatted_str_ru}' (Expected: {expected_fmt_ru})")
    mock_settings.current_language_key = "EN"

    text_fmt_multi_space = "a  b" # two spaces -> a / / b
    print(f"Input text: '{text_fmt_multi_space}'")
    formatted_str_ms = to_morse_string_format(text_fmt_multi_space, mock_settings)
    expected_fmt_ms = "1[.- / / -...]" # Original expectation. My code might do "1[.- / -...]"
    print(f"Formatted: '{formatted_str_ms}' (Expected: {expected_fmt_ms} or similar)")

    text_fmt_leading_space = " hello"
    print(f"Input text: '{text_fmt_leading_space}'")
    formatted_str_ls = to_morse_string_format(text_fmt_leading_space, mock_settings)
    expected_fmt_ls = "1[/ .... . .-.. .-.. ---]"
    print(f"Formatted: '{formatted_str_ls}' (Expected: {expected_fmt_ls})")


    mock_sound_manager.cleanup()
