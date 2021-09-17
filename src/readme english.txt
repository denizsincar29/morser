hello! welcome to my very very functional morse code tool!
to start it, do the folowing steps
if you have bgt, simply open morser.bgt
if you don't have bgt installed, open morser.bat.
at startup, you will hear long beep sound. it only makes at first startup of the program. it indicates that all beep settings and sounds are created successfully. if you don't hear this sound at first launch, then try to morse. if you don't here the sound, then contact me.
to translate a text to a morse code, press right shift key. then you will be prompted to enter a text. then it will play.
to translate a text file into morse, press right ctrl. enter filename or file path and press enter to play.
to save morsed text or file to a wav, press left shift+enter.
to replay recent morse, press enter.
to type in morsecode in real time, press letter keys on a keyboard, or press space to key like on a morse key.
when morsing, the program will recognize what letters do you type, and show the last letter on braille display. to toggle announcing the letters, press tab. if it is on, nvda will speak the letters you type on a morse key with spacebar.
for example if you want to write something in morse code, but he/she knows only braille: you can turn sound off by pressing f12, connect a braille display and just type in morse. and your friend will recognize it with fingers on your braille display.
you don't need to wait the program to finish morsing the letter. just type letter by letter, and it will morse it to you in real time.
to change your speed, press and hold left or right arrows. when released, it will play some little morse sample.
to change pitch, press and hold up or down arrow.
tu toggle the oldschool morse code keyboard sound, press f11. it only works for morsing text or realtime typing on a keyboard. try it out.
to turn off all sounds, press f12. to turn it on again, press f12 again.
to change the morsing mode, press f1.
you have 3 morsing modes.
1 is a standard wave morse synthesizer sound.
2 is the great telegraphing sound.
3 is the braille display morsing, only active if configuration is not set to /braille=none
to record your morse, press` f2. it will beep 2 times. start keying on spacebar key. when you finish, press enter, and it will play the file. press enter if you satisfy. if not, press escape. while recording, you can press escape to cancel.
to change the language of the exercises only in the main mode, not in exercise mode, press ctrl space. it will cycle between english and russian. (only for receaving and keying exercises, f3 and f4.)
to train your skills at receiving morse, press f3. you will be asked how much letters do you want to receive in 1 group. and computer will choose and morse group of random latin or russian letters and numbers, depending on the chosen language. you must type them on the keyboard. after 1 minute of morse, you will be told how many mistakes you have and how many letters you received in 1 minute.
to train your skills at morse keying, first choose your speed by holding right or left arrows, then, if needed, choose your language by pressing ctrl space, then press f4.
you will be asked how meny letters do you want to key in each group. and then the nvda screenreader will count: 5, 4, 3, 2, 1, and it will say a group of latin or ciryllic letters, based on your language (ctrl+space), and numbers. write them on a space key like on a morse key. the actual letter or number you type will be said by screenreader. even if you type wrong, it will say what letter has been typed.
after the group complete, it will say: next, and it will say the groups of letters.
after 1 minute, you will not be able to key on space key, nvda will say: complete. press enter to get info. like it says, press enter. the message box will pop up with the information of your speed, mistakes and successes. press ok to return.
notepad
a morse notepad is a simple morse writer. you choose your speed with left and right arrows, then press f5. then just start keeing. if you want to change the language, press ctrl space.
to copy the text, press ctrl+c
to edit the text in an input box, press ctrl+e.
to save the text into a text file, press ctrl s. enter the file name with extention, and press enter.
to save the morse representation of text, press ctrl+shift+enter. enter the file name and it will save it for you. 
morsing at a specific time.
if you want computer to morse a message at some specific time, for example to morse "go to shopping" at 3 pm, press f6 in main menu.
enter the time in the input prompt like this: hour:minute:second separated by colon.
note, don't write 0 at the start of the number. for example instead of 09:30:00 write 9:30:0
after you enter the time, press enter. you will be asked to enter text. enter what to morse at that time. for example: hello, go to market.
if the program is opened, it will morse at that time. the morse speed and sound you set in the main menu will be used.
another way is to open procs.txt in the main morser folder, and write:
time=text
where time is the morsing time, and the text is what to morse
the time is written as shown in the first way of morsing at some specific time: hour:minute:second
instead of hour:minute:second, you can write /telltime, and it will morse the text after equals sign (=) every hour. for example:
/telltime=hello, a new hour started
you can even do like this:
/telltime=the time is /time
or like this
12:30:0=the time is /time, conference is starting.
calibrating your morsing speed (very early beta)
to calibrate your speed, press f7.
computer will say: start morsing.
you must morse some real words or numbers. it will not check your morsed letters, but it will check the length of dots. after 50 dots, it will play some morse sample, and calibration will be finished.

setting a stream of morse to another output device
the output device number is stored in the configuration parameter /output.
/output=def meens that you use the default output device. set /output to def if you want to set it to default.
you would ask, how to know what number is which output device? and i would answer:
open interpreter folder, and open the selectdevice.bat or selectdevice.bgt.
an alert box with all output device numbers will appear. for example
speakers realtech high definition audio is number 0, line 1 virtual audio cable is number 1.
then, when you press ok, a notepad with the config file will appear.
find /output, and after the equals (=) sign, type the number of the needed output device.
save it, and close with alt f4.
another way to change the output device for just one session of the morser program.
in the folder of the morse program create an empty folder with the name: stream
then launch great morser. it will detect the folder, delete it and ask you to open an output device. choose it with up and down arrows. press enter to open.

configuration file
to change the configuration, go to interpreter folder, then start dictserializer.bat or dictserializer.bgt, depends if you have bgt installed or not, see very beginning of readme.
 you will be took to a notepad window.
/russian is the russian alphabet. needed for layouts
/english is the english alphabet.
/numbers are numbers from 1 to 0
/punct is punctuations. dot, comma, question and exclamation mark
/replace=letters to replace. for example russian alphabet has a some letters that translated equally into morsecode.
/braille is the braille sign to pop up on a braille display. it is used to recognize morse code with your fingers without beeping. for example you can write:
/braille=----------
then a line will pop up on a braille display. and each time a new dot or dash is transmeted, a line will pop up.
after all /commands, letters and numbers are assigned. don't change them. if you need, you can change only dots and dashes of each letter, but don't delete or modify the position of the letters.
after you finished with the config file, simply save it. when saved, the dictserializer will encode your config file. just close notepad with alt f4.
morse commands
when the morse program translates some text to morse, it looks for the folowing commands:
/time, morses the time. for example, you can write; the time is /time. and it will morse the time instead of /time


that meens that this commands work everywhere.

to do list
playing .morse files with dots and dashes.
creating .morse files. sending them to server: not decided.
supporting arduino morse keys: not decided.
contacting me by sending morse messages by email. haha
keying speed detection system, partially integrated.
q-code exercise: not decided.
sending messages to a morse tranceaver via arduino: hardwere needed, not decided.
and finally, translating the interface to russian! maybe not finaly, but i don't know when.