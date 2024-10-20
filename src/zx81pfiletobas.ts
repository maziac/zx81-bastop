import exp = require("constants");
import {Zx81Tokens} from "./zx81tokens";


export class Zx81PfileToBas {
	// The uncollapsed size of the dfile area.
	protected static readonly DFILE_MAX_SIZE = 33 * 24 + 1;

	/** Reads the data of a ZX81 BASIC program and converts
	 * it to unicode text.
	 * The BASIC format is:
	 * SIZE MEANING
	 * 2    Line number. Big endian.
	 * 2    Length of of following bytes in line (incl $76). little endian.
	 * n    The BASIC tokens.
	 * 1	0x76 (END token, Newline)
	 * @param buffer The data of the BASIC program. (Just a part of the p-file.)
	 * @param bracketized If true then tokens are put in brackets.
	 */
	public static getZx81BasicText(buffer: Uint8Array, bracketized = false): string {
		let remaining = buffer.length;
		let txt = '';
		let index = 0;

		try {
			while (remaining > 4) {
				// Line number
				let lineNumber = buffer[index++] * 256;
				lineNumber += buffer[index++];
				txt += lineNumber.toString().padStart(4) + ' ';

				// Length
				let length = buffer[index++];
				length += buffer[index++] * 256;
				if (length > remaining)
					throw Error('Invalid length of BASIC line: ' + length + ' at offset ' + index + '. Data exceeds buffer.');

				// Read tokens
				let rem = false;
				let quoted = false;
				let token = -1;
				for (let i = 0; i < length - 1; i++) {
					token = buffer[index++];

					// Number?
					if (!rem && !quoted && token === Zx81Tokens.NUMBER) {	// Number (is hidden)
						// Get block of 5 bytes, the floating point number
						const buf = buffer.slice(index, index + 5);
						// Convert block to float
						const value = this.convertBufToZx81Float(buf);
						// Find digits belonging to the number
						const txtNumberStr = this.getLastNumber(txt);
						const txtNumber = parseFloat(txtNumberStr);
						if (isNaN(txtNumber) || (Math.abs(txtNumber - value) > 1e-10)) {
							// If digits are not the same as the value or they are not a real number then print the real value as comment
							txt += '[#' + value + ']';
						}
						index += 5;
						i += 5;
						continue;
					}

					// Get token
					let cvt = this.convertToken(token);

					// If REM or quoted then add brackets to commands
					if ((bracketized || rem || quoted) && ((token >= 0xC1 && token !== 0xC3) || (token >= 0x40 && token <= 0x42)))
						cvt = '[' + cvt.trim() + ']';
					txt += cvt;

					// Check for REM
					if (i == 0 && token === Zx81Tokens.REM) {
						rem = true;
					}
					// Check for quoted text
					else if (token === Zx81Tokens.QUOTE) {
						quoted = !quoted;
					}
				}

				// In case a REM line ends with a space, then exchange it with
				// [0] to prevent that trailing spaces are removed by an editor.
				if (rem && token === Zx81Tokens.SPACE)
					txt = txt.slice(0, -1) + '[0]';

				// Line should end with a new line
				const lastToken = buffer[index++];
				if (lastToken !== Zx81Tokens.NEWLINE) {
					//txt += `[${lastToken}]\n`; For Ant Attack this produces a problem.
					txt += '# Note: Previous line did not end with 118 (END token) but with ' + lastToken + '.';
				}

				// Next
				remaining -= 4 + length;
				txt += '\n';
			}

			// Check
			if (remaining > 0)
				txt += '\n\n# Warning: A few bytes could not be converted.\n';
		}
		catch (e) {
			// Put any errors after the text
			txt += '\n\n# Error: ' + e.message + '\n';
		}
		return txt;
	}


	/** Converts a ZX81 p-file into a 'comment header' text.
	 * The comment header contains the data that cannot be put in the
	 * BASIC program but is important to retain all data of the
	 * p-file:
	 * - the value of the next BASIC program line (nxtlin)
	 * - the D-File area (the screen)
	 * - the BASIC variables
	 * See design/ptobasconversion.md.
	 * @param data The data of the p-file.
	 * @returns The text for the comment header.
	 */
	public static getCommentHeader(data: Uint8Array): string {
		let hdr = '';
		// Extract the start to end of the BASIC program
		const offsDFile = 0x400C - 0x4009;
		const offsBasicVars = 0x4010 - 0x4009;
		const dfile_ptr = this.getWord(data, offsDFile);
		const dfile_index= dfile_ptr - 0x4009;
		const basic_vars_ptr = this.getWord(data, offsBasicVars);
		const basic_vars_index = basic_vars_ptr - 0x4009;
		const dfileSize = basic_vars_index - dfile_index;
		const offsBasicStart = 0x407D - 0x4009;
		const offsBasicPrgmEnd = dfile_ptr - 0x4009;
		const offsBasicEnd = 0x4014 - 0x4009;
		const basic_end_ptr = this.getWord(data, offsBasicEnd);
		const basic_end_index = basic_end_ptr - 0x4009;
		const basicVarsSize = basic_end_index - basic_vars_index;
		const basicCode = data.slice(offsBasicStart, offsBasicPrgmEnd);
		// Convert to text
		let basicTxt = Zx81PfileToBas.getZx81BasicText(basicCode);

		// #!basic-start
		const offsNXTLIN = 0x4029 - 0x4009;
		const NXTLIN = this.getWord(data, offsNXTLIN);
		if (NXTLIN !== dfile_ptr) {
			// BASIC program is not stopped
			const startNXTLIN = NXTLIN - 0x4009;
			const basicStartLine = this.getWordBigEndian(data, startNXTLIN);
			hdr += `#!basic-start=${basicStartLine}\n\n`;
		}

		// #!dfile
		if (dfileSize < this.DFILE_MAX_SIZE) {
			hdr+= '#!dfile-collapsed\n';
		}
		// Read dfile (skip first newline)
		let nextLineStarted = true;
		for (let i = 1; i < dfileSize; i++) {
			if (nextLineStarted) {
				// Print start of line
				hdr += '#!dfile:';
			}
			// Convert dfile byte
			const code = data[dfile_index + i];
			if (code === Zx81Tokens.NEWLINE) {
				hdr += '\n';
				nextLineStarted = true;
				continue;
			}
			// Convert to ASCII
			const charAscii = this.convertToken(code);
			hdr += charAscii;
			nextLineStarted = false;
		}
		if (!hdr.endsWith('\n')) {
			// Note: if dfile does not end with a newline this is an
			// error. However, make sure there is an empty line afterwards.
			hdr += '\n';
		}
		hdr += '\n';

		// BASIC variables
		if (basicVarsSize > 1) {
			const vars = data.slice(basic_vars_index, basic_end_index - 1);
			const blockSize = 20;
			for (let i = 0; i < basicVarsSize - 1; i += blockSize) {
				// Use chunks of a few bytes
				const block = vars.slice(i, i + blockSize);
				hdr += '#!basic-vars:[' + block.join(',') + ']\n';
			}
			hdr += '\n';
		}

		return hdr;
	}


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


	/** Converts a ZX81 float number in a buffer into a float.
	 * @param buf The 5 elements buffer with the ZX81 float number.
	 * @returns The float number.
	 */
	protected static convertBufToZx81Float(buf: Uint8Array): number {
		if (buf.length !== 5)
			throw Error("Expected 5 bytes for a ZX81 float number.");
		const exponent = buf[0] - 129;
		const mantissa = (buf[1] << 24) + (buf[2] << 16) + (buf[3] << 8) + buf[4];
		const value = (mantissa / 0x80000000 + 1) * Math.pow(2, exponent);
		return value;
	}


	/** Searches from the end of the text for the last number.
	 * @param txt The text to search in.
	 * @returns The last number found as string. Empty string if nothing found.
	 */
	protected static getLastNumber(txt: string): string {
		let found = '';
		txt = txt.toUpperCase();
		let expFound = 0;
		let expectingExponent = false;
		let k = txt.length - 1;
		while (k >= 0) {
			const c = txt[k];
			if (c >= '0' && c <= '9' || c === '.') {
				found = c + found;
			}
			else if (c === 'E') {
				if (expFound > 0)
					break;	// Exponent already found
				expFound++;
				found = c + found;
			}
			else if (c === '+' || c === '-') {
				if (expFound > 0)
					break;	// Other than exponent, no +/- allowed
				// A 'E' is expected before the sign.
				k--;
				if (k < 0)
					break;	// String ended
				if (txt[k] !== 'E')
					break;	// No 'E' so strings ends without sign.
				expFound++;
				found = 'E' + c + found;
			}
			else
				break;
			// Next
			k--;
		}
		return found;
	}


	/** Returns the zx81 filename of a p81 file.
	 * @param data The data of the p81-file.
	 * @returns The offset to the BASIC program and the filename.
	 * [offs, zx81Filename]
	 */
	public static getP81Filename(data: Uint8Array): [number, string] {
		const len = data.length;
		let nameMax = 128;
		if (nameMax > len)
			nameMax = len;
		let nameLen = 0;
		let zx81Filename = '';
		for (let i = 0; i < nameMax; i++) {
			const c = data[i];
			// Convert to ASCII
			const charAscii = Zx81PfileToBas.convertToken(c & 0x7F);
			zx81Filename += charAscii;
			nameLen++;
			if (c >= 0x80)
				break;
		}
		return [nameLen, zx81Filename];
	}


	/** Retrieves a 16-bit word from a given offset in a Uint8Array.
	 * @param data The Uint8Array from which to extract the word.
	 * @param offset The position in the array from which to start reading the word.
	 * @returns The 16-bit word as a number.
	 */
	protected static getWord(data: Uint8Array, offset: number): number {
		return data[offset] + data[offset + 1] * 256;
	}


	/** Same as getWord but for big endian. */
	protected static getWordBigEndian(data: Uint8Array, offset: number): number {
		return data[offset] * 256 + data[offset + 1];
	}
}
