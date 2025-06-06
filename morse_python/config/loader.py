import re
import os # Added for path manipulation

# Get the directory where the script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SOURCE_DICT_PATH = os.path.join(SCRIPT_DIR, "source.dict")
DEFAULT_PROCS_PATH = os.path.join(SCRIPT_DIR, "procs.txt")

def load_morse_dictionary(filepath=DEFAULT_SOURCE_DICT_PATH):
    """
    Loads the Morse dictionary from the given filepath.
    Assumes key=value format. Ignores empty lines and lines without '='.
    Lines starting with # or ; are treated as comments.
    """
    morse_dict = {}
    import codecs # For unescaping
    try:
        with open(filepath, 'r', encoding='utf-8') as f: # Read as text
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or line.startswith(';') or '=' not in line:
                    continue

                key_raw, value_raw = line.split('=', 1)
                # Decode \xNN sequences in keys and values to their corresponding Latin-1 characters
                # e.g., "\\xe0" becomes 'à' (U+00E0)
                key = codecs.decode(key_raw.strip(), 'unicode_escape')
                value = codecs.decode(value_raw.strip(), 'unicode_escape')
                morse_dict[key] = value
    except FileNotFoundError:
        print(f"Error: Dictionary file not found at {filepath}")
        return None # Or raise an exception
    except Exception as e:
        print(f"Error parsing dictionary file {filepath}: {e}")
        return None # Or raise an exception
    return morse_dict

def load_scheduled_tasks(filepath=DEFAULT_PROCS_PATH):
    """
    Loads scheduled tasks from the given filepath.
    Assumes format: time=text or /command=text
    Example: 10:30:00=Hello World
             /telltime=The time is /time
    Returns a list of tuples or dictionaries representing tasks.
    For now, it will return a list of raw lines that are not empty or comments.
    Further parsing will be handled by the scheduling logic.
    """
    tasks = []
    import codecs # Ensure codecs is available here too if procs.txt might use \xNN
    try:
        with open(filepath, 'r', encoding='utf-8') as f: # Read as text
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or line.startswith(';'):
                    # For procs.txt, values are generally direct strings, but if they could have \xNN, decode them.
                    # For now, assume procs.txt lines don't need unicode_escape on the whole line.
                    # If specific values within procs.txt need it, parsing logic would be more complex.
                    # tasks.append(codecs.decode(line, 'unicode_escape'))
                    tasks.append(line) # Assuming direct UTF-8/ASCII for procs.txt content
                    continue

                # If procs.txt lines have key=value and value needs unescaping:
                if '=' in line:
                    key_raw, value_raw = line.split('=',1)
                    # Example: if a task is like "/say=\xe0\xe1", then value_raw needs decoding
                    # For now, this subtask focuses on source.dict, so keep procs simple.
                    # value = codecs.decode(value_raw.strip(), 'unicode_escape')
                    # tasks.append(key_raw.strip() + "=" + value)
                    tasks.append(line) # Re-add raw line if not modifying values yet
                else:
                    # tasks.append(codecs.decode(line, 'unicode_escape'))
                    tasks.append(line) # Re-add raw line

    except FileNotFoundError:
        print(f"Error: Scheduled tasks file not found at {filepath}")
        return []
    except Exception as e:
        print(f"Error parsing scheduled tasks file {filepath}: {e}")
        return []
    return tasks

if __name__ == '__main__':
    # Test loading the dictionary
    # Construct paths relative to this script's location for the test run
    test_source_dict_path = os.path.join(os.path.dirname(__file__), "source.dict")
    test_procs_path = os.path.join(os.path.dirname(__file__), "procs.txt")

    # For testing loader.py directly, need to ensure source.dict is where it's expected
    # or pass an explicit path. The default paths are relative to this script.
    morse_codes = load_morse_dictionary() # Uses DEFAULT_SOURCE_DICT_PATH
    if morse_codes:
        print(f"Loaded {len(morse_codes)} Morse code entries.")
        # Print a few entries as a sample
        sample_count = 0
        for k, v in morse_codes.items():
            print(f"{k} = {v}")
            sample_count += 1
            if sample_count >= 5:
                break
    else:
        print("Failed to load Morse dictionary.")

    print("\n--- Scheduled Tasks ---")
    scheduled_tasks = load_scheduled_tasks(test_procs_path)
    if scheduled_tasks:
        print(f"Loaded {len(scheduled_tasks)} task lines.")
        for task_line in scheduled_tasks[:5]: # Print first 5 tasks as sample
            print(task_line)
    else:
        print("No scheduled tasks loaded or file not found.")
