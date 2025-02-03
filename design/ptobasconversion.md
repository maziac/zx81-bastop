# .p to .bas file conversion and vice versa

REM, quoted string:

| .p    |     | .bas                | Comment                            |
| :---- | --- | :------------------ | :--------------------------------- |
| 00    | <-> | ' '                 | Space                              |
| 01-0A | <-> | \' - \~~            | Graphics                           |
| 0B    | <-> | "                   | Starts/ends quoted string          |
| 0C    | <-> | #                   | Pound                              |
| 0D-3F | <-> | $-Z                 |                                    |
| 40-42 | <-> | [RND],[INKEY$],[PI] |                                    |
| 43-75 | <-> | `[67]-[117]`        |                                    |
| 76    | <-> | `[118]`             | Newline                            |
| 77-7F | <-> | `[119]-[127]`       |                                    |
| 80-8A | <-> | \::-\!!             | Graphics                           |
| 8B    | <-> | %"                  | Inverse quotation char             |
| 8C    | <-> | %#                  | Inverse pound                      |
| 8D-BF | <-> | %$-%Z               | Inverse                            |
| C0    | <-> | \"                  | Quotation graphic                  |
| C1-D7 | <-> | [AT ]-[NOT ]        |                                    |
| D8    | <-> | [**]                |                                    |
| D9-DA | <-> | [ OR ]-[ AND ]      |                                    |
| DB-DD | <-> | [<=],[>=],[<>]      |                                    |
| DE-FF | <-> | [ THEN ]-[COPY ]    |                                    |
|       |     | \n                  | REM: Line end, Q.: error           |
| 0     | <-  | \t                  |                                    |
| n     | <-  | `[n]`               | Or any other number n=0-255        |
| ...   | <-  | `[!block=n]`        | Reserves a block of n bytes.       |
| ...   | <-  | `[!include file]`   | Includes a file. (rel. path)       |
|       | <-> | `[#...]`            | A comment.                         |


Otherwise:

| .p    |     | .bas             | Comment                         |
| :---- | --- | :--------------- | :------------------------------ |
| 00    | <-> | ' '              | Space                           |
| 01-0A | <-> | \' - \~~         | Graphics                        |
| 0B    | <-> | "                | Starts/ends quoted string       |
| 0C    | <-> | #                | Pound                           |
| 0D-3F | <-> | $-Z              |                                 |
| 40-42 | <-> | RND,INKEY$,PI    | Ambiguous if used for var names |
| 43-75 | <-> | `[67]-[117]`     |                                 |
| 76    | <-> | `[118]`          | Newline                         |
| 77-7F | <-> | `[119]-[127]`    |                                 |
| 80-8A | <-> | \::-\!!          | Graphics                        |
| 8B    | <-> | %"               | Inverse quotation char          |
| 8C    | <-> | %#               | Inverse pound                   |
| 8D-BF | <-> | %$-%Z            | Inverse                         |
| C0    | <-> | \"               | Quotation graphic               |
| C1-D7 | <-> | 'AT '-'NOT '     | {1}                             |
| D8    | <-> | **               |                                 |
| D9-DA | <-> | ' OR '-' AND '   | {1}                             |
| DB-DD | <-> | <=,>=,<>         |                                 |
| DE-FF | <-> | ' THEN '-'COPY ' | {1}                             |
|       |     |                  |                                 |

Note:
- {1} All text with more than 1 characters is ambiguous when converting back
  from bas to p: RND could mean `[RND]` or R,N,D. This can be a problem especially for variable names.
- ' are used in the table only when necessary to indicate spaces.
- The special codes:
  - `[!block=n]`: Creates a block of the given size. Useful in REM statements to "alloc" a certain amount of bytes in the REM line.
  - `[!include file]`: Includes the bytes of a file. Useful in REM statements to include machine code. The file path is relative to the .bas file.
  - `[#...]`: A comment. The ptobas conversion might enter such a comment, e.g. in case of number decoding, if the digits are different to the encoded number.


# Comment Header
Some data in the p-file is not included in the BASIC program.
This is the d-file (the screen data) and the BASIC variables.
When extractiong the BASIC program from the p-file and converting it into a .bas text file this information would get lost.
In order to preserve it it is put in a special format and output along with the .bas program as comments.
This information is put in comments that use an exclamation mark as 2nd character, i.e. `#!`

- BASIC start line: Sets the start line of the basic program after loading (nxtlin):
  `#!basic-start=<n>`, e.g. `#!basic-start=100`
  If not used the program is stopped after loading.
- D-File: The screen. Each dfile line starts with `#!dfile:`, e.g.:
  ~~~
  #!dfile:            HELLO
  #!dfile:            WORLD!
  ~~~
  Default is an expanded d-file. If a collapsed version is wanted (e.g. for 1K programs) a `#!dfile-collapsed` is required.
- BASIC variables: Are put in as a byte array. E.g.
  ~~~
  #!basic-vars: [54,0,255,192]
  ~~~
  There can be many `#!basic-vars:`lines or none (if there was no variable used). All bytes are encoded as simple decimal number.
  The trailing 128 is excluded.
- ZX81 System Variables: Some of the system variables are also put in the comment header.
  Variables are only put here if they are different from the default value that would be used anyhow in a bas to p conversion.
  And, of course, variables that depend on the BASIC itself (e.g. the BASIC program length) are also not added.
  Other variables appear with the suffix `#!system-vars:` followed by the variable name and it's value, e.g. `#!system-vars: DF_SZ=0`
  The length of the data (byte, word or array) is determined by the system variable. E.g. DF_SZ expects a byte, E_PPC expects a word and MEMBOT expects and array (e.g. '[4,46,125,6]').

The comment header will be put at the start of the file by the p to bas conversion.
However, when converting the bas to a p-file the comment header lines can be everywhere, although it makes sense to keep them together at the start o the file.

This here is a valid comment header:
~~~
# The line where the BASIC program will start:
#!basic-start=100

# The screen data:
#!dfile:
#!dfile:
#!dfile:            MY
#!dfile:           COOL
#!dfile:          PROGRAM

# The BASIC variables:
#!basic-vars: [54,0,255,192]
#!basic-vars: [67,4,29,67,136,98,45,22]

# BASIC program start:
100 PRINT "THE PROGRAM STARTS"
...
~~~


# General BAS parsing
How it works:
- Lines starting with "#!" are interpreted a comment header.
- Lines starting with "#" are ignored. (Comments)
- Numbers start with a digit or .
  Note: the + or - does not belong to the number (checked on a ZX81)
- Strings and REM lines have a special conversion
- Codes
  - Graphic codes (start with \)
  - Inverse (start with %)
  - The tokens (commands like GOTO, PRINT, etc.)
  - Special codes
    - Codes that have no visible representation (e.g. "[127]" for code 0x7F)
  - Bracketized tokens
    - it is also allowed to use e.g. "[STOP]" instead of STOP for 0xE3.

Important things to note:
- \, % and [ are characters that do not exist in the ZX81 charset.
- `#` is used for comments and for the ZX81 pound sign.
- Spaces at the end of a line are ignored. So, a p-file converted to .bas and back to p-file can have a different size. The p-file converter will add spaces if the original has spaces but an editor might cut them off anyway.
- In REM-lines all codes will have a translation. Spaces at the end of a line are relevant. Therefore the p-file converter converts the last space as "[0]" to prevent that an editor cuts them off.
- The tokens are checked with the longest tokens first. This is to prevent that e.g. "<>" is not recognized as "<" and ">" but as a single code.
- REM and quoted strings: Tokens in quoted strings can be ambiguous. E.g. "STOP" could have been originally a single code (0xE3) or it was compounded from "S" "T" "O" "P". There is no way to tell. The 'convert' function will convert it as single characters.
- However, the p to bas conversion will put those tokens in brackets (e.g. "[STOP]"). REM lines you often find machine code. The tokens in brackets gurantee that when converting the bas file  to a p-file that the code can be 100% reconstructed.
  Here are some examples for otherwise ambiguous strings: <>, <=, >=, **, RND, INKEY$, PI, AT to COPY

## Variable names
A remaining issue that cannot be fully resolved without a complete BASIC interpreter is the naming of some variables.
If you choose a variable name that coincides with a ZX81 command or function, it may prevent the program from being correctly converted into a .p file.
This issue is particularly likely to occur if you have already converted from a .p file to a .bas file and back to a .p file, resulting in a non-functional .p file.
The most probable cause is ambiguous variable names. For example:
~~~basic
10 LET POKE = 60
20 GOSUB POKE
30 STOP
60 PRINT "SUBROUTINE"
70 RETURN
~~~

In case you encounter such a problem best is to rename the variable names.

Note:
If the BASIC command includes a space, here e.g. "POKE ", then zs81-bastop can in many cases choose the right: command or single characters.
E.g. "POKE*5" woud interpret the "POKE" as single characters, whereas "POKE *5" would find the token (number) used for "POKE " instead.
"RND" for example has no trailing space, a variable name of the same "RND" will definitely result in problems.
