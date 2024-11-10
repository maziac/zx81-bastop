


export class Zx81Tokens {
	// A few often needed constants
	public static readonly SPACE = 0;
	public static readonly QUOTE = 0x0B;
	public static readonly NEWLINE = 0x76;
	public static readonly NUMBER = 0x7E;
	public static readonly REM = 0xEA;
	public static readonly DIM = 0xE9;
	public static readonly LET = 0xF1;


	/** The ZX81 charset and tokens.
	 * For the graphics codes and the inverse characters the coding
	 * of ZXText2P has been used.
	 * See https://freestuff.grok.co.uk/zxtext2p/index.html
	 * To be able to reconstruct machine code in REM statements the ZX81 charser codes
	 * without character are put as a number in square brackets.
	 * The codes that correspondent to commands like " GOTO " are additionally but in brackets,
	 * e.g. "[GOTO]" when they appear in REM statements or quoted text.
	 */
	public static tokens = [
		// 0x0
		" ", "\\' ", "\\ '", "\\''", "\\. ", "\\: ", "\\.'", "\\:'", "\\##", "\\,,", "\\~~", "\"", "#", "$", ":", "?",
		// 0x1
		"(", ")", ">", "<", "=", "+", "-", "*", "/", ";", ",", ".", "0", "1", "2", "3",
		// 0x2
		"4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
		// 0x3
		"K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
		// 0x4
		"RND", "INKEY$", "PI", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x5
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x6
		"", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
		// 0x7
		//"UP", "DOWN", "LEFT", "RIGHT", "GRAPHICS", "EDIT", "NEWLINE", "RUBOUT", "K/L", "MODE", "FUNCTION", "", "", "", "NUMBER", "CURSOR",
		"", "", "", "", "", "", ""/*NL*/, "", "", "", "", "", "", "", "", "",
		// 0x8 Inverse graphics
		"\\::", "\\.:", "\\:.", "\\..", "\\':", "\\ :", "\\'.", "\\ .", "@@", "\\;;", "\\!!", "\"", "#", "$", ":", "?",
		// 0x9 Inverse
		"(", ")", ">", "<", "=", "+", "-", "*", "/", ";", ",", ".", "0", "1", "2", "3",
		// 0xA Inverse
		"4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
		// 0xB Inverse
		"K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
		// 0xC
		"\\\"", "AT ", "TAB ", "", "CODE ", "VAL ", "LEN ", "SIN ", "COS ", "TAN ", "ASN ", "ACS ", "ATN ", "LN ", "EXP ", "INT ",
		// 0xD
		"SQR ", "SGN ", "ABS ", "PEEK ", "USR ", "STR$ ", "CHR$ ", "NOT ", "**", " OR ", " AND ", "<=", ">=", "<>", " THEN ", " TO ",
		// 0xE
		" STEP ", "LPRINT ", "LLIST ", "STOP ", "SLOW ", "FAST ", "NEW ", "SCROLL ", "CONT ", "DIM ", "REM ", "FOR ", "GOTO ", "GOSUB ", "INPUT ", "LOAD ",
		// 0xF
		"LIST ", "LET ", "PAUSE ", "NEXT ", "POKE ", "PRINT ", "PLOT ", "RUN ", "SAVE ", "RAND ", "IF ", "CLS ", "UNPLOT ", "CLEAR ", "RETURN ", "COPY "
	];


	/** The tokens that allow a newline as trailing character
	 * instead of a space.
	 * For these tokens it is not possible to differentiate from variable names.
	 * For the other tokens it may be possible in some cases.
	 */
	public static tokensAllowingTrailingNl = [
		"\\' ", "\\. ", "\\: ",	// OK, these are anyway not variable names but a NL is allowed as well
		"LPRINT ", "LLIST ", "STOP ", "SLOW ", "FAST ",
		"NEW ", "SCROLL ", "CONT ", "REM ", "LIST ", "PRINT ",
		"RUN ", "RAND ", "CLS ", "CLEAR ", "RETURN ", "COPY "
	];


	/** Converts one ZX81 character/token into text. */
	public static convertToken(tokenNumber: number): string {
		let txt = '';
		// Negativ/inverse "-., 0-9, A-Z
		if (tokenNumber >= 0x8B && tokenNumber <= 0xBF) {
			txt += '%';	// Inverse
		}
		// Use table
		txt += Zx81Tokens.tokens[tokenNumber];
		// If not defined then use token in square brackets.
		if (!txt)
			txt = '[' + tokenNumber + ']';
		return txt;
	}
}