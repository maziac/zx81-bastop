import exp = require("constants");
import {Zx81Tokens} from "./zx81tokens";
import {Zx81SystemVars} from "./zx81systemvars";


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
				txt += lineNumber.toString() + ' ';

				// Length
				let length = buffer[index++];
				length += buffer[index++] * 256;
				if (length > remaining)
					throw Error('Invalid length of BASIC line: ' + length + ' at offset ' + index + '. Data exceeds buffer.');
				if (length < 1)
					throw Error('Invalid length of BASIC line: ' + length + ' at offset ' + index + '.');

				// Read tokens for a BASIC line
				const lineBuf = buffer.slice(index, index + length);
				const lineText = Zx81Tokens.convertBasLine(lineBuf, bracketized);
				txt += lineText;

				// Next
				remaining -= 4 + length;
				index += length;
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
	 * - the system variables
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
		const offsBasicEnd = 0x4014 - 0x4009;
		const basic_end_ptr = this.getWord(data, offsBasicEnd);
		const basic_end_index = basic_end_ptr - 0x4009;
		const basicVarsSize = basic_end_index - basic_vars_index;

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
			hdr += '#!dfile-collapsed\n';
		}
		// Read dfile (skip first newline)
		let dfileLines = '';
		let lastCharIndex = 0;
		for (let i = 1; i < dfileSize; i++) {
			// Convert dfile byte
			const code = data[dfile_index + i];
			if (code === Zx81Tokens.NEWLINE) {
				dfileLines += '\n';
				continue;
			}
			// Convert to ASCII
			const charAscii = Zx81Tokens.convertToken(code);
			dfileLines += charAscii;
			if(code !== 0)
				lastCharIndex = dfileLines.length;
		}
		// Cut off unused lines. (After cutting the last character is not a newline.)
		dfileLines = dfileLines.slice(0, lastCharIndex);
		if (dfileLines.length > 0) {
			// Add #!dfile: to each line
			dfileLines = dfileLines.replace(/^/mg, '#!dfile:');
			// Remove trailing spaces from each line
			dfileLines = dfileLines.replace(/ *$/mg, '');
			dfileLines += '\n\n';
			hdr += dfileLines;
		}

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

		// System Variables
		const defaultSysVars = new Zx81SystemVars();
		defaultSysVars.createDefaults();
		const diffs = defaultSysVars.compare(data);
		if (diffs.size > 0) {
			for (const [name, values] of diffs) {
				hdr += `#!system-vars:${name}=`;
				switch (values.length) {
					case 1:
						hdr += values[0];
						break;
					case 2:
						hdr += values[0] + 256 * values[1];
						break;
					default:
						hdr += `[${values.join(',')}]`;
						break;
				}
				hdr += '\n';
			}
			hdr += '\n';
		}

		return hdr;
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
			const charAscii = Zx81Tokens.convertToken(c & 0x7F);
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
