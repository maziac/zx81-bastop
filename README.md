# Support
If you like the "ZX81 BASIC to P-File Converter" please consider supporting it.

<a href="https://github.com/sponsors/maziac" title="Github sponsor">
	<img src="assets/local/button_donate_sp.png" />
</a>
&nbsp;&nbsp;
<a href="https://www.paypal.com/donate/?hosted_button_id=K6NNLZCTN3UV4&locale.x=en_DE&Z3JncnB0=" title="PayPal">
	<img src="assets/local/button_donate_pp.png" />
</a>


# ZX81 BASIC to P-File Converter
This extension can to 2 things:
1. It converts ZX81 P-Files into BASIC text files
2. It converts ZX81 BASIC text into P-files

During conversion the REM lines are completely restored.
I.e. all the machine code will remain and survive back and forth conversion.

You can use the tool for
- reverse engineering ZX81 p-files
- modifying ZX81 p-files (vonvert to .bas, modify, convert back to .p)
- or genuine BASIC development

There is also a viewer for p-files included that shows the system variables, the BASIC code (hex and as BASIC text), the DFILE (screen) area and the BASIC variables area.

# Installation

Install through Visual Studio Code Marketplace.
The extension is called "ZX81 BASIC to P-File Converter (zx81-bastop)".


# Usage
## P-Files
Right click on a .p file in the explorer area.
Choose
- "Convert P-File to ZX81 BASIC": This will open a file selector that ask for a file name for the BASIC file.
- or "View ZX81 P-File": to open the viewer
![](assets/local/pfileview.jpg)
In the opened file view you have 2 buttons: one to copy the BASIC into the clipboard and the other to save the BASIC text to a file.

## BASIC Files
Right click on a .bas file in the explorer area or in an opened editor.
Choose "Convert ZX81 BASIC to P-File".
This will open a file selector that ask for a file name for the p-file.

# More Info
- In most cases the extension should be capable to display p-files correctly.
  If you encounter problems please let me know.
- Especially 1k programs often also used the DFILE area as BASIC program to start the machine code. Often this extension will be able to deal with it and display even the BASIC inside the DFILE area.
- The BASIC to p-file converter can cope with lower or upper case. Both is treated the same. The output is, of course, always uppercase.
- This extension is not a full BASIC parser. It just looks for tokens and converts them.
  This may result in some ambiguities in BASIC variable names.
  If you e.g. use a name "PRINT" as a variable name it is difficult to distinguish it from the BASIC command "PRINT".
  To overcome this problem
  - for your own code: don't use ambiguous variable names
  - for code converted from a p-file:
    - either change the ambiguous variable names manually
    - use the "Bracketized Tokens" flag in the p-file viewer before saving the BASIC text. This will surround all BASIC commands with brackets, e.g. "[PRINT]" so that they are easy to recognize for the BASIC to p conversion.
    - even with this ambiguity in many cases the conversion runs fine. Use the 2 other options only if you run into trouble.

# The BASIC text format
The generated BASIC text format is mainly similar to the [zxtext2p](https://freestuff.grok.co.uk/zxtext2p/index.html) format.
The main difference is that labelled code is not supported. But is uses the same escape codes and graphic codes.

Additionally a "bracketized tokens" mode is supported.
I.e. each command token can be put in square brackets (e.g. "[PRINT]") to clearly differentiate it from single characters (e.g. "P", "R", "I", "N", "T").

Furthermore it is possible to add more information into the comment lines.
Normal comment lines (like in zxtext2p) start with a '#'.
If a line start with '#!' it is a special comment that can define additional properties for the p-file generation.

If you don't use any #! in your BASIC program a p-file is created that contains the BASIC program, but an empty DFILE (blank screen) and no BASIC variables section. When you load the p-file it is loaded but not started.

To make the program automatically start you need to a special comment like:
~~~
#!basic-start=100
~~~
which will start the BASIC program at line 100 after loading.

With lines, e.g.:
~~~
#!dfile:
#!dfile:   HELLO
#!dfile:   WORLD
~~~
you would create a DFILE with the text "HELLO" "WORLD" spanning over 2 lines.Starting at the 2nd line and the 3rd column.
You can omit the trailing (unused) DFILE lines. When converting they are appended automatically.
By default an expanded dfile is created. If you want to use a collapsed dfile you can add
~~~
#!dfile-collapsed
~~~

For completeness here is also the BASIC variables section, e.g.:
~~~
#!basic-vars:[177,166,168,185,174]
~~~
This will hold the data for the BASIC variables used.
It is nothing you should normally edit by yourself.
It is generated by the p-file conversion to allow to convert the BASIC program back to a p-file while maintaining the variables section.

# Upper/Lower Case
The p-file to BASIC conversion always uses uppercase.
However, the BASIC to p-file conversion is case insensitive.

If you want to turn a p-file to BASIC converted file into lowercase you can use vscode in-built functionality:
Select all text, choose comand-palette "Transform to lowercase".

# Recommended other extension
- ZX81 BASIC Syntax Highlighting: [ZX81-Basic](https://marketplace.visualstudio.com/items?itemName=WilsonPilon.zx81basic)
- [DeZog](https://marketplace.visualstudio.com/items?itemName=maziac.dezog): Z80 (ZX81) Machine Code Debugger to run the P-Files inside vscode.
