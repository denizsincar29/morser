import pygame
import time
import os

class SoundManager:
    def __init__(self, settings, sounds_base_path="sounds/"): # Adjusted default
        self.settings = settings
        self.sounds_base_path = sounds_base_path
        self.sounds = {}
        self.active_sound_set = 0 # 0 for normal, 1 for telegraf/dkm

        try:
            pygame.mixer.init()
            self._load_sounds()
        except pygame.error as e:
            print(f"Pygame mixer initialization failed: {e}. Sound will be disabled.")
            if self.settings: # Ensure settings object exists
                self.settings.sound_on = False # Disable sound if mixer fails
            pygame.mixer.quit()


    def _resolve_path(self, filename):
        return os.path.join(self.sounds_base_path, filename)

    def _load_sounds(self):
        if not pygame.mixer.get_init():
            print("Mixer not initialized, cannot load sounds.")
            return

        sound_files = {
            "dot": [self._resolve_path("dot.wav"), self._resolve_path("dot2.wav")],
            "dash": [self._resolve_path("dash.wav"), self._resolve_path("dash2.wav")],
            "beep": self._resolve_path("beep.ogg"),
            "start": self._resolve_path("start.wav"),
            "end": self._resolve_path("end.wav"),
            "dkm_start": self._resolve_path("dkmstart.wav"),
            "dkm_end": self._resolve_path("dkmend.wav"),
        }

        for name, path_or_paths in sound_files.items():
            if isinstance(path_or_paths, list):
                self.sounds[name] = []
                for p in path_or_paths:
                    try:
                        sound = pygame.mixer.Sound(p)
                        self.sounds[name].append(sound)
                    except pygame.error as e:
                        print(f"Failed to load sound {p}: {e}")
                        self.sounds[name].append(None)
            else:
                try:
                    self.sounds[name] = pygame.mixer.Sound(path_or_paths)
                except pygame.error as e:
                    print(f"Failed to load sound {path_or_paths}: {e}")
                    self.sounds[name] = None

        beep_path = self._resolve_path("beep.ogg")
        if not os.path.exists(beep_path) or self.sounds.get("beep") is None:
            print(f"'beep.ogg' not found or failed to load. Attempting to create a dummy one.")
            if self._create_dummy_beep(beep_path):
                try:
                    self.sounds["beep"] = pygame.mixer.Sound(beep_path)
                    print("Dummy 'beep.ogg' loaded.")
                except pygame.error as e:
                    print(f"Failed to load dummy 'beep.ogg': {e}")


    def _create_dummy_beep(self, filepath):
        print(f"Placeholder: Would create a dummy sound file at {filepath}")
        return False


    def _get_timing(self):
        dot_duration_ms = self.settings.get_speed()
        return dot_duration_ms / 1000.0

    def play_sound(self, sound_name_key, sound_set_idx_override=None):
        if not self.settings.sound_on or not pygame.mixer.get_init():
            return

        sound_to_play = None
        current_sound_set = self.active_sound_set
        if sound_set_idx_override is not None:
            current_sound_set = sound_set_idx_override

        if sound_name_key in self.sounds:
            sound_item = self.sounds[sound_name_key]
            if isinstance(sound_item, list):
                if 0 <= current_sound_set < len(sound_item) and sound_item[current_sound_set]:
                    sound_to_play = sound_item[current_sound_set]
                elif sound_item and sound_item[0]: # Fallback to first sound if available
                    sound_to_play = sound_item[0]
            elif sound_item:
                sound_to_play = sound_item

        if sound_to_play:
            sound_to_play.play()
        else:
            print(f"Warning: Sound '{sound_name_key}' (set {current_sound_set}) not loaded or invalid.")


    def play_dot(self):
        dot_duration_s = self._get_timing()
        self.play_sound("dot")
        time.sleep(dot_duration_s)
        self.wait_for_intra_char_space()

    def play_dash(self):
        dot_duration_s = self._get_timing()
        self.play_sound("dash")
        time.sleep(dot_duration_s * 3)
        self.wait_for_intra_char_space()

    def _active_dkm(self):
        return self.settings.typewriter_sound_on

    def play_dkm_start_if_needed(self):
        if self.settings.sound_on and self.settings.typewriter_sound_on:
            self.play_sound("dkm_start")

    def play_dkm_end_if_needed(self):
        if self.settings.sound_on and self.settings.typewriter_sound_on:
            self.play_sound("dkm_end")

    def wait_for_duration(self, duration_s):
        if not self.settings.sound_on:
            time.sleep(duration_s / 10.0 if duration_s > 0.01 else 0)
            return
        time.sleep(duration_s)

    def wait_for_intra_char_space(self):
        dot_duration_s = self._get_timing()
        self.wait_for_duration(dot_duration_s)

    def wait_for_char_space(self):
        dot_duration_s = self._get_timing()
        self.wait_for_duration(dot_duration_s * 2)

    def wait_for_word_space(self):
        dot_duration_s = self._get_timing()
        self.wait_for_duration(dot_duration_s * 6)

    def set_sound_set(self, set_index):
        if 0 <= set_index < 2:
            self.active_sound_set = set_index
            print(f"Sound set changed to: {set_index}")

    def toggle_sound_on_off(self):
        self.settings.sound_on = not self.settings.sound_on
        print(f"Sound on: {self.settings.sound_on}")
        if not self.settings.sound_on:
            pygame.mixer.stop()

    def cleanup(self):
        if pygame.mixer.get_init():
            pygame.mixer.quit()

if __name__ == '__main__':
    class MockSettings:
        def __init__(self):
            self.sound_on = True
            self.typewriter_sound_on = False
            self._speed = 70

        def get_speed(self):
            return self._speed

        def set_speed(self, s):
            self._speed = s

    mock_settings = MockSettings()

    # The SoundManager expects sounds to be in "sounds/" relative to CWD.
    # The earlier copy step put them in /app/morse_python/sounds/
    # If this script is run from /app/morse_python/, paths should align.

    print("Initializing SoundManager...")
    # Assuming CWD is /app/morse_python, sounds_base_path="sounds/" is correct
    sm = SoundManager(mock_settings)

    if not mock_settings.sound_on:
        print("SoundManager disabled sound due to mixer init error. Exiting test.")
    else:
        print("Playing dot (normal)...")
        sm.play_dot()
        time.sleep(0.5)

        print("Playing dash (normal)...")
        sm.play_dash()
        time.sleep(0.5)

        mock_settings.typewriter_sound_on = True
        sm.set_sound_set(1)

        print("Playing DKM start sound...")
        sm.play_dkm_start_if_needed()
        # Add small delay to hear dkm_start before dkm_end potentially cuts it
        # Or ensure dkm sounds don't cut each other if played back to back
        time.sleep(0.2)


        print("Playing dot (telegraf/DKM sound set)...")
        sm.play_dot()
        time.sleep(0.5)

        print("Playing DKM end sound...")
        sm.play_dkm_end_if_needed()
        time.sleep(0.2) # Similar delay to hear it


        print("Playing dash (telegraf/DKM sound set)...")
        sm.play_dash()
        time.sleep(0.5)

        sm.set_sound_set(0)
        mock_settings.typewriter_sound_on = False

        print("Testing silences:")
        print("Playing char space (3 dots total silence)...")
        dot_time = sm._get_timing()
        print(f"(Dot time: {dot_time:.3f}s)")
        sm.wait_for_duration(dot_time * 3)
        print("Done char space.")
        time.sleep(0.5)

        print("Playing word space (7 dots total silence)...")
        sm.wait_for_duration(dot_time * 7)
        print("Done word space.")
        time.sleep(0.5)

        print("Toggling sound off...")
        sm.toggle_sound_on_off()
        sm.play_dot()
        print(f"Sound on: {mock_settings.sound_on}")
        time.sleep(0.5)

        print("Toggling sound on...")
        sm.toggle_sound_on_off()
        sm.play_dot()
        print(f"Sound on: {mock_settings.sound_on}")

        print("SoundManager tests complete.")
        sm.cleanup()
