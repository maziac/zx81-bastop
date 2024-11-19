import {vscode} from './vscode-import';
import {read, setOffset, getOffset, setEndianness, getNumberValue, getHex0xValue, getDecimalValue, getData, getRemainingSize} from './dataread';
import {addRow, addDetails, addMemDump} from './parser';
import {addCanvas} from './canvas';
import {addTextBox} from './textbox';


// Checkbox: "Bracketized Tokens"
export let isBracketizedTokensEnabled = false;

// Screen height
const SCREEN_HEIGHT = 192;

// Screen width
const SCREEN_WIDTH = 256;

// The ZX81 ROM charset, 0x1E00-0x1FFF
const romChars = [
	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
	0xf0, 0xf0, 0xf0, 0xf0, 0x00, 0x00, 0x00, 0x00,
	0x0f, 0x0f, 0x0f, 0x0f, 0x00, 0x00, 0x00, 0x00,
	0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x00, 0x00, 0xf0, 0xf0, 0xf0, 0xf0,
	0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0, 0xf0,
	0x0f, 0x0f, 0x0f, 0x0f, 0xf0, 0xf0, 0xf0, 0xf0,
	0xff, 0xff, 0xff, 0xff, 0xf0, 0xf0, 0xf0, 0xf0,
	0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55, 0xaa, 0x55,
	0x00, 0x00, 0x00, 0x00, 0xaa, 0x55, 0xaa, 0x55,
	0xaa, 0x55, 0xaa, 0x55, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x24, 0x24, 0x00, 0x00, 0x00, 0x00, 0x00,
	0x00, 0x1c, 0x22, 0x78, 0x20, 0x20, 0x7e, 0x00,
	0x00, 0x08, 0x3e, 0x28, 0x3e, 0x0a, 0x3e, 0x08,
	0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x10, 0x00,
	0x00, 0x3c, 0x42, 0x04, 0x08, 0x00, 0x08, 0x00,
	0x00, 0x04, 0x08, 0x08, 0x08, 0x08, 0x04, 0x00,
	0x00, 0x20, 0x10, 0x10, 0x10, 0x10, 0x20, 0x00,
	0x00, 0x00, 0x10, 0x08, 0x04, 0x08, 0x10, 0x00,
	0x00, 0x00, 0x04, 0x08, 0x10, 0x08, 0x04, 0x00,
	0x00, 0x00, 0x00, 0x3e, 0x00, 0x3e, 0x00, 0x00,
	0x00, 0x00, 0x08, 0x08, 0x3e, 0x08, 0x08, 0x00,
	0x00, 0x00, 0x00, 0x00, 0x3e, 0x00, 0x00, 0x00,
	0x00, 0x00, 0x14, 0x08, 0x3e, 0x08, 0x14, 0x00,
	0x00, 0x00, 0x02, 0x04, 0x08, 0x10, 0x20, 0x00,
	0x00, 0x00, 0x10, 0x00, 0x00, 0x10, 0x10, 0x20,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x08, 0x10,
	0x00, 0x00, 0x00, 0x00, 0x00, 0x18, 0x18, 0x00,
	0x00, 0x3c, 0x46, 0x4a, 0x52, 0x62, 0x3c, 0x00,
	0x00, 0x18, 0x28, 0x08, 0x08, 0x08, 0x3e, 0x00,
	0x00, 0x3c, 0x42, 0x02, 0x3c, 0x40, 0x7e, 0x00,
	0x00, 0x3c, 0x42, 0x0c, 0x02, 0x42, 0x3c, 0x00,
	0x00, 0x08, 0x18, 0x28, 0x48, 0x7e, 0x08, 0x00,
	0x00, 0x7e, 0x40, 0x7c, 0x02, 0x42, 0x3c, 0x00,
	0x00, 0x3c, 0x40, 0x7c, 0x42, 0x42, 0x3c, 0x00,
	0x00, 0x7e, 0x02, 0x04, 0x08, 0x10, 0x10, 0x00,
	0x00, 0x3c, 0x42, 0x3c, 0x42, 0x42, 0x3c, 0x00,
	0x00, 0x3c, 0x42, 0x42, 0x3e, 0x02, 0x3c, 0x00,
	0x00, 0x3c, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x00,
	0x00, 0x7c, 0x42, 0x7c, 0x42, 0x42, 0x7c, 0x00,
	0x00, 0x3c, 0x42, 0x40, 0x40, 0x42, 0x3c, 0x00,
	0x00, 0x78, 0x44, 0x42, 0x42, 0x44, 0x78, 0x00,
	0x00, 0x7e, 0x40, 0x7c, 0x40, 0x40, 0x7e, 0x00,
	0x00, 0x7e, 0x40, 0x7c, 0x40, 0x40, 0x40, 0x00,
	0x00, 0x3c, 0x42, 0x40, 0x4e, 0x42, 0x3c, 0x00,
	0x00, 0x42, 0x42, 0x7e, 0x42, 0x42, 0x42, 0x00,
	0x00, 0x3e, 0x08, 0x08, 0x08, 0x08, 0x3e, 0x00,
	0x00, 0x02, 0x02, 0x02, 0x42, 0x42, 0x3c, 0x00,
	0x00, 0x44, 0x48, 0x70, 0x48, 0x44, 0x42, 0x00,
	0x00, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7e, 0x00,
	0x00, 0x42, 0x66, 0x5a, 0x42, 0x42, 0x42, 0x00,
	0x00, 0x42, 0x62, 0x52, 0x4a, 0x46, 0x42, 0x00,
	0x00, 0x3c, 0x42, 0x42, 0x42, 0x42, 0x3c, 0x00,
	0x00, 0x7c, 0x42, 0x42, 0x7c, 0x40, 0x40, 0x00,
	0x00, 0x3c, 0x42, 0x42, 0x52, 0x4a, 0x3c, 0x00,
	0x00, 0x7c, 0x42, 0x42, 0x7c, 0x44, 0x42, 0x00,
	0x00, 0x3c, 0x40, 0x3c, 0x02, 0x42, 0x3c, 0x00,
	0x00, 0xfe, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00,
	0x00, 0x42, 0x42, 0x42, 0x42, 0x42, 0x3c, 0x00,
	0x00, 0x42, 0x42, 0x42, 0x42, 0x24, 0x18, 0x00,
	0x00, 0x42, 0x42, 0x42, 0x42, 0x5a, 0x24, 0x00,
	0x00, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x00,
	0x00, 0x82, 0x44, 0x28, 0x10, 0x10, 0x10, 0x00,
	0x00, 0x7e, 0x04, 0x08, 0x10, 0x20, 0x7e, 0x00
];


/** Sets the BASIC text. Is parsed already inside the extension.
 */
export function setTextData(pZx81FilenameLength: number, pZx81Filename: string, pBasicTxt: string) {
	zx81FilenameLength = pZx81FilenameLength;
	zx81Filename = pZx81Filename;
	basicTxt = pBasicTxt;
}
let zx81FilenameLength: number;
let zx81Filename: string;
let basicTxt: string;


/** Parse and display p files (ZX81).
 * Main parsing already happened in extension.
 * Here only the sysvars and variables are parsed.
 * The BASIC text and screen data are already available.
 */
export function parsePfile() {

	// Create buttons to copy and save the ZX81 BASIC program
	const btnCopyBasic = document.createElement('button');
	btnCopyBasic.classList.add('btn-basic');
	btnCopyBasic.textContent = 'Copy BASIC to clipboard';
	btnCopyBasic.onclick = () => vscode.postMessage({
		command: 'copyBasic',
		brackets: isBracketizedTokensEnabled
	});

	const btnSaveBasicAs = document.createElement('button');
	btnSaveBasicAs.classList.add('btn-basic');
	btnSaveBasicAs.textContent = 'Save BASIC as...';
	btnSaveBasicAs.onclick = () => vscode.postMessage({
		command: 'saveBasicAs',
		brackets: isBracketizedTokensEnabled
	});

	// Create checkbox for "Bracketized Tokens"
	const hoverText = 'Will surround all ZX81 BASIC tokens with brackets, e.g. "[PRINT]". If you encounter problems with converting the BASIC back to a P-file, try this option.';
	const chkBracketizedTokens = document.createElement('input');
	chkBracketizedTokens.type = 'checkbox';
	chkBracketizedTokens.id = 'chkBracketizedTokens';
	chkBracketizedTokens.title = hoverText;
	isBracketizedTokensEnabled = false;
	chkBracketizedTokens.onchange = () => {
		isBracketizedTokensEnabled = chkBracketizedTokens.checked;
	};
	const lblBracketizedTokens = document.createElement('label');
	lblBracketizedTokens.htmlFor = 'chkBracketizedTokens';
	lblBracketizedTokens.textContent = 'Bracketized Tokens';
	lblBracketizedTokens.title = hoverText;

	// Append checkbox and label to the start of the webview
	document.body.insertBefore(lblBracketizedTokens, document.body.firstChild);
	document.body.insertBefore(chkBracketizedTokens, document.body.firstChild);

	// Append buttons to the start of the webview
	document.body.insertBefore(btnCopyBasic, document.body.firstChild);
	document.body.insertBefore(btnSaveBasicAs, document.body.firstChild);

	// Start parsing the p-file
	let remainingSize = 0;
	setEndianness('little');

	// Check for p81 file
	if (zx81FilenameLength !== 0) {
		// Filename
		addRow('ZX81 Filename', zx81Filename);
		read(zx81FilenameLength);
		addDetails(() => {
			read(zx81FilenameLength);
			addMemDump(false);
		});
	}

	// Get some data
	const pFileStart = zx81FilenameLength;
	read(0x400C - 0x4009);	// Skip to D_FILE
	read(2);	// Read dfile
	const dfile_ptr = getNumberValue();
	setOffset(pFileStart);

	read(0x4010 - 0x4009);	// Skip to VARS
	read(2);	// Read VARS
	const vars_ptr = getNumberValue();
	setOffset(pFileStart);

	// E_LINE (end of BASIC program and vars)
	read(0x4014 - 0x4009);	// Skip to E_LINE
	read(2);	// Read E_LINE
	const eline_ptr = getNumberValue();
	setOffset(pFileStart);

	// Next line in basic program:
	read(0x4029 - 0x4009);	// Skip to NXTLIN
	read(2);	// Read NXTLIN
	const nxtlin = getNumberValue();
	setOffset(pFileStart);
	// Get BASIC line number from address
	read(nxtlin - 0x4009);
	read(2);	// Read line number
	let nextBasicLine;
	if (nxtlin !== dfile_ptr) {
		setEndianness('big');
		nextBasicLine = getNumberValue();
		setEndianness('little');
	}
	setOffset(pFileStart);

	// Starts at $4009
	const sysVarsSize = 0x407B + 2 - 0x4009;
	read(sysVarsSize);
	addRow('System Variables $4009 - $407D', '', 'ZX81 system variables.');
	addDetails(() => {
		read(1);
		addRow('VERSN (0x4009)', getDecimalValue(), '8k ROM version.');

		read(2);
		addRow('E_PPC (0x400A)', getDecimalValue(), 'Number of current line.');

		read(2);
		addRow('D_FILE (0x400C)', getHex0xValue(), 'pointer to the DFILE (screen memory).');

		read(2);
		addRow('DF_CC (0x400E)', getHex0xValue(), 'Address of PRINT position in display file. Can be poked so that PRINT output is sent elsewhere.');

		read(2);
		addRow('VARS (0x4010)', getHex0xValue(), 'Start of the BASIC variables.');

		read(2);
		addRow('DEST (0x4012)', getHex0xValue(), 'Address of variable in assignment.');

		read(2);
		addRow('E_LINE (0x4014)', getHex0xValue(), 'Contains the line being typed + work space. (End of VARS area.)');

		read(2);
		addRow('CH_ADD (0x4016)', getHex0xValue(), 'Address of the next character to be interpreted: the character after the argument of PEEK, or the NEWLINE at the end of a POKE statement.');

		read(2);
		addRow('X_PTR (0x4018)', getHex0xValue(), 'Address of the character preceding the marker.');

		read(2);
		addRow('STKBOT (0x401A)', getHex0xValue(), 'Bottom of calculator stack.');

		read(2);
		addRow('STKEND (0x401C)', getHex0xValue(), 'Top of calculator stack.');

		read(1);
		addRow('BERG (0x401E)', getHex0xValue(), 'Calculator\'s b register.');

		read(2);
		addRow('MEM (0x401F)', getHex0xValue(), 'Address of area used for calculator\'s memory.');

		read(1);
		addRow('not used (0x4021)', getHex0xValue(), '');

		read(1);
		addRow('DF_SZ (0x4022)', getDecimalValue(), 'The number of lines (including one blank line) in the lower part of the screen.');

		read(2);
		addRow('S_TOP (0x4023)', getDecimalValue(), 'The number of the top program line in automatic listings.');

		read(2);
		addRow('LAST_K (0x4025)', getHex0xValue(), 'Shows which keys pressed.');

		read(1);
		addRow('(0x4027)', getHex0xValue(), 'Debounce status of keyboard.');

		read(1);
		addRow('MARGIN (0x4028)', getDecimalValue(), 'Number of blank lines above or below picture: 55 in Britain, 31 in America.');

		read(2);
		addRow('NXTLIN (0x4029)', getHex0xValue(), 'Address of next program line to be executed.');

		read(2);
		addRow('OLDPPC (0x402B)', getDecimalValue(), 'Line number of which CONT jumps.');

		read(1);
		addRow('FLAGX (0x402D)', getHex0xValue(), 'Various flags.');

		read(2);
		addRow('STRLEN (0x402E)', getHex0xValue(), 'Length of string type destination in assignment.');

		read(2);
		addRow('T_ADDR (0x4030)', getHex0xValue(), 'Address of next item in syntax table (very unlikely to be useful).');

		read(2);
		addRow('SEED (0x4032)', getHex0xValue(), 'The seed for RND. This is the variable that is set by RAND.');

		read(2);
		addRow('FRAMES (0x4034)', getDecimalValue(), 'Counts the frames displayed on the television. Bit 15 is 1. Bits 0 to 14 are decremented for each frame set to the television.');

		read(1);
		addRow('COORDS (0x4036)', getDecimalValue(), 'x-coordinate of last point PLOTted.');

		read(1);
		addRow('(0x4037)', getDecimalValue(), 'y-coordinate of last point PLOTted.');

		read(1);
		addRow('PR_CC (0x4038)', getHex0xValue(), 'Less significant byte of address of next position for LPRINT to print as (in PRBUFF).');

		read(1);
		addRow('S_POSN (0x4039)', getDecimalValue(), 'Column number for PRINT position.');

		read(1);
		addRow('(0x403A)', getDecimalValue(), 'Line number for PRINT position.');

		read(1);
		addRow('CDFLAG (0x403B)', getHex0xValue(), 'Various flags. Bit 7 is on (1) during compute & display mode.');

		read(33);
		addRow('PRBUFF (0x403C)', '', 'Printer buffer (33 bytes).');
		addDetails(() => {
			read(33);
			addMemDump(false);
		});

		read(30);
		addRow('MEMBOT (0x405D)', '', 'Calculator\'s memory area; used to store numbers that cannot conveniently be put on the calculator stack. (30 bytes)');
		addDetails(() => {
			read(30);
			addMemDump(false);
		});

		read(2);
		addRow('not used (0x407B)', getHex0xValue(), '');
	});

	// BASIC program (starts at $407D)
	const basicPrgSize = dfile_ptr - 0x4009 - sysVarsSize;
	let prgComment;
	if (nextBasicLine === undefined) {
		// Program is stopped
		prgComment = 'The program is stopped.';
	}
	else {
		// Program continues
		prgComment = 'The program continues at line ' + nextBasicLine + '.';
		if (nxtlin < 0x407D || nxtlin >= dfile_ptr) {
			prgComment += ' The line is at $' + toHex(nxtlin) + ' outside the BASIC program area.';
		}
	}

	read(basicPrgSize);
	addRow('BASIC Program $407D - $' + toHex(dfile_ptr), '', prgComment);

	addDetails(() => {
		const basicTextBox = addTextBox(basicTxt, 100, 300);
		basicTextBox.classList.add('ZX81BASIC');

		// Hexdump line by line
		addRow('Hexdump $407D - $' + toHex(dfile_ptr), '', 'Hexdump per BASIC line.');
		addDetails(() => {
			let remainingSize = basicPrgSize;
			while (remainingSize > 4) {
				// Remember offset
				const offset = getOffset();
				// Line number
				setEndianness('big');
				read(2);
				const lineNumber = getNumberValue();
				setEndianness('little');
				// Line size
				read(2);
				const lineSize = getNumberValue();
				// Restore and read line
				setOffset(offset);
				read(lineSize + 4);
				addRow('Line ' + lineNumber);
				addDetails(() => {
					read(lineSize + 4);
					addMemDump(false);
				});
				// Next line
				read(0);
				remainingSize -= lineSize + 4;
			}
		}, false);

		// Hexdump over all
		addRow('Hexdump $407D - $' + toHex(dfile_ptr), '', 'Hexdump of the complete BASIC area.');
		addDetails(() => {
			read(basicPrgSize);
			addMemDump(false);
		}, false);
	}, true);

	// DFILE (screen)
	let dfileSize = vars_ptr - dfile_ptr;
	if (dfileSize < 0)
		dfileSize = 0;
	remainingSize = getRemainingSize();
	if (dfileSize > remainingSize)
		dfileSize = remainingSize;
	read(dfileSize);

	let dfileComment = 'ZX81 screen display ';
	dfileComment += (dfileSize === 24*33+1) ? '(expanded).' : '(collapsed).';
	addRow('DFILE $' + toHex(dfile_ptr) + ' - $' + toHex(vars_ptr), '', dfileComment);
 	addDetails(() => {
		read(dfileSize);
		const dfile = getData();
		const ctx = addCanvas(SCREEN_WIDTH, 192)!;
		const imgData = ctx.createImageData(SCREEN_WIDTH, 400);
		drawUlaScreen(ctx, imgData, dfile, romChars, false /*debug*/);

		// Hexdump
		  addRow('Hexdump $' + toHex(dfile_ptr) + ' - $' + toHex(vars_ptr));
		addDetails(() => {
			read(dfileSize);
			addMemDump(false);
		});
	}, true);

	// VARS
	let varsSize = eline_ptr - vars_ptr;
	if (varsSize < 0)
		varsSize = 0;
	remainingSize = getRemainingSize();
	if (varsSize > remainingSize)
		varsSize = remainingSize;
	read(varsSize);

	addRow('VARS $' + toHex(vars_ptr) + ' - $' + toHex(eline_ptr), '', 'ZX81 BASIC variables.');
	addDetails(() => {
		read(varsSize);
		addMemDump(false);
	}, false);
}


/** Returns a hex string for a number.
 * Without $ or 0x.
 */
function toHex(val: number, len = 4) {
	return val.toString(16).toUpperCase().padStart(len, '0')
}

/** Represents the ZX81 simulated screen.
 */
/** Draws a ZX Spectrum ULA screen into the given canvas.
 * @param ctx The canvas 2d context to draw to.
 * @param imgData A reusable array to create the pixel data in.
 * @param dfile The DFILE data. If undefined, FAST mode is active.
 * @param charset The charset data.
 * @param debug true if debug mode is on. Shows grey background if
 * dfile is not elapsed.
 */
function drawUlaScreen(ctx: CanvasRenderingContext2D, imgData: ImageData, dfile: number[], charset: number[], debug: boolean) {
	const pixels = imgData.data;
	let dfileIndex = dfile[0] === 0x76 ? 1 : 0;

	if (debug)
		pixels.fill(128);	// gray background
	else
		pixels.fill(0xFF);	// white background

	// Safety check
	if (!dfile)
		return;

	const width = SCREEN_WIDTH / 8;
	const height = SCREEN_HEIGHT / 8;
	let x = 0;
	let y = 0;

	let fgRed = 0, fgGreen = 0, fgBlue = 0;
	let bgRed = 0xFF, bgGreen = 0xFF, bgBlue = 0xFF;

	while (y < height) {
		const char = dfile[dfileIndex];
		if (x >= width || char === 0x76) {
			x = 0;
			y++;
			dfileIndex++;
			continue;
		};

		const inverted = (char & 0x80) !== 0;
		let charIndex = (char & 0x7f) * 8;
		let pixelIndex = (y * SCREEN_WIDTH + x) * 8 * 4;

		// 8 lines per character
		for (let charY = 0; charY < 8; ++charY) {
			let byte = charset[charIndex];
			if (inverted) byte = byte ^ 0xFF;
			// 8 pixels par line
			for (let charX = 0; charX < 8; ++charX) {
				if (byte & 0x80) {
					// Foreground color
					pixels[pixelIndex++] = fgRed;
					pixels[pixelIndex++] = fgGreen;
					pixels[pixelIndex++] = fgBlue;
					pixels[pixelIndex++] = 0xFF;	// alpha
				}
				else {
					// Background color
					pixels[pixelIndex++] = bgRed;
					pixels[pixelIndex++] = bgGreen;
					pixels[pixelIndex++] = bgBlue;
					pixels[pixelIndex++] = 0xFF;	// alpha
				}
				byte = (byte & 0x7F) << 1;
			}
			// Next line
			pixelIndex += (SCREEN_WIDTH - 8) * 4;
			charIndex++;
		}

		x++;
		dfileIndex++;
	}

	ctx.putImageData(imgData, 0, 0);
}
