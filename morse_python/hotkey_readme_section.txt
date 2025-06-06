## Hotkeys

This Python version of the Morse application uses the following hotkeys:

### General Application Hotkeys:
-   **Q**: Quit the application.
-   **L**: Cycle through available languages (e.g., EN, RU).
-   **F1**: Toggle Telegraf sound effect set for Morse playback.
-   **F11**: Toggle Typewriter sound effect for Morse playback.
-   **F12**: Toggle main sound ON/OFF.
-   **Page Up / Page Down**: Adjust Morse speed (dot duration).
-   **TAB**: Toggle "Speak Letters" mode (simulated, prints to console/message line).
-   **Enter (in main view)**: Replay the last Morse sequence that was generated from text.
-   **Alphanumeric Keys (in main view)**: Morse the typed character in real-time.

### Text and File Operations:
-   **Ctrl+T**: Enter text input mode to type a message, then Morse it.
-   **Ctrl+O**: Enter filename input mode to load a text file, then Morse its content.
-   **Ctrl+W**: "Save Morse" - prompts for a filename and saves the last *original text* that was morsed along with its full Morse code representation (layout[sequence]) to a `.morse.txt` file. (Conceptual replacement for "Save to WAV").

### Practice and Utility Modes:
-   **F2: Record Morse Mode**
    -   Press F2 to enter/exit Record Morse mode.
    -   In this mode:
        -   Type `.` for a dot.
        -   Type `-` for a dash.
        -   Press `Space` to finalize the current Morse character and add it to your sequence.
        -   Press `Enter` to finalize the current Morse character and add a word separator (`/`) to your sequence.
    -   When exiting, you'll be prompted to save the recorded raw Morse string (e.g., ".- -... / -.-.") to a file.

-   **F3: Guess Exercise Mode**
    -   Press F3 to start/stop the Guessing Exercise.
    -   The application will play a word in Morse code.
    -   You'll be prompted to type the word you heard.
    -   Scoring and feedback are provided.

-   **F4: Keying Exercise Mode**
    -   Press F4 to start/stop the Keying Exercise.
    -   The application will display a character or short word.
    -   You key in the Morse code using `.` for dot, `-` for dash.
    -   Press `Space` or `Enter` to submit your Morse for the current stimulus.
    -   Scoring and feedback are provided.

-   **F5: Notepad Mode**
    -   Press F5 to enter/exit Notepad mode.
    -   In this mode:
        -   Type `.` for a dot.
        -   Type `-` for a dash.
        -   Press `Space` to finalize the current Morse character and add it to the notepad text, followed by a space.
        -   Press `Enter` to finalize the current Morse character and add a newline to the notepad text.
        -   **Ctrl+C (in Notepad)**: (Placeholder) Displays "copied" message with current notepad text.
        -   **Ctrl+S (in Notepad)**: Prompts for a filename to save the current notepad text.

-   **F6: Scheduled Tasks**
    -   Press F6 to display a list of loaded scheduled Morse tasks from `procs.txt`.
    -   Tasks are automatically checked and played at their scheduled times while the application is running.
