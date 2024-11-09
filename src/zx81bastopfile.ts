import {EventEmitter} from "stream";
import {Zx81Tokens} from "./zx81tokens";


/** Converts the ZX81 BASIC file to code.
 * See ptobasconversion.md for the details.
 */
export class Zx81BasToPfile extends EventEmitter {
	// The complete BASIC text to convert.
	private readonly str: string;
	// The position (index) in the string.
	private position = 0;
	// The current line nr.
	public lineNr = 0;
	// The current column nr.
	public colNr = 0;

	// Holds all tokens used for the 'normal' parsing.
	protected normalMap = new Map<string, number>();
	// Regex to find the tokens (longest first).
	protected normalRegex: RegExp;

	// Holds all tokens used in the quoted strings.
	protected remQuotedMap = new Map<string, number>();
	// Regex to find the tokens (longest first).
	protected remQuotedRegex: RegExp;

	// Regex to find a \ continuation:
	protected contRegex = /\\\s*\n/y;
	//protected contRegex = /^\\\s*\n/;

	// Skips spaces and continuation characters.
	protected regexSpacesCont = /[ \t]+(?:\\[ \t]*\n)?/y;
	// Skips spaces, newlines, comments and continuation characters.
	protected regexSpacesEtc = /(?:\s+|\\\s*\n|#[^!].*\n)*/y;
	// Skips spaces.
	protected regexSpaces = /[ \t]+/y;

	// Regex for a number (float).
	protected regexNumber = /\d*(\.\d+)?(E[+-]?\d+)?/iy

	// Regex for an int.
	protected regexInt = /\d+/y

	// Regex for special codes e.g. [#size=100], [#include folder/file.obj] or a simple number [123].
	protected specialCodeRegex = /\[(#.*?|\d+|!block\s*=\s*(\d+)\s*|!include\s+([\w./ ]+)\s*)\]/iy;

	// Regex for the comment header #! (for BASIC start line)
	protected commentHdrRegex = /#![ \t]*(basic-start[ \t]*(=)?[ \t]*|dfile-collapsed\b|dfile:|basic-vars:[ \t]*|.*)?/iy;

	// During encodeBasic() this buffer is filled with the basic code.
	public basicCodeOut: number[] = [];

	// During encodeBasic() this buffer is filled with the dfile (screen) data.
	public dfileOut: number[][] = [];

	// During encodeBasic() this buffer is filled with BASIC variables.
	public basicVariablesOut: number[] = [];

	// The line where the BASIC program will continue.
	// -1 if the program should start stopped.
	// This is the offset in 'BasicCodeOut' of the line.
	public nextLineOffset = -1;

	// Read from the comment header. The start line of the BASIC program.
	protected basicStartLine = -1;

	// Used to check the next line number.
	protected lastLineNumber = -1;

	// Is read from the comment header. Whether the dfile is collapsed or not.
	public dfileCollapsed = false;

	// A function pointer that is set and will read the contents of a file.
	protected readFile: (filename: string) => number[] = filename => this.throwError("'readFile' not implemented.");


	// Constructor.
	constructor(str: string) {
		super();
		// Remove windows line endings
		this.str = str.replace(/\r/g, '');
		// Make sure str ends with a newline
		if (!this.str.endsWith('\n'))
			this.str += '\n';

		// Create map for REM and quoted strings decoding
		for (let i = 0; i < Zx81Tokens.tokens.length; i++) {
			let key = Zx81Tokens.convertToken(i);
			this.normalMap.set(key, i);
			if ((i >= 0xC1 && i !== 0xC3) || (i >= 0x40 && i <= 0x42)) {
				key = '[' + key.trim() + ']';
				// Allow bracketized form to be recognized as well
				this.normalMap.set(key, i);
			}
			this.remQuotedMap.set(key, i);
		}
		this.normalRegex = this.createRegex(Array.from(this.normalMap.keys()));
		this.remQuotedRegex = this.createRegex(Array.from(this.remQuotedMap.keys()));
	}


	/** Set the function to read a file.
	 * Is used by the special code !include.
	 * @param readFile The function to read a file.
	 */
	public setReadFileFunction(readFile: (filename: string) => number[]): void {
		this.readFile = readFile;
	}


	// Functions that return the map's value.
	// Regardless of the case of the token.
	protected normalMapGet(token: string): number {
		return this.normalMap.get(token.toUpperCase())!;
	}
	protected remQuotedMapGet(token: string): number {
		return this.remQuotedMap.get(token.toUpperCase())!;
	}


	// Creates a regex from the tokens.
	protected createRegex(tokens: string[]): RegExp {
		const sorted = tokens.sort((a, b) => b.length - a.length);
		//const sorted = [' ', '[PRINT]'];
		const replaced = sorted.map(s => {
			let res;
			// Escape metacharacters
			res = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string

			// Replace ' ' at start or end with '\s'
			// For a few commands (those that do require parameters) the check does not include the \n.
			// So e.g.
			// 10 LET POKE = 60
			// 20 GOSUB POKE
			// would be converted correctly if the "GOSUB POKE" does not end
			// on a space: "GOSUB POKE " would not be converted correctly.
			// But "POKE " would be converted to 0xF4.
			if (Zx81Tokens.tokensAllowingTrailingNl.includes(s))
				res = res.replace(/ $/, '\\s');		// Allow also newline
			else
				res = res.replace(/ $/, '[ \t]');	// Don't allow newline

			return res;
		})
		let regexStr = replaced.join('|');
		regexStr = '(' + regexStr + ')';
		const regex= new RegExp(regexStr, 'iy');
		return regex;
	}


	// Reads a number (float).
	// If no number detected then undefined is returned.
	// Notes:
	// - the sign(+, -) is not part of the number
	// - Valid numbers: 123, 0123, 0.5, .12, 1e3, 1e+3, .1e-3
	public readNumber(): number[] | undefined {
		const numberStr = this.readRegex(this.regexNumber);
		if (!numberStr)
			return undefined;

		// Try parsing
		const number = parseFloat(numberStr);
		if (isNaN(number))
			this.throwError(`Number expected but '${numberStr}' found`);

		// Add chars to buffer.
		const buffer: number[] = [];
		for (let char of numberStr) {
			// Each character one by one
			const zx81Char = this.normalMapGet(char);
			buffer.push(zx81Char);
		}

		// Put number token into buffer
		buffer.push(Zx81Tokens.NUMBER);

		// Convert to mantissa+exp
		const buf = this.getZx81Float(number);
		buffer.push(...buf);

		return buffer;
	}


	// Converts a number (int, float) into a zx81 mantissa/exponent
	// representation.
	// @param value The float or int value. Must be >= 0.
	// @returns A buffer of 5 values with the float representation.
	protected getZx81Float(value: number): number[] {
		// Handle 0 differently
		if (value === 0)
			return [0, 0, 0, 0, 0];

		const exponent = Math.floor(Math.log(value) / Math.log(2));
		if (exponent < -129 || exponent > 126)
			this.throwError("Can't convert to a ZX81 (float) number.");

		const m1 = (value / Math.pow(2, exponent) - 1) * 0x80000000;
		const mantissa = Math.floor(m1 + 0.5);

		// Put into buffer
		const buf: number[] = [
			exponent + 129,	// Must be positive
			(mantissa >> 24) & 0x7F,
			(mantissa >> 16) & 0xFF,
			(mantissa >> 8) & 0xFF,
			mantissa & 0xFF,
		];
		return buf;
	}


	// Reads a quoted string.
	// Returns undefined if no quoted string is found.
	public readQuotedString(): number[] | undefined {
		const char = this.testReadChar();
		if (char !== '"')
			return undefined;

		// Skip the first quote
		const buffer: number[] = [Zx81Tokens.QUOTE /*"*/];
		this.position++;
		this.colNr++;
		// Search for the next quote (or new line)
		let token;
		// console.log('readQuotedString: ' + this.quotedRegex);
		// console.log('readQuotedString: ' + this.str);
		do {
			// Skip any \
			this.readRegex(this.contRegex);
			// End?
			if (this.testReadChar() === '\n') {
				// New line within a quoted string is not allowed
				this.throwError('Unexpected end of line in string');
			}
			token = this.testReadChar();
			// Normal tokens
			const tokenNumber = this.readRemQuotedToken();
			buffer.push(...tokenNumber);
			// Next
			if(this.eos())
				this.throwError('Unexpected end of file in string');
		} while (token !== '"');

		return buffer;
	}


	// Reads a REM line.
	// Reads up to the next newline.
	public readRem(): number[] {
		// Convert until new line
		const buffer: number[] = [];
		let token;
		while (true) {
			// Skip any \
			this.readRegex(this.contRegex);
			// End?
			if (this.testReadChar() === '\n')
				break;
			// Normal tokens
			const tokenNumber = this.readRemQuotedToken();
			buffer.push(...tokenNumber);
		}

		// New line
		this.position++;
		this.colNr = 0;
		this.lineNr++;

		return buffer;
	}


	/** Reads a REM quoted token or a special code and returns it.
	 * @returns number[] An array containing the token number.
	 * Normally just one, but special code could return an array.
	 * @throws Will throw an error if the token is unknown.
	 */
	protected readRemQuotedToken(): number[] {
		const token = this.readToken(this.remQuotedRegex);
		// Check special codes
		if (!token) {
			const buf = this.readSpecialCode();
			if (buf)
				return buf;
			// Else
			this.throwError('Token unknown.');
		}
		const tokenNumber = this.remQuotedMapGet(token);
		return [tokenNumber];
	}


	// Reads a 'normal' BASIC line.
	// Returns undefined if no REM line is found.
	// Reads including the newline.
	public readNormal(): number[] {
		const buffer: number[] = [];
		while (true) {
			// Skip any \
			this.readRegex(this.contRegex);
			// End?
			if (this.testReadChar() === '\n')
				break;
			// Check for quoted string
			const buf = this.readQuotedString();
			if (buf) {
				buffer.push(...buf);
				continue;
			}
			// Check for a (float) number
			const bufNumber = this.readNumber();
			if (bufNumber) {
				buffer.push(...bufNumber);
				continue;
			}
			// Read a token
			const token = this.readToken(this.normalRegex);
			// Check special codes
			if (!token) {
				const buf = this.readSpecialCode();
				if (buf) {
					buffer.push(...buf);
					continue;
				}
			}
			if (!token)
				this.throwError('Parse error.');
			// Add to buffer
			const tokenNumber = this.normalMapGet(token);
			buffer.push(tokenNumber);
		}

		// New line
		this.position++;
		this.colNr = 0;
		this.lineNr++;

		return buffer;
	}


	/** Checks the variable name after LET.
	 * If it is a problematic name, a warning is shown.
	 * Problematic names are names that are same as a BASIC command.
	 */
	protected regexVariableName = /[\t ]*([A-Z][A-Z0-9]*)/iy;
	protected checkVariableName() {
		this.regexVariableName.lastIndex = this.position;
		const result = this.regexVariableName.exec(this.str);
		if (!result)
			this.throwError('Variable name expected');
		// Compare variable name with BASIC commands
		const varName = result[1];
		const tokenNumber = this.normalMapGet('[' + varName + ']');
		if (tokenNumber !== undefined) {
			this.showWarning("Variable name '" + varName + "' is same as a BASIC command. This may or may not be a problem. To be on the safe side better rename it.");
		}
		return;
	}


	// Check for end of string.
	// @param length The length of available bytes to check.
	public eos(length = 1): boolean {
		return this.position + length  > this.str.length;
	}


	// Reads a token from the string.
	// If found the position and colNr/lineNr is moved.
	// @param tokenRegex The tokens to search for.
	// @returns The token found or undefined.
	public readToken(tokenRegex: RegExp): string | undefined {
		if (this.testReadChar() === '\n')
			return undefined;
		tokenRegex.lastIndex = this.position;
		const result = tokenRegex.exec(this.str);
		if (!result)
			return undefined;
		//console.log('readToken: ' + this.quotedRegex);
		//console.log('readToken: ' + this.str);
		const foundToken = result[0];
		this.position += foundToken.length;
		this.colNr += foundToken.length;

		// Stop before newline
		if (foundToken.endsWith('\n')) {
			this.position--;
			this.colNr--;
		}
		// Fix to white spaces
		const fixedToken = foundToken.replace(/^\s|\s$/g, ' ');
		return fixedToken;
	}


	// Reads a special code, a special code is surrounded by square
	// brackets, e.g. [#size=100], [#include file.obj] or a simple number
	// [123].
	// Numbers in brackets are also defined in the ZX81 charset.
	// However this allows to put codes in brackets as an alternate to
	// existing codes.
	protected readSpecialCode(): number[] | undefined {
		this.specialCodeRegex.lastIndex = this.position;
		const result = this.specialCodeRegex.exec(this.str);
		if (!result)
			return undefined;
		const code = result[1];

		// Check which code it is
		let buf: number[];
		if (code.startsWith('#')) {
			// Comment: Return an empty buffer
			buf = [];
		}
		else if (code.startsWith('!block')) {
			// Alloc block with a certain size
			const sizeStr = result[2];
			const size = parseInt(sizeStr);
			if (isNaN(size))
				this.throwError('Size expected but got: ' + sizeStr);
			if (size >= 0x8000)
				this.throwError(`Size (${size}) definitely too big`);
			buf = new Array<number>(size).fill(0);
		}
		else if (code.startsWith('!include')) {
			let filename;
			try {
				filename = result[3].trim();
				buf = this.readFile(filename);
			} catch (err) {
				this.throwError(`Failed to read file '${filename}': ${err.message}`);
			}
		}
		else {
			// Number
			const number = parseInt(code);
			if (isNaN(number))
				this.throwError('Number expected but got: ' + code);
			if (number < 0 || number > 255)
				this.throwError(`Number (${number}) out of range 0..255`);
			buf = [number];
		}

		// Change position
		const len = result[0].length;
		this.position += len;
		this.colNr += len;

		return buf;
	}


	// Read and returns a regex.
	// If necessary adjust the position etc.
	protected readRegex(regex: RegExp): string | undefined {
		let foundToken;
		regex.lastIndex = this.position;
		const result = regex.exec(this.str);
		if (result && result.index === this.position) {
			// Found
			foundToken = result[0];
			if (foundToken.endsWith('\n')) {
				this.colNr = 0;
				this.lineNr++;
			}
			else {
				this.colNr += foundToken.length;
			}
			this.position += foundToken.length;
		}
		return foundToken;
	}


	// Tests the next char from the string.
	// Does not move the position.
	public testReadChar(): string {
		return this.str[this.position];
	}


	// Reads the line number.
	// If no line number found then it throws an error.
	// @returns The line number.
	// @throws If line number is out of range 0-9999.
	protected readLineNumber(): number {
		const digits = this.readToken(this.regexInt);
		if (!digits)
			this.throwError("Expected a line number");
		// Convert
		const lineNumber = parseInt(digits);
		if (isNaN(lineNumber))
			this.throwError("Expected a line number but got '" + digits + "'");
		if (lineNumber < 0 || lineNumber > 9999)
			this.throwError("Line number out of range [0-9999]: " + lineNumber);

		return lineNumber;
	}


	// Reads an integer number in a given range.
	// IF no number found then it throws an error.
	// @param min The minimum value.
	// @param max The maximum value.
	// @returns The line number.
	// @throws If line number is out of range 0-9999.
	protected readInt(min: number, max:number): number {
		const digits = this.readToken(this.regexInt);
		if (!digits)
			this.throwError("Expected a number");
		// Convert
		const value = parseInt(digits);
		if (isNaN(value))
			this.throwError("Expected a number but got '" + digits + "'");
		if (value < min || value > max)
			this.throwError(`Number out of range [${min}-${max}]: ${value}`);

		return value;
	}


	// Skips all spaces (and \t) also continuation.
	// Moves the column and line number.
	// At least 1 space is expected.
	// Skips no newline.
	protected skipSpacesAndCont() {
		this.regexSpacesCont.lastIndex = this.position;
		const match = this.regexSpacesCont.exec(this.str);
		if (!match)
			this.throwError("Space expected ");
		const found = match[0];
		this.position += found.length;
		if (found.endsWith('\n')) {
			this.lineNr++;
			this.colNr = 0;
		}
		else {
			this.colNr += found.length;
		}
	}


	// Skips all spaces (and \t, \n), comments # and continuation \.
	// Moves the column and line number.
	protected skipSpacesEtc() {
		this.regexSpacesEtc.lastIndex = this.position;
		const match = this.regexSpacesEtc.exec(this.str);
		//console.log('skipSpacesEtc: ' + this.str);
		if (!match)
			return;
		const found = match[0];
		if (!found)	// Could be ''
			return;
		this.position += found.length;
		const split = found.split('\n');
		this.lineNr += split.length - 1;
		this.colNr = split.at(-1)!.length;
	}


	/** If the first line starts with a comment and an exclamation mark.
	 * #!
	 * Then this is a comment header and it will be interpreted:
	 * #!basic-start=1515
	 * #!dfile-collapsed
	 * #!dfile:  WORLD
	 * #!basic-vars:[1,2,3,4]
	 */
	protected parseCommentHeader(): boolean {
		this.commentHdrRegex.lastIndex = this.position;
		const match = this.commentHdrRegex.exec(this.str);
		if (match) {
			//this.position += 2;	// Skip the '#!'
			//this.colNr += 2;
			const len = match[0].length;
			this.position += len;
			this.colNr += len;
			let cmd = match[1];
			if (cmd) {
				cmd = cmd.trim().toLowerCase();
				if (cmd.startsWith('basic-start')) {
					const equalSign = match[2];
					if (equalSign !== '=')
						this.throwError("Expected '='");
					this.basicStartLine = this.readLineNumber();
					if(this.basicStartLine <= this.lastLineNumber)
						this.throwError("Please set the BASIC start line before the definition of the line");
				}
				else if (cmd.startsWith('dfile-collapsed')) {
					this.dfileCollapsed = true;
				}
				else if (cmd.startsWith('dfile')) {
					this.handleDfile();
				}
				else if (cmd.startsWith('basic-vars')) {
					this.handleBasicVars();
				}
				else if (cmd !== '') {
					// Something unknown, correct position
					this.position -= len;
					this.colNr -= len;
					this.throwError('Unknown command in header: ' + cmd);
				}
			}
			// Skip the rest
			this.readRegex(this.regexSpaces);
			if (this.testReadChar() !== '\n')
				this.throwError('Expected newline');
			return true;
		}
		return false;
	}


	/** Handles the 'dfile:' command in the comment header.
	 * Reads the dfile line and stores it in the dfileOut array.
	 */
	protected handleDfile() {
		const dfileLine: number[] = [];
		while (this.testReadChar() !== '\n') {
			// Normal tokens
			const tokenNumber = this.readRemQuotedToken();
			dfileLine.push(...tokenNumber);
		}
		this.dfileOut.push(dfileLine);
	}


	/** Handles the 'basic-vars:' command in the comment header.
	 * Reads the BASIC variables and stores them in the basicVariablesOut array.
	 */
	protected handleBasicVars() {
		if (this.testReadChar() !== '[')
			this.throwError('Expected [');
		this.position++;
		this.colNr++;
		this.readRegex(this.regexSpaces);
		while (this.testReadChar() !== ']') {
			const value = this.readInt(0, 255);
			if (value === undefined)
				this.throwError('Number expected');
			this.basicVariablesOut.push(value);
			this.readToken(this.regexSpaces);
			const char = this.testReadChar();
			if (char === '\n')
				this.throwError('Expected ]');
			if (char === ',') {
				// Skip
				this.position++;
				this.colNr++;
			}
			// Next
			this.readToken(this.regexSpaces);
		}
		// Position after ']'
		this.position++;
		this.colNr++;
	}


	// Converts the whole string, the whole basic program, into code.
	// (Without any system vars etc.)
	// Fills the basicCodeOut buffer.
	// Also reads the comment header and fills the dfileOut and basicVariablesOut.
	protected encodeBasic() {
		this.nextLineOffset = -1;	// Not yet defined.
		this.basicCodeOut = [];
		this.lastLineNumber = -1;
		this.basicStartLine = -1;

		// Parse the BASIC string
		while (true)
		{
			this.skipSpacesEtc();
			if (this.eos())
				break;

			// Check for comment header
			if (this.parseCommentHeader())
				continue;

			// Line number
			const lineNumber = this.readLineNumber();
			if (lineNumber <= this.lastLineNumber)
				this.throwError("Line number (" + lineNumber + ") must be bigger than previous line.");
			this.basicCodeOut.push(lineNumber >> 8);
			this.basicCodeOut.push(lineNumber & 0xFF);
			this.lastLineNumber = lineNumber;

			// Check for start line
			if (this.basicStartLine !== -1 && lineNumber >= this.basicStartLine) {
				this.nextLineOffset = this.basicCodeOut.length - 2;
				this.basicStartLine = -1;
			}

			// Keep space for the size
			const rememberSizeIndex = this.basicCodeOut.length;
			this.basicCodeOut.push(0);
			this.basicCodeOut.push(0);

			// Skip spaces
			this.skipSpacesAndCont();

			// Check for first command
			const lastColumn = this.colNr;
			const token = this.readToken(this.normalRegex);
			if (!token)
				this.throwError("Unknown command");
			const tokenNumber = this.normalMapGet(token);
			this.basicCodeOut.push(tokenNumber);
			// Check for BASIC commands
			if (!Zx81Tokens.isCommand(tokenNumber)) {
				// Spit out a warning
				this.throwError("Command expected but got: '" + token + "'", this.lineNr, lastColumn);
			}
			// Check for LET
			if (tokenNumber === Zx81Tokens.LET) {
				// LET: Check for variable name to give an additional warning
				this.checkVariableName();
				// Otherwise handle as other requests
			}
			// Check for REM
			if (tokenNumber === Zx81Tokens.REM) {
				// REM
				const buf = this.readRem();
				this.basicCodeOut.push(...buf);
			}
			else {
				// Check for other tokens
				const buf = this.readNormal();
				this.basicCodeOut.push(...buf);
			}

			// End line
			this.basicCodeOut.push(Zx81Tokens.NEWLINE);	// Newline
			// Set size
			const length = this.basicCodeOut.length - (rememberSizeIndex + 2);
			this.basicCodeOut[rememberSizeIndex] = length & 0xFF;
			this.basicCodeOut[rememberSizeIndex + 1] = length >> 8;
		}

		// Check if start line was not found
		if (this.basicStartLine !== -1)
			this.throwError('Start line not found: ' + this.basicStartLine);
	}


	/** Creates a p-file from the basic code area.
	 * @param basicCode The basic code area as array.
	 * @param nxtlin The next line number to execute.
	 * I.e. the index into the basicCode array for the line.
	 * -1 if program is stopped.
	 * @param dfileData The d-file area. Collapsed or not. Includes the starting newline.
	 * @param basicVarsData The basic variables area. Omits the trailing
	 * 0x80.
	 * @returns The p-file.
	 */
	public createPfile(): number[] {
		// Convert basic and comment header into a p-file
		this.encodeBasic();

		// Get Data
		const variables = [...this.basicVariablesOut, 0x80];
		const dfileData = this.createDfile(this.dfileOut, this.dfileCollapsed);
		// Calculate location of D_FILE etc.
		//const sysvarsStart = 0x4009;
		const basicProgram = 0x407D;
		const dfilePtr = basicProgram + this.basicCodeOut.length;
		const dfileSize = dfileData.length;
		const basicVars = dfilePtr + dfileSize;
		const basicVarsSize = variables.length;
		const basicEnd = basicVars + basicVarsSize;

		// Caclulate nextlin Address
		let nextLineAddr = dfilePtr; // Assume program is stopped
		if (this.nextLineOffset >= 0) {
			nextLineAddr = basicProgram + this.nextLineOffset;
		}

		// Create sysvars
		const sysvars = new Uint8Array([
			0x00, // VERSN
			0x01, 0x00, // E_PPC
			...this.wordToByte(dfilePtr), // D_FILE
			...this.wordToByte(dfilePtr + 1), // DF_CC
			...this.wordToByte(basicVars), // VARS
			0x00, 0x00, // DEST
			...this.wordToByte(basicEnd), // E_LINE
			...this.wordToByte(basicEnd + 4), // CH_ADD
			0x00, 0x00, // X_PTR
			...this.wordToByte(basicEnd + 5), // STKBOT
			...this.wordToByte(basicEnd + 5), // STKEND
			0x00, // BREG
			0x3D, 0x40, // MEM
			0x00, // UNUSED1
			0x02, // DF_SZ
			0x02, 0x00, // S_TOP
			0xBF, 0xFD, // LAST_K
			0x0F, // DEBOUN
			0x37, // MARGIN
			...this.wordToByte(nextLineAddr), // NXTLIN (offset 32)
			0x00, 0x00, // OLDPPC
			0x00, // FLAGX
			0x00, 0x00, // STRLEN
			0x8D, 0x0C, // T_ADDR
			0x00, 0x00, // SEED
			0xA3, 0xF5, // FRAMES
			0x00, 0x00, // COORDS
			0xBC, // PR_CC
			0x21, 0x18, // S_POSN
			0x40, // CDFLAG
			...Array(32).fill(0x20), // PRBUFF (32 spaces)
			0x0A, // Newline
			...Array(30).fill(0x00), // MEMBOT (30 zeros)
			0x00, 0x00 // UNUSED2
		]);

		// Concatenate to p-file
		const pFile: number[] = [
			...sysvars, ...this.basicCodeOut, ...dfileData, ...variables
		];

		return pFile;
	}


	/** Converts a word into two bytes.
	 * @param word The word to convert.
	 * @returns The two bytes as [low, high].
	 */
	protected wordToByte(word: number): [number, number] {
		return [word & 0xFF, word >> 8];
	}


	/** Creates a ZX81 D-file from a given buffer.
	 * @param dfileIn The buffer with the D-file data. It can be incomplete.
	 * I.e. it might have only a few (the first) lines defined.
	 * The lines may not contain full 32 characters and they omit
	 * the trailing
	 * If dfileIn is too big (width or height) it is truncated.
	 * If it is too small it is expanded with spaces (if not collapsed).
	 * @returns a complete D-file buffer. If collapsed is false, it
	 * is expanded, otherwise collapsed.
	 * Starts with a newline.
	 */
	public createDfile(dfileIn: number[][], collapsed = false): number[] {
		const dfile = [Zx81Tokens.NEWLINE];	// D-File start with a newline
		const linesCount = dfileIn.length;
		for (let l = 0; l < 24; l++) {
			let line: number[];
			if (l < linesCount) {
				const dline = dfileIn[l];
				const dlineLen = Math.min(dline.length, 32);
				line = dline.slice(0, dlineLen);
			}
			else {
				line = [];
			}
			if (!collapsed) {
				// Fill lines with spaces
				line.push(...Array(32 - line.length).fill(0));
			}
			dfile.push(...line, Zx81Tokens.NEWLINE);	// Each line ends with a newline
		}
		return dfile;
	}


	/// Throws an exception and adds the line and column number.
	protected throwError(message: string, lineNr = this.lineNr, colNr = this.colNr): never {
		const len = 20
		let curText = this.str.substring(this.position, this.position + len);
		const k = curText.indexOf('\n');
		if (k >= 0)
			curText = curText.substring(0, k);
		else
			curText += '...';
		let msg = message;
		if (k > 0)
			msg += ": '" + curText + "'";
		throw new Zx81ParseError(msg, lineNr, colNr);
	}

	/// Emits a warning.
	protected showWarning(message: string, lineNr = this.lineNr, colNr = this.colNr): void {
		this.emit('warning', message, lineNr, colNr);
	}
}


// Custom error object to hold the column and line number.
export class Zx81ParseError extends Error {
	line: number;
	column: number;

	constructor(message: string, line: number, column: number) {
		super(message);
		this.line = line;
		this.column = column;
		this.name = 'Zx81ParseError';
	}
}
