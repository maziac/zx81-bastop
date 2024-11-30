import * as assert from 'assert';
import {Zx81BasToPfile} from '../src/zx81bastopfile';
import {warn} from 'console';

/** Tests for the ZX81 Basic parser.
 */
describe('Zx81BasToPfile', () => {

	describe('generic', () => {
		it('constructor', () => {
			new Zx81BasToPfile("");
		});

		it('array/map', () => {
			const conv = new Zx81BasToPfile("") as any;
			// Test a few, remQuotedMap
			assert.equal(conv.remQuotedMap.get(":"), 0x0E);
			assert.equal(conv.remQuotedMap.get("[RND]"), 0x40);
			assert.equal(conv.remQuotedMap.get("[INKEY$]"), 0x41);
			assert.equal(conv.remQuotedMap.get("[PI]"), 0x42);
			assert.equal(conv.remQuotedMap.get("@@"), 0x88);
			assert.equal(conv.remQuotedMap.get("A"), 0x26);
			assert.equal(conv.remQuotedMap.get("%A"), 0xA6);
			assert.equal(conv.remQuotedMap.get("\\\""), 0xC0);
			assert.equal(conv.remQuotedMap.get("AT "), undefined);
			assert.equal(conv.remQuotedMap.get(" LPRINT "), undefined);
			assert.equal(conv.remQuotedMap.get("[AT]"), 0xC1);
			assert.equal(conv.remQuotedMap.get("[LPRINT]"), 0xE1);
		});

		it('createRegex', () => {
			const conv = new Zx81BasToPfile("") as any;
			assert.equal(conv.createRegex(["abc"]).toString(), '/(abc)/iy');
			assert.equal(conv.createRegex(["a", "bc"]).toString(), '/(bc|a)/iy');
			assert.equal(conv.createRegex(["[123]", "[PLOT]"]).toString(), '/(\\[PLOT\\]|\\[123\\])/iy');
			assert.equal(conv.createRegex(["PLOT"]).toString(), '/(PLOT)/iy');
		});
	});

	describe('readNumber', () => {
		it('no number', () => {
			{
				const conv = new Zx81BasToPfile("") as any;
				assert.equal(conv.readNumber(), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile("abc") as any;
				assert.equal(conv.readNumber(), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile(" ") as any;
				assert.equal(conv.readNumber(), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile("-1") as any;
				assert.equal(conv.readNumber(), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile("+1") as any;
				assert.equal(conv.readNumber(), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
		});

		it('integer', () => {
			{
				const conv = new Zx81BasToPfile("0") as any;
				assert.deepEqual(conv.readNumber(), [
					28,
					126,	// Number
					0, 0, 0, 0, 0
				]);
				assert.equal(conv.position, 1);
				assert.equal(conv.colNr, 1);
			}
			{
				const conv = new Zx81BasToPfile("1") as any;
				assert.deepEqual(conv.readNumber(), [
					29,
					126,	// Number
					129, 0, 0, 0, 0
				]);
				assert.equal(conv.position, 1);
				assert.equal(conv.colNr, 1);
			}
			{
				const conv = new Zx81BasToPfile("9") as any;
				assert.deepEqual(conv.readNumber(), [
					37,
					126,	// Number
					132, 16, 0, 0, 0
				]);
				assert.equal(conv.position, 1);
				assert.equal(conv.colNr, 1);
			}
			{
				const conv = new Zx81BasToPfile("19") as any;
				assert.deepEqual(conv.readNumber(), [
					29, 37,
					126,	// Number
					133, 24, 0, 0, 0
				]);
				assert.equal(conv.position, 2);
				assert.equal(conv.colNr, 2);
			}
			{
				const conv = new Zx81BasToPfile("199999") as any;
				assert.deepEqual(conv.readNumber(), [
					29, 37, 37, 37, 37, 37,
					126,	// Number
					146, 67, 79, 192, 0
				]);
				assert.equal(conv.position, 6);
				assert.equal(conv.colNr, 6);
			}
		});

		it('float', () => {
			{
				const conv = new Zx81BasToPfile("0.5") as any;
				assert.deepEqual(conv.readNumber(), [
					28, 27, 33,
					126,	// Number
					128, 0, 0, 0, 0
				]);
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 3);
			}
			{
				const conv = new Zx81BasToPfile(".6E-1") as any;
				assert.deepEqual(conv.readNumber(), [
					27, 34, 42, 22, 29,
					126,	// Number
					124, 117, 194, 143, 92
				]);
				assert.equal(conv.position, 5);
				assert.equal(conv.colNr, 5);
			}
			{
				const conv = new Zx81BasToPfile("00.04E+2") as any;
				assert.deepEqual(conv.readNumber(), [
					28, 28, 27, 28, 32, 42, 21, 30,
					126,	// Number
					131, 0, 0, 0, 0
				]);
				assert.equal(conv.position, 8);
				assert.equal(conv.colNr, 8);
			}
		});
	});

	describe('readQuotedString', () => {
		it('no quoted string', () => {
			const conv = new Zx81BasToPfile(' ') as any;
			assert.equal(conv.readQuotedString(), undefined);
			assert.equal(conv.position, 0);
			assert.equal(conv.colNr, 0);
		});

		it('unclosed', () => {
			const conv = new Zx81BasToPfile('"') as any;
			assert.throws(() => {
				conv.readQuotedString();
			});
			assert.equal(conv.position, 1);
			assert.equal(conv.colNr, 1);
			assert.equal(conv.lineNr, 0);
		});

		it('empty', () => {
			const conv = new Zx81BasToPfile('""') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B, 0x0B]);
			assert.equal(conv.position, 2);
			assert.equal(conv.colNr, 2);
		});

		it('read next', () => {
			{
				const conv = new Zx81BasToPfile('""') as any;
				conv.readQuotedString();	// Skip REM
				assert.deepEqual(conv.testReadChar(), '\n');
			}
			{
				const conv = new Zx81BasToPfile('"     "') as any;
				conv.readQuotedString();	// Skip REM
				assert.deepEqual(conv.testReadChar(), '\n');
			}
			{
				const conv = new Zx81BasToPfile('"    "R') as any;
				conv.readQuotedString();	// Skip REM
				assert.deepEqual(conv.testReadChar(), 'R');
			}
		});

		it('graphics', () => {
			const conv = new Zx81BasToPfile("\"\\' \\ '\\''\\. \\: \\.'\\:'\\##\\,,\\~~\"") as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
				0x0B]);
			assert.equal(conv.position, 32);
			assert.equal(conv.colNr, 32);
		});

		it('characters', () => {
			const conv = new Zx81BasToPfile('"#AB %CD EZ"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0x0C, 0x26, 0x27, 0, 0xA8, 0x29, 0, 0x2A, 0x3F,
				0x0B]);
			assert.equal(conv.position, 12);
			assert.equal(conv.colNr, 12);
		});

		it('[RND],[INKEY$],[PI]', () => {
			const conv = new Zx81BasToPfile('"RND[RND][INKEY$][PI]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0x37, 0x33, 0x29,
				0x40, 0x41, 0x42,
				0x0B]);
			assert.equal(conv.position, 22);
			assert.equal(conv.colNr, 22);
		});

		it('[67]-[127]', () => {
			const conv = new Zx81BasToPfile('"[67][118][127]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				67, 118 /*NL*/, 127,
				0x0B]);
		});

		it('graphics (inverted)', () => {
			const conv = new Zx81BasToPfile("\"\\::\\.:\\:.\\..\\':\\ :\\'.\\ .@@\\;;\\!!\"") as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138,
				0x0B]);
		});

		it('characters (inverted)', () => {
			const conv = new Zx81BasToPfile('"%"%#%$%0%A%Z"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0x8B, 0x8C, 0x8D, 0x9C, 0xA6, 0xBF,
				0x0B]);
		});

		it('"" (0xC0)', () => {
			const conv = new Zx81BasToPfile('"\\""') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xC0,
				0x0B]);
		});

		it('[AT]-[NOT]', () => {
			const conv = new Zx81BasToPfile('"[AT][NOT]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xC1, 0xD7,
				0x0B]);
		});

		it('** (0xD8)', () => {
			const conv = new Zx81BasToPfile('"[**]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xD8,
				0x0B]);
		});

		it('[OR]-[AND]', () => {
			const conv = new Zx81BasToPfile('"[OR][AND]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xD9, 0xDA,
				0x0B]);
		});

		it('[<=],[>=],[<>]', () => {
			const conv = new Zx81BasToPfile('"[<=][>=][<>]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xDB, 0xDC, 0xDD,
				0x0B]);
		});

		it('[THEN]-[COPY]', () => {
			const conv = new Zx81BasToPfile('"[THEN][COPY]"') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0xDE, 0xFF,
				0x0B]);
		});

		it('special tests', () => {
			const conv = new Zx81BasToPfile('"<=>=<>[<=][>=][<>] LIST "') as any;
			assert.deepEqual(conv.readQuotedString(), [0x0B,
				0x13, 0x14, 0x12,
				0x14, 0x13, 0x12,
				0xDB, 0xDC, 0xDD,
				0, 0x31, 0x2E, 0x38, 0x39, 0, // LIST
				0x0B]);
		});
	});


	describe('readRem', () => {
		it('empty', () => {
			const conv = new Zx81BasToPfile('\n') as any;
			assert.deepEqual(conv.readRem(), []);
			assert.equal(conv.position, 1);
			assert.equal(conv.colNr, 0);
		});

		it('col, line', () => {
			{
				const conv = new Zx81BasToPfile("\\' \n") as any;
				assert.deepEqual(conv.readRem(), [1]);
				assert.equal(conv.position, 4);
				assert.equal(conv.colNr, 0);
			}
			{	// NL at the end is interpreted as space
				const conv = new Zx81BasToPfile("\\'\n") as any;
				assert.deepEqual(conv.readRem(), [1]);
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 0);
			}
		});

		it('normal', () => {
			const conv = new Zx81BasToPfile('01234\n') as any;
			assert.deepEqual(conv.readRem(), [
				0x1c, 0x1d, 0x1e, 0x1f, 0x20
			]);
			assert.equal(conv.position, 6);
			assert.equal(conv.colNr, 0);
		});

		it('cont', () => {
			const conv = new Zx81BasToPfile('012\\ \n34\n') as any;
			assert.deepEqual(conv.readRem(), [
				0x1c, 0x1d, 0x1e, 0x1f, 0x20
			]);
			assert.equal(conv.position, 9);
			assert.equal(conv.colNr, 0);
		});

		it('graphics', () => {
			const conv = new Zx81BasToPfile("\\' \\ '\\''\\. \\: \\.'\\:'\\##\\,,\\~~") as any;
			assert.deepEqual(conv.readRem(), [
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10
			]);
		});

		it('characters', () => {
			const conv = new Zx81BasToPfile('#AB %CD EZ') as any;
			assert.deepEqual(conv.readRem(), [
				0x0C, 0x26, 0x27, 0, 0xA8, 0x29, 0, 0x2A, 0x3F
			]);
		});

		// Note: The rest of the implementation is similar to the readQuotedString. Therefore further tests are skipped.
	});

	describe('readToken', () => {
		it('regex', () => {
			{
				const conv = new Zx81BasToPfile("") as any;
				assert.equal(conv.readToken(/^(MYTOKEN)/), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile("MYTOKE") as any;
				assert.equal(conv.readToken(/^(MYTOKEN)/), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile(" MYTOKEN") as any;
				assert.equal(conv.readToken(/^(MYTOKEN)/), undefined);
				assert.equal(conv.position, 0);
				assert.equal(conv.colNr, 0);
			}
			{
				const conv = new Zx81BasToPfile("MYTOKEN") as any;
				assert.equal(conv.readToken(/^(MYTOKEN)/), "MYTOKEN");
				assert.equal(conv.position, 7);
				assert.equal(conv.colNr, 7);
			}
			{
				const conv = new Zx81BasToPfile(" MYTOKEN ") as any;
				assert.equal(conv.readToken(/^(T1|\sMYTOKEN\s)/), " MYTOKEN ");
				assert.equal(conv.position, 9);
				assert.equal(conv.colNr, 9);
			}
		});

		it('regex tab', () => {
			const conv = new Zx81BasToPfile(" MYTOKEN\t") as any;
			assert.equal(conv.readToken(/^(T1|\sMYTOKEN\s)/), " MYTOKEN ");
			assert.equal(conv.position, 9);
			assert.equal(conv.colNr, 9);
		});

		it('RNDVAR', () => {
			{
				const conv = new Zx81BasToPfile("RND ") as any;
				assert.equal(conv.readToken(conv.normalRegex), "RND");
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 3);
			}
			{
				const conv = new Zx81BasToPfile("RND(") as any;
				assert.equal(conv.readToken(conv.normalRegex), "RND");
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 3);
			}
			{
				const conv = new Zx81BasToPfile("RND") as any;
				assert.equal(conv.readToken(conv.normalRegex), "RND");
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 3);
			}
			{
				const conv = new Zx81BasToPfile("RNDVAR") as any;
				assert.equal(conv.readToken(conv.normalRegex), "R");
				assert.equal(conv.position, 1);
				assert.equal(conv.colNr, 1);
			}
			{
				const conv = new Zx81BasToPfile("PI") as any;
				assert.equal(conv.readToken(conv.normalRegex), "PI");
				assert.equal(conv.position, 2);
				assert.equal(conv.colNr, 2);
			}
			{
				const conv = new Zx81BasToPfile("PIT") as any;
				assert.equal(conv.readToken(conv.normalRegex), "P");
				assert.equal(conv.position, 1);
				assert.equal(conv.colNr, 1);
			}
		});

		it('remQuotedMap', () => {
			{
				const conv = new Zx81BasToPfile("\n") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), undefined);
			}
			{
				const conv = new Zx81BasToPfile("") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), undefined);
			}
			{
				const conv = new Zx81BasToPfile("§") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), undefined);
			}
			{
				const conv = new Zx81BasToPfile("A") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "A");
			}
			{
				const conv = new Zx81BasToPfile("%A") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "%A");
			}
			{
				const conv = new Zx81BasToPfile("\\::") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "\\::");
			}
			{
				const conv = new Zx81BasToPfile("\\: ") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "\\: ");
			}
			{
				const conv = new Zx81BasToPfile("\\:") as any; // Special case, e.g. end of line. \n treated as space
				assert.equal(conv.readToken(conv.remQuotedRegex), "\\: ");
			}
			{
				const conv = new Zx81BasToPfile("RND") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "R");
			}
			{
				const conv = new Zx81BasToPfile("[RND]") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "[RND]");
			}
			{
				const conv = new Zx81BasToPfile(" PLOT ") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), " ");
			}
			{
				const conv = new Zx81BasToPfile("[PLOT]") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "[PLOT]");
			}
			{
				const conv = new Zx81BasToPfile("[80]") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), "[80]");
			}
			{	// Should not be recognized
				const conv = new Zx81BasToPfile("[PLOT\t]") as any;
				assert.equal(conv.readToken(conv.remQuotedRegex), undefined);
			}
		});
	});

	describe('testReadChar', () => {
		it('testReadChar', () => {
			{
				const conv = new Zx81BasToPfile("");
				assert.equal(conv.testReadChar(), '\n');
			}
			{
				const conv = new Zx81BasToPfile("abc");
				assert.equal(conv.testReadChar(), 'a');
			}
		});
	});

	describe('readSpecialCode', () => {

		it('0-255', () => {
			let s = '';
			for (let i = 0; i < 256; i++) {
				s += '[' + i + ']';
			}
			const conv = new Zx81BasToPfile(s) as any;
			for (let i = 0; i < 256; i++) {
				assert.deepEqual(conv.readSpecialCode(), [i]);
			}
		});
		it('out of range', () => {
			const conv = new Zx81BasToPfile('[256]') as any;
			assert.throws(() => {
				conv.readSpecialCode();
			});
		});
		it('no match', () => {
			{
				const conv = new Zx81BasToPfile('[-1]') as any;
				assert.equal(conv.readSpecialCode(), undefined);
			}
			{
				const conv = new Zx81BasToPfile('[! size]') as any;
				assert.equal(conv.readSpecialCode(), undefined);
			}
			{
				const conv = new Zx81BasToPfile('[ #size]') as any;
				assert.equal(conv.readSpecialCode(), undefined);
			}
		});
		it('!block', () => {
			{
				const conv = new Zx81BasToPfile('[!block=100]') as any;
				assert.equal(conv.readSpecialCode().length, 100);
			}
			{
				const conv = new Zx81BasToPfile('[!block = 100 ]') as any;
				assert.equal(conv.readSpecialCode().length, 100);
			}
		});
		it('!include filename.obj', () => {
			{
				const conv = new Zx81BasToPfile('[!include file.obj]') as any;
				conv.setReadFileFunction((filename: string) => {
					assert.equal(filename, 'file.obj');
					return [1, 2, 3];
				});
				assert.deepEqual(conv.readSpecialCode(), [1, 2, 3]);
			}
			{
				const conv = new Zx81BasToPfile('[!include   ../file.obj ]') as any;
				conv.setReadFileFunction((filename: string) => {
					assert.equal(filename, '../file.obj');
					return [4, 5];
				});
				assert.deepEqual(conv.readSpecialCode(), [4, 5]);
			}
			{
				const conv = new Zx81BasToPfile('[!include   file with space .obj ]') as any;
				conv.setReadFileFunction((filename: string) => {
					assert.equal(filename, 'file with space .obj');
					return [6, 7];
				});
				assert.deepEqual(conv.readSpecialCode(), [6, 7]);
			}
		});
		it('# comment', () => {
			const conv = new Zx81BasToPfile('[#some comment]') as any;
			assert.deepEqual(conv.readSpecialCode(), []);

		});

		describe('ungreedy', () => {
			it('[2][3]', () => {
				const conv = new Zx81BasToPfile('[2][3]') as any;
				assert.deepEqual(conv.readSpecialCode(), [2]);
				assert.equal(conv.position, 3);
				assert.equal(conv.colNr, 3);
			});
			it('[#][3]', () => {
				const conv = new Zx81BasToPfile('[#][3]') as any;
				conv.readSpecialCode();
				assert.equal(conv.position, 3);
			});
			it('[# comment ][3]', () => {
				const conv = new Zx81BasToPfile('[# comment ][3]') as any;
				conv.readSpecialCode();
				assert.equal(conv.position, 12);
			});
			it('[!block=10][3]', () => {
				const conv = new Zx81BasToPfile('[!block=10][3]') as any;
				conv.readSpecialCode();
				assert.equal(conv.position, 11);
			});
			it('[!include ../file.obj][3]', () => {
				const conv = new Zx81BasToPfile('[!include ../file.obj][3]') as any;
				conv.setReadFileFunction(_filename => []);
				conv.readSpecialCode();
				assert.equal(conv.position, 22);
			});
		});
	});

	describe('parseCommentHeader', () => {
		describe('handleDfile', () => {
			it('normal', () => {
				const conv = new Zx81BasToPfile("  ABC") as any;
				conv.handleDfile();
				assert.equal(conv.dfileOut.length, 1);
				const line = conv.dfileOut[0];
				assert.deepEqual(line, [
					0, 0,
					0x26, 0x27, 0x28
				]);
			});
			it('exceptions', () => {
				{
					const conv = new Zx81BasToPfile("") as any;
					assert.throws(() => {
						conv.handleBasicStart("");
					});
				}
				{
					const conv = new Zx81BasToPfile("") as any;
					assert.throws(() => {
						conv.handleBasicStart("-1");
					});
				}
				{
					const conv = new Zx81BasToPfile("") as any;
					assert.throws(() => {
						conv.handleBasicStart("10000");
					});
				}
			});
		});

		describe('handleBasicVars', () => {
			it('one value', () => {
				const conv = new Zx81BasToPfile("[123]") as any;
				conv.handleBasicVars();
				assert.deepEqual(conv.basicVariablesOut, [123]);
			});
			it('multiple values', () => {
				const conv = new Zx81BasToPfile("[123,214]") as any;
				conv.handleBasicVars();
				assert.deepEqual(conv.basicVariablesOut, [123, 214]);
			});
			it('with spaces', () => {
				const conv = new Zx81BasToPfile("[ 123 , 214 ]") as any;
				conv.handleBasicVars();
				assert.deepEqual(conv.basicVariablesOut, [123, 214]);
			});
			it('exceptions', () => {
				{
					const conv = new Zx81BasToPfile("[-1]") as any;
					assert.throws(() => {
						conv.handleBasicVars();
					});
				}
				{
					const conv = new Zx81BasToPfile("[256]") as any;
					assert.throws(() => {
						conv.handleBasicVars();
					});
				}
				{
					const conv = new Zx81BasToPfile("[1") as any;
					assert.throws(() => {
						conv.handleBasicVars();
					});
				}
			});
		});


		it('empty', () => {
			const conv = new Zx81BasToPfile("") as any;
			assert.equal(conv.parseCommentHeader(), false);
		});
		it('just #!', () => {
			const conv = new Zx81BasToPfile("#!") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.equal(conv.position, 2);
			assert.equal(conv.colNr, 2);
			assert.equal(conv.lineNr, 0);
		});
		it('just #! with spaces', () => {
			const conv = new Zx81BasToPfile("#!   ") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.equal(conv.position, 5);
			assert.equal(conv.colNr, 5);
			assert.equal(conv.lineNr, 0);
		});
		it('basic-start', () => {
			const conv = new Zx81BasToPfile("#!basic-start=100") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.equal(conv.basicStartLine, 100);
		});
		it('basic-start with spaces', () => {
			const conv = new Zx81BasToPfile("#!  basic-start  = 100  ") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.equal(conv.basicStartLine, 100);
		});
		it('dfile-collapsed', () => {
			const conv = new Zx81BasToPfile("#! dfile-collapsed") as any;
			assert.equal(conv.dfileCollapsed, false);
			assert.equal(conv.parseCommentHeader(), true);
			assert.equal(conv.dfileCollapsed, true);
		});
		it('dfile:', () => {
			{
				const conv = new Zx81BasToPfile("#!dfile:") as any;
				assert.equal(conv.parseCommentHeader(), true);
				assert.deepEqual(conv.dfileOut, [[]]);
			}
			{
				const conv = new Zx81BasToPfile("#!dfile:A") as any;
				assert.equal(conv.parseCommentHeader(), true);
				assert.deepEqual(conv.dfileOut, [[
					0x26, // A
				]]);
			}
			{
				const conv = new Zx81BasToPfile("#!dfile: A B ") as any;
				assert.equal(conv.parseCommentHeader(), true);
				assert.deepEqual(conv.dfileOut, [[
					0, 		// Space
					0x26, 	// A
					0, 		// Space
					0x27, 	// B
					0 		// Space
				]]);
			}
			{
				const conv = new Zx81BasToPfile("#!dfile:A\n#!dfile:B") as any;
				assert.equal(conv.parseCommentHeader(), true);
				assert.deepEqual(conv.dfileOut, [[0x26]]);
				conv.skipSpacesEtc();
				assert.equal(conv.parseCommentHeader(), true);
				assert.deepEqual(conv.dfileOut, [[0x26], [0x27]]);
			}
		});

		it('basic-vars:[]', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[]") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, []);
		});
		it('basic-vars: [ ] ', () => {
			const conv = new Zx81BasToPfile("#!basic-vars: [ ] ") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, []);
		});
		it('basic-vars:[231]', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[231]") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [231]);
		});
		it('basic-vars:[ 231 ]', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[ 231 ]") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [231]);
		});
		it('basic-vars:[231,2,7,91]', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[231,2,7,91]") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [231, 2, 7, 91]);
		});
		it('basic-vars: [ 231 ,  2 ,7 , 91  ] ', () => {
			const conv = new Zx81BasToPfile("#!basic-vars: [ 231 ,  2 ,7 , 91  ] ") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [231, 2, 7, 91]);
		});
		it('2 lines basic-vars', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:  [1,2] \n#!basic-vars:   [3 ,4] \n") as any;
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [1, 2]);
			conv.skipSpacesEtc();
			assert.equal(conv.parseCommentHeader(), true);
			assert.deepEqual(conv.basicVariablesOut, [1, 2, 3, 4]);
		});

		it('text after command', () => {
			const conv = new Zx81BasToPfile("#!  basic-start = 100  ERROR ") as any;
			assert.throws(() => {
				assert.equal(conv.parseCommentHeader(), true);
			});
			assert.equal(conv.position, 23);
		});
	});

	describe('encode', () => {
		describe('good cases', () => {
			it('Empty', () => {
				const conv = new Zx81BasToPfile("") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, []);
			});
			it('Empty lines', () => {
				const conv = new Zx81BasToPfile("\n   \n\n ") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, []);
			});
			it('Commented lines', () => {
				const conv = new Zx81BasToPfile("# comment1   \n  # comment2\n ") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, []);
			});
			it('Continuation \\ lines', () => {
				const conv = new Zx81BasToPfile("\n   \\\n\\\n\\ ") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, []);
			});
			it('1 line', () => {
				const conv = new Zx81BasToPfile("10 PRINT") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					2, 0,	// Size
					0xF5,	// PRINT
					0x76	// Newline
				]);
			});
			it('2 lines', () => {
				const conv = new Zx81BasToPfile("10 PRINT\n20 PRINT") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					2, 0,	// Size
					0xF5,	// PRINT
					0x76,	// Newline
					0, 20,	// Line number
					2, 0,	// Size
					0xF5,	// PRINT
					0x76	// Newline
				]);
			});
			it('More complex', () => {
				const conv = new Zx81BasToPfile("256 PRINT A;\"HEL\";B") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					1, 0,	// Line number
					11, 0,	// Size
					0xF5,	// PRINT
					0x26,	// A
					0x19,	// ;
					0x0B,	// \"
					0x2D, 0x2A, 0x31, 	// HEL
					0x0B,	// \"
					0x19,	// ;
					0x27,	// B
					0x76,	// Newline
				]);
			});
			it('With spaces and quoted string', () => {
				const conv = new Zx81BasToPfile("256   PRINT  A;\"HEL \"; B ") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					1, 0,	// Line number
					15, 0,	// Size
					0xF5,	// PRINT
					0,		// Space
					0x26,	// A
					0x19,	// ;
					0x0B,	// \"
					0x2D, 0x2A, 0x31, 	// HEL
					0,		// Space
					0x0B,	// \"
					0x19,	// ;
					0,		// Space
					0x27,	// B
					0,		// Space
					0x76,	// Newline
				]);
			});
			it('With 1 float', () => {
				const conv = new Zx81BasToPfile("20 PRINT 50.7") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 20,	// Line number
					12, 0,	// Size
					0xF5,	// PRINT

					0x21,	// 5
					0x1C,	// 0
					0x1B,	// .
					0x23,	// 7
					0x7E, 134, 74, 204, 204, 205,

					0x76,	// Newline
				]);
			});
			it('With several numbers', () => {
				const conv = new Zx81BasToPfile("20 PRINT 50.7+A-9-.3E-7") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 20,	// Line number
					34, 0,	// Size
					0xF5,	// PRINT

					0x21,	// 5
					0x1C,	// 0
					0x1B,	// .
					0x23,	// 7
					0x7E, 134, 74, 204, 204, 205,

					0x15, 0x26, 0x16,	// +A-

					0x25,	// 9
					0x7E, 132, 16, 0, 0, 0,

					0x16,	// -

					0x1B, 0x1F, 0x2A, 0x16, 0x23,	// .3E-7
					0x7E, 104, 0, 217, 89, 77,

					0x76,	// Newline
				]);
			});

			describe('spaces', () => {
				it('2 commands with just 1 space in between', () => {
					// LIST is interpreted as variable
					const conv = new Zx81BasToPfile("10 PLOT LIST") as any;
					conv.encodeBasic();
					const buf = conv.basicCodeOut;
					assert.deepEqual(buf, [
						0, 10,	// Line number
						3, 0,	// Size
						0xF6,	// PLOT
						0xF0,	// LIST
						0x76,	// Newline
					]);
				});
				it('10 IF A=0 THEN GOTO 0', () => {
					// Just 1 space between THEN and GOTO
					const conv = new Zx81BasToPfile("10 IF A=0 THEN GOTO 0") as any;
					conv.encodeBasic();
					const buf = conv.basicCodeOut;
					assert.deepEqual(buf, [
						0, 10,	// Line number
						20, 0,	// Size
						0xFA,	// IF
						0x26,	// A
						0x14,	// =
						0x1C,	// 0
						0x7E, 0, 0, 0, 0, 0,
						0xDE,	// THEN
						0xEC,	// GOTO
						0x1C,	// 0
						0x7E, 0, 0, 0, 0, 0,
						0x76,	// Newline
					]);
				});
			});

			it('RND, INKEY$, PI', () => {
				const conv = new Zx81BasToPfile("10 PLOT RND INKEY$ PI") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					7, 0,	// Size
					0xF6,	// PLOT
					0x40,	// RND
					0,		// SPACE
					0x41,	// INKEY$
					0,		// SPACE
					0x42,	// PI
					0x76,	// Newline
				]);
			});

			it('LET RNDVAR=RND', () => {
				const conv = new Zx81BasToPfile("10 LET RNDVAR=RND") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					10, 0,	// Size
					0xF1, // LET
					0x37, 0x33, 0x29, 0x3B, 0x26, 0x37,	// RNDVAR
					0x14,	// =
					0x40,	// RND
					0x76,	// Newline
				]);
			});

			it('"', () => {
				const conv = new Zx81BasToPfile(
					'10 PLOT %"') as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					3, 0,	// Size
					0xF6,	// PLOT
					139,	// \"
					0x76,	// Newline
				]);
			});

			it('# - . inverse', () => {
				const conv = new Zx81BasToPfile(
					'10 PLOT %#%$%:%?%(%)%>%<%=%+%-%*%/%;%,%.') as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					18, 0,	// Size
					0xF6,	// PLOT
					140, 141, 142, 143, 144, 145, 146, 147,
					148, 149, 150, 151, 152, 153, 154,
					155,	// .
					0x76,	// Newline
				]);
			});

			it('0 - Z inverse', () => {
				const conv = new Zx81BasToPfile(
					'10 PLOT %0%1%2%3%4%5%6%7%8%9%A%B%C%D%E%F%G%H%I%J%K%L%M%N%O%P%Q%R%S%T%U%V%W%X%Y%Z') as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					38, 0,	// Size
					0xF6,	// PLOT
					156,	// 0
					157, 158, 159, 160, 161, 162, 163, 164,
					165, 166, 167, 168, 169, 170, 171, 172,
					173, 174, 175, 176, 177, 178, 179, 180,
					181, 182, 183, 184, 185, 186, 187, 188,
					189, 190,
					191,	// Z
					0x76,	// Newline
				]);
			});

			it('AT - COPY', () => {
				const conv = new Zx81BasToPfile(
					'10 PLOT AT TAB CODE VAL LEN SIN COS TAN ASN ACS ATN LN EXP INT SQR SGN ABS PEEK USR STR$ CHR$ NOT ** OR  AND <=>=<> THEN  TO  STEP LPRINT LLIST STOP SLOW FAST NEW SCROLL CONT DIM REM FOR GOTO GOSUB INPUT LOAD LIST LET PAUSE NEXT POKE PRINT PLOT RUN SAVE RAND IF CLS UNPLOT CLEAR RETURN COPY '
				) as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					64, 0,	// Size
					0xF6,	// PLOT
					193,	// AT
					194,	// TAB
					196,	// CODE
					197, 198, 199, 200, 201, 202, 203, 204,
					205, 206, 207, 208, 209, 210, 211, 212,
					213, 214, 215, 216, 217, 218, 219, 220,
					221, 222, 223, 224, 225, 226, 227, 228,
					229, 230, 231, 232, 233, 234, 235, 236,
					237, 238, 239, 240, 241, 242, 243, 244,
					245, 246, 247, 248, 249, 250, 251, 252,
					253, 254,
					255,	// COPY
					0x76,	// Newline
				]);
			});


			describe('special codes', () => {
				describe('quoted string', () => {
					it('0-255', () => {
						const buf = [
							0, 1,	// Line number
							(4 + 256) % 256, 1,	// Size
							0xF5,	// PRINT
							0x0B,	// Quote
						]
						let s = '';
						for (let i = 0; i < 256; i++) {
							s += '[' + i + ']';
							buf.push(i);
						}
						buf.push(0x0B);	// Quote
						buf.push(0x76);	// Newline
						const conv = new Zx81BasToPfile('1 PRINT "' + s + '"') as any;
						conv.encodeBasic();
						assert.deepEqual(conv.basicCodeOut, buf);
					});
				});
				describe('REM', () => {
					it('0-255', () => {
						const buf = [
							0, 1,	// Line number
							(2 + 256) % 256, 1,	// Size
							0xEA,	// REM
						]
						let s = '';
						for (let i = 0; i < 256; i++) {
							s += '[' + i + ']';
							buf.push(i);
						}
						buf.push(0x76);	// Newline
						const conv = new Zx81BasToPfile('1 REM ' + s) as any;
						conv.encodeBasic();
						assert.deepEqual(conv.basicCodeOut, buf);
					});
				});
				describe('"normal"', () => {
					it('0-255', () => {
						// Not a realsenseful case, but doable
						const buf = [
							0, 1,	// Line number
							(2 + 256) % 256, 1,	// Size
							0xF6,	// PLOT
						]
						let s = '';
						for (let i = 0; i < 256; i++) {
							s += '[' + i + ']';
							buf.push(i);
						}
						buf.push(0x76);	// Newline
						const conv = new Zx81BasToPfile('1 PLOT ' + s) as any;
						conv.encodeBasic();
						assert.deepEqual(conv.basicCodeOut, buf);
					});
				});
			});
		});


		describe('bad cases', () => {
			it('Not enough space', () => {
				const conv = new Zx81BasToPfile("10PLOT") as any;
				assert.throws(() => {
					conv.encodeBasic();
				});
			});
			it('Line = -1', () => {
				const conv = new Zx81BasToPfile("-1 PLOT") as any;
				assert.throws(() => {
					conv.encodeBasic();
				});
			});
			it('Line = 10000', () => {
				const conv = new Zx81BasToPfile("10000 PLOT") as any;
				assert.throws(() => {
					conv.encodeBasic();
				});
			});
			it('Line 2 smaller/equal line 1', () => {
				const conv = new Zx81BasToPfile("2 PLOT\n2 PLOT\n") as any;
				assert.throws(() => {
					conv.encodeBasic();
				});
			});
		});

		describe('impossible (but good) cases', () => {
			it('Extra commands with 1 space', () => {
				const conv = new Zx81BasToPfile("10 PLOT LIST") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					3, 0,	// Size
					0xF6,	// PLOT
					0xF0,	// LIST
					0x76,	// Newline
				]);
			});
			it('Extra commands with 2 spaces', () => {
				const conv = new Zx81BasToPfile("10 PLOT  LIST") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					4, 0,	// Size
					0xF6,	// PLOT
					0,		// Space
					0xF0,	// LIST
					0x76,	// Newline
				]);
			});
		});

		describe('errors', () => {
			it('Unknown command', () => {
				const conv = new Zx81BasToPfile("10 PL OT") as any;
				try {
					conv.encodeBasic();
					// Should not reach here
					assert.fail();
				}
				catch (e) {
					assert.ok(e.message.startsWith('Unknown command'));
					assert.equal(e.line, 0);
					assert.equal(e.column, 3);
				}
			});
		});

		describe('warnings', () => {
			it('DIM', () => {
				const conv = new Zx81BasToPfile("10 DIM GOTO(99)") as any;
				let warningsCount = 0;
				conv.on('warning', (msg, line, col) => {
					assert.notEqual(msg, undefined);
					assert.equal(line, 0);
					assert.equal(col, 7);
					warningsCount++;
				});
				conv.encodeBasic();
				assert.equal(warningsCount, 1);
			});
			it('LET', () => {
				const conv = new Zx81BasToPfile("10 LET   RND = 8") as any;
				let warningsCount = 0;
				conv.on('warning', (msg, line, col) => {
					assert.notEqual(msg, undefined);
					assert.equal(line, 0);
					assert.equal(col, 9);
					warningsCount++;
				});
				conv.encodeBasic();
				assert.equal(warningsCount, 1);
			});
			it('several', () => {
				const conv = new Zx81BasToPfile("10 LET RND=8 \n20 DIM PRINT(8)") as any;
				let warningsCount = 0;
				conv.on('warning', msg => {
					warningsCount++;
				});
				conv.encodeBasic();
				assert.equal(warningsCount, 2);
			});
		});

		describe('nextLineOffset', () => {
			it('empty comment header', () => {
				const conv = new Zx81BasToPfile("#! \n10 PRINT") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					2, 0,	// Size
					0xF5,	// PLOT
					0x76,	// Newline
				]);
			});
			it('!#basic-start= 0', () => {
				const conv = new Zx81BasToPfile("#! basic-start = 10 \n10 PRINT") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					2, 0,	// Size
					0xF5,	// PLOT
					0x76,	// Newline
				]);
				assert.equal(conv.nextLineOffset, 0);
			});
			it('!#basic-start=20', () => {
				const conv = new Zx81BasToPfile("#! basic-start=20 \n10 PRINT\n20 PRINT") as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					2, 0,	// Size
					0xF5,	// PLOT
					0x76,	// Newline

					0, 20,	// Line number
					2, 0,	// Size
					0xF5,	// PLOT
					0x76,	// Newline
				]);
				assert.equal(conv.nextLineOffset, 6);
			});
			it('!#basic-start=211', () => {
				const conv = new Zx81BasToPfile("#!#basic-start=11\n10 PRINT") as any;
				assert.throws(() => {
					conv.encodeBasic();
				});
			});
		});

		describe('bracketized', () => {
			it('[IF][INKEY$]=""[THEN][GOTO]120', () => {
				const conv = new Zx81BasToPfile('120 [IF][INKEY$]=""[THEN][GOTO]120') as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf.slice(0, 4 + 17 - 7), [
					0, 120,	// Line number
					17, 0,	// Size
					0xFA,	// [IF]
					0x41,	// [INKEY$]
					0x14,	// =
					0x0B,	// \"
					0x0B,	// \"
					0xDE,	// [THEN]
					0xEC,	// [GOTO]
					0x1D,	// 1
					0x1E,	// 2
					0x1C,	// 0
					// Rest (1+5 number + newline) skipped
				]);
			});
		});

		describe('misc', () => {
			it('LOAD\n', () => {
				const conv = new Zx81BasToPfile('20 LOAD\n') as any;
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 20,	// Line number
					2, 0,	// Size
					0xEF,	// LOAD
					0x76	// Newline
				]);
			});

			it('REM [!include file]', () => {
				const conv = new Zx81BasToPfile('10 REM [!include file-1.bin]') as any;
				conv.setReadFileFunction((filename: string) => {
					assert.equal(filename, 'file-1.bin');
					return [1, 2, 3];
				});
				conv.encodeBasic();
				const buf = conv.basicCodeOut;
				assert.deepEqual(buf, [
					0, 10,	// Line number
					5, 0,	// Size
					0xEA,	// REM
					1, 2, 3,	// file.bin
					0x76	// Newline
				]);
			});
		});
	});

	describe('createPfile', () => {
		const sysvarsStart = 0x4009;
		const basicProgram = 0x407D;
		const sysVarsSize = basicProgram - sysvarsStart;

		function getNxtLin(pFile: number[]): number {
			return pFile[32] + pFile[33] * 256;
		}

		it('Empty basic', () => {
			const conv = new Zx81BasToPfile("") as any;
			conv.basicCodeOut = [];
			conv.nextLineOffset = 0;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			const dfileSize = 24 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + conv.basicCodeOut.length + dfileSize + conv.basicVariablesOut.length + 1);
			assert.equal(getNxtLin(pfile), basicProgram);
		});

		it('Empty basic, expanded', () => {
			const conv = new Zx81BasToPfile("") as any;
			conv.nextLineOffset = 0;
			conv.dfileCollapsed = false;
			conv.dfileOut = [[]];
			const dfileSize = 24 * 33 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 0 + dfileSize + conv.basicVariablesOut.length + 1);
			assert.equal(getNxtLin(pfile), basicProgram);
		});

		it('nxtlin', () => {
			const conv = new Zx81BasToPfile("#!basic-start=2\n1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			const dfileSize = 24 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 12 + dfileSize + 0 + 1);
			assert.equal(getNxtLin(pfile), basicProgram + 6);
		});

		it('program stopped', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			const dfileSize = 24 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 12 + dfileSize + 0 + 1);
			assert.equal(getNxtLin(pfile), basicProgram + conv.basicCodeOut.length);
		});

		it('dfile collapsed', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[0, 0, 0], [4, 5]];
			const dfileSize = 5 + 24 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 12 + dfileSize + 0 + 1);
			const dfileP = pfile.slice(pfile.length - dfileSize - 1, pfile.length - 1);
			assert.deepEqual(dfileP, [0x76,
				0, 0, 0, 0x76,
				4, 5, 0x76,
				...Array(22).fill(0x76)
			]);
		});

		it('dfile expanded', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = false;
			conv.dfileOut = [[0, 0, 0], [4, 5]];
			const dfileSize = 24 * 33 + 1;
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 12 + dfileSize + 0 + 1);
			const dfileP = pfile.slice(pfile.length - dfileSize - 1, pfile.length - 1);
			assert.deepEqual(dfileP, [0x76,
				...Array(32).fill(0), 0x76,
				4, 5, ...Array(30).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76,
				...Array(32).fill(0), 0x76
			]);
		});

		it('BASIC variables', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			const dfileSize = 24 + 1;
			conv.basicVariablesOut = [10, 11, 12];
			const pfile = conv.createPfile();
			assert.equal(pfile.length, sysVarsSize + 12 + dfileSize + 3 + 1);
			const varsP = pfile.slice(pfile.length - 4);
			assert.deepEqual(varsP, [
				10, 11, 12,
				0x80
			]);
		});
	});

	describe('createDfile', () => {
		it('empty collapsed', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([], true);
			assert.deepEqual(dfile, Array(24 + 1).fill(0x76));
		});
		it('empty expanded', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([], false);
			const expected = [0x76];
			for (let i = 0; i < 24; i++) {
				expected.push(...Array(32).fill(0), 0x76);
			}
			assert.deepEqual(dfile, expected);
		});
		it('partly collapsed', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([[1, 2], [3]], true);
			assert.deepEqual(dfile,
				[
					0x76,
					1, 2, 0x76,
					3, 0x76,
					...Array(22).fill(0x76)
				]);
		});
		it('partly expanded', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([[1, 2], [3]], false);
			const expected = [0x76,
				1, 2, ...Array(30).fill(0), 0x76,
				3, ...Array(31).fill(0), 0x76,
			];
			for (let i = 0; i < 22; i++) {
				expected.push(...Array(32).fill(0), 0x76);
			}
			assert.deepEqual(dfile, expected);
		});
		it('too big: width', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([[...Array(40).fill(0)]], true);
			const expected = [0x76,
				...Array(32).fill(0), 0x76,
				...Array(23).fill(0x76)
			];
			assert.deepEqual(dfile, expected);
		});
		it('too big: height', () => {
			const basToP = new Zx81BasToPfile("");
			const dfile = basToP.createDfile([...Array(35).fill([])], true);
			const expected = [...Array(24 + 1).fill(0x76)];
			assert.deepEqual(dfile, expected);
		});
	});

	describe('skipSpacesAndCont', () => {
		it('""', () => {
			const conv = new Zx81BasToPfile(" ") as any;
			conv.skipSpacesAndCont();
			assert.equal(conv.position, 1);
			assert.equal(conv.colNr, 1);
			assert.equal(conv.lineNr, 0);
		});
		it('newline', () => {
			const conv = new Zx81BasToPfile(" \t\n") as any;
			conv.skipSpacesAndCont();
			assert.equal(conv.position, 2);
			assert.equal(conv.colNr, 2);
			assert.equal(conv.lineNr, 0);
			assert.equal(conv.eos(), false);
		});
		it('\\', () => {
			const conv = new Zx81BasToPfile("  \\") as any;
			conv.skipSpacesAndCont();
			assert.equal(conv.position, 4);
			assert.equal(conv.colNr, 0);
			assert.equal(conv.lineNr, 1);
			assert.equal(conv.eos(), true);
		});
		it('\\, next line', () => {
			const conv = new Zx81BasToPfile("  \\\n a") as any;
			conv.skipSpacesAndCont();
			assert.equal(conv.position, 4);
			assert.equal(conv.colNr, 0);
			assert.equal(conv.lineNr, 1);
			assert.equal(conv.eos(), false);
		});
		it('\\text', () => {
			const conv = new Zx81BasToPfile(" \\text") as any;
			conv.skipSpacesAndCont();
			assert.equal(conv.position, 1);
			assert.equal(conv.colNr, 1);
			assert.equal(conv.lineNr, 0);
			assert.equal(conv.eos(), false);
		});
	});

	describe('skipSpacesEtc', () => {
		it('newline', () => {
			const conv = new Zx81BasToPfile("\n\n") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 2);
			assert.equal(conv.colNr, 0);
			assert.equal(conv.lineNr, 2);
			assert.equal(conv.eos(), true);
		});
		it('spaces and tab', () => {
			const conv = new Zx81BasToPfile("  \t\t abc\n") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 5);
			assert.equal(conv.colNr, 5);
			assert.equal(conv.lineNr, 0);
			assert.equal(conv.eos(), false);
		});
		it('comment #', () => {
			{
				const conv = new Zx81BasToPfile("# comment \n 100") as any;
				conv.skipSpacesEtc();
				assert.equal(conv.position, 12);
				assert.equal(conv.colNr, 1);
				assert.equal(conv.lineNr, 1);
				assert.equal(conv.eos(), false);
			}
			{
				const conv = new Zx81BasToPfile("  # comment \n 100") as any;
				conv.skipSpacesEtc();
				assert.equal(conv.position, 14);
				assert.equal(conv.colNr, 1);
				assert.equal(conv.lineNr, 1);
				assert.equal(conv.eos(), false);
			}
		});
		it('continuation \\', () => {
			const conv = new Zx81BasToPfile("  \\ \n 100") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 6);
			assert.equal(conv.colNr, 1);
			assert.equal(conv.lineNr, 1);
			assert.equal(conv.eos(), false);
		});
		it('no continuation \\', () => {
			const conv = new Zx81BasToPfile("  \\ a \n 100") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 2);
			assert.equal(conv.colNr, 2);
			assert.equal(conv.lineNr, 0);
			assert.equal(conv.eos(), false);
		});
		it('mixed 1', () => {
			const conv = new Zx81BasToPfile("  \\  \n # comment\n#com2\n\n \\\n  ") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 30);
			assert.equal(conv.colNr, 0);
			assert.equal(conv.lineNr, 6);
			assert.equal(conv.eos(), true);
		});
		it('mixed 2', () => {
			const conv = new Zx81BasToPfile("  \\  \n # comment\n#com2\n\n \\\n  100") as any;
			conv.skipSpacesEtc();
			assert.equal(conv.position, 29);
			assert.equal(conv.colNr, 2);
			assert.equal(conv.lineNr, 5);
			assert.equal(conv.eos(), false);
		});
	});


	describe('checkVariableName', () => {
			it('DIM 1', () => {
				const conv = new Zx81BasToPfile("10 DIM  PRINT(100)") as any;
				conv.position = 7;
				conv.lineNr = 0;
				conv.colNr = 7;
				let warningsCount = 0;
				conv.on('warning', (msg, line, col) => {
					assert.notEqual(msg, undefined);
					assert.equal(line, 0);
					assert.equal(col, 8);
					warningsCount++;
				});
				conv.checkVariableName();
				assert.equal(warningsCount, 1);
			});
			it('DIM 2', () => {
				const conv = new Zx81BasToPfile("10 DIM PRINT (100)") as any;
				conv.position = 7;
				conv.lineNr = 0;
				conv.colNr = 7;
				let warningsCount = 0;
				conv.on('warning', (msg, line, col) => {
					assert.notEqual(msg, undefined);
					assert.equal(line, 0);
					assert.equal(col, 7);
					warningsCount++;
				});
				conv.checkVariableName();
				assert.equal(warningsCount, 1);
			});
			it('LET', () => {
				const conv = new Zx81BasToPfile("10 let poke$") as any;
				conv.position = 7;
				conv.lineNr = 0;
				conv.colNr = 7;
				let warningsCount = 0;
				conv.on('warning', (msg, line, col) => {
					assert.notEqual(msg, undefined);
					assert.equal(line, 0);
					assert.equal(col, 7);
					warningsCount++;
				});
				conv.checkVariableName();
				assert.equal(warningsCount, 1);
			});
		it('not found', () => {
			const conv = new Zx81BasToPfile("10 LET NOPROBLEM=5") as any;
			conv.position = 7;
			conv.lineNr = 0;
			conv.colNr = 7;
			let warningsCount = 0;;
			conv.on('warning', msg => {warningsCount++});
			conv.checkVariableName();
			assert.equal(warningsCount, 0);
		});
	});
});
