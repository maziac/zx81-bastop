import * as assert from 'assert';
import {Zx81SystemVars} from '../src/zx81systemvars';

/** Tests the ZX81 P file converter.
 */
describe('Zx81SystemVars', () => {

	describe('generic', () => {
		it('constructor', () => {
			const sysVars = new Zx81SystemVars();
			sysVars.createDefaults();
			assert.equal(sysVars.getValues().length, 16509 - 16393);
		});
	});


	describe('methods', () => {
		let sysVars: Zx81SystemVars;
		let sysVarsAny;
		const start = 16393;

		beforeEach(() => {
			sysVars = new Zx81SystemVars();
			sysVars.createDefaults();
			sysVarsAny = sysVars as any;
		});

		it('getValues', () => {
			const buf = sysVars.getValues();
			assert.equal(buf.length, 16509 - 16393);
			assert.equal(buf[0], 0);	// VERSN
			assert.equal(buf[47], 0xBC);	// PR_CC
		});

		it('setValuesFromArray', () => {
			assert.throws(() => sysVars.setValuesFromArray(new Uint8Array(0)));
			const len = 16509 - start;
			assert.throws(() => sysVars.setValuesFromArray(new Uint8Array(len + 1)));
			const arr = new Uint8Array(len);
			arr.fill(0x55);
			sysVars.setValuesFromArray(arr);
			const out = sysVars.getValues();
			assert.equal(out.length, len);
			assert.equal(out[0], 0x55);
			assert.equal(out[len-1], 0x55);

		});

		it('setValues', () => {
			sysVars.setValues(0x1234, 0x5678, 0x9A30, 0xDEF0);
			const out = sysVars.getValues();
			assert.equal(out[16396 - start], 0x34);	// D_FILE
			assert.equal(out[16397 - start], 0x12);	// D_FILE
			assert.equal(out[16398 - start], 0x35);	// DF_CC
			assert.equal(out[16399 - start], 0x12);	// DF_CC
			assert.equal(out[16400 - start], 0x78);	// VARS
			assert.equal(out[16401 - start], 0x56);	// VARS
			assert.equal(out[16404 - start], 0x30);	// E_LINE
			assert.equal(out[16405 - start], 0x9A);	// E_LINE
			assert.equal(out[16406 - start], 0x34);	// CH_ADD
			assert.equal(out[16407 - start], 0x9A);	// CH_ADD
			assert.equal(out[16410 - start], 0x35);	// STKBOT
			assert.equal(out[16411 - start], 0x9A);	// STKBOT
			assert.equal(out[16412 - start], 0x35);	// STKEND
			assert.equal(out[16413 - start], 0x9A);	// STKEND
			assert.equal(out[16425 - start], 0xF0);	// NXTLIN
			assert.equal(out[16426 - start], 0xDE);	// NXTLIN
		});


		describe('setSysVarAtAddr', () => {
			it('address number', () => {
				sysVars.setSysVarAtAddr(16396, 0x1234);
				const out = sysVars.getValues();
				assert.equal(out[16396 - start], 0x34);	// D_FILE
				assert.equal(out[16397 - start], 0x12);	// D_FILE
			});
			it('address string', () => {
				sysVars.setSysVarAtAddr("16396", 0x1234);
				const out = sysVars.getValues();
				assert.equal(out[16396 - start], 0x34);	// D_FILE
				assert.equal(out[16397 - start], 0x12);	// D_FILE
			});
			it('address out of range', () => {
				assert.throws(() => sysVars.setSysVarAtAddr(16392, 0));
				assert.throws(() => sysVars.setSysVarAtAddr(16511, 0));
			});
			it('address by name', () => {
				sysVars.setSysVarAtAddr("D_FILE", 0x1234);
				const out = sysVars.getValues();
				assert.equal(out[16396 - start], 0x34);	// D_FILE
				assert.equal(out[16397 - start], 0x12);	// D_FILE
			});
			it('address with unknown name', () => {
				assert.throws(() => sysVars.setSysVarAtAddr("unknown", 0));
			});
			it('word instead of byte', () => {
				assert.throws(() => sysVars.setSysVarAtAddr("VERSN", 256));
			});
			it('size incorrect', () => {
				assert.throws(() => sysVars.setSysVarAtAddr("MEMBOT", [1, 2, 3, 4]));
			});
			it('size correct', () => {
				const input = [
					1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
					11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
					21, 22, 23, 24, 25, 26, 27, 28, 29, 30
				];
				const buf = sysVars.setSysVarAtAddr("MEMBOT", input);
				const out = sysVars.getValues();
				const membot = out.slice(84, 84 + 30);
				assert.deepEqual(membot, input);
			});
		});

		describe('getSysVarAtAddr', () => {
			beforeEach(() => {
				sysVars.setValuesFromArray(new Uint8Array([
					0x00, // 0, VERSN
					0x01, 0x00, // 1, E_PPC
					0x34, 0x12, // 3, D_FILE
					0x00, 0x00, // 5, DF_CC
					0x00, 0x00, // 7, VARS
					0x00, 0x00, // 9, DEST
					0x001, 0x00, // 11, E_LINE
					0x00, 0x00, // 13, CH_ADD
					0x00, 0x00, // 15, X_PTR
					0x002, 0x00, // 17, STKBOT
					0x00, 0x00, // 19, STKEND
					0x00, // 21, BREG
					0x3D, 0x40, // 22, MEM
					0x00, // 24, UNUSED1
					0x02, // 25, DF_SZ
					0x02, 0x00, // 26, S_TOP
					0xBF, 0xFD, // 28, LAST_K
					0x0F, // 30, DEBOUN
					0x37, // 31, MARGIN
					0x00, 0x00, // 32, NXTLIN (offset 32)
					0x00, 0x00, // 34, OLDPPC
					0x00, // 36, FLAGX
					0x00, 0x00, // 37, STRLEN
					0x8D, 0x0C, // 39, T_ADDR
					0x00, 0x00, // 41, SEED
					0xA3, 0xF5, // 43, FRAMES
					0x00, 0x00, // 45, COORDS
					0xBC, // 47, PR_CC
					0x78, 0x56, // 48, S_POSN
					0x40, // 50, CDFLAG
					...Array(32).fill(0), // 51, PRBUFF (32 spaces)
					0x76, // Newline
					...Array(30).fill(0), // 84, MEMBOT (30 zeros)
					0x00, 0x00 // 114, UNUSED2
				]));
			});

			it('address name', () => {
				assert.equal(sysVarsAny.getSysVarAtAddr("D_FILE"), 0x1234);
				assert.equal(sysVarsAny.getSysVarAtAddr("S_POSN"), 0x5678);
				assert.equal(sysVarsAny.getSysVarAtAddr("16396"), 0x1234);
				assert.equal(sysVarsAny.getSysVarAtAddr("16441"), 0x5678);
			});

			it('address number', () => {
				assert.equal(sysVarsAny.getSysVarAtAddr(16396), 0x1234);
				assert.equal(sysVarsAny.getSysVarAtAddr(16441), 0x5678);
			});
		});

		describe('compare', () => {
			beforeEach(() => {
				const arr = new Uint8Array(116);
				arr.fill(0x11)
				sysVars.setValuesFromArray(arr);
			});

			it('skipNames', () => {
				const other = new Uint8Array(116);
				other.fill(0x22);
				const diffs = sysVars.compare(other);
				assert.equal(diffs.get("D_FILE"), undefined);
				assert.equal(diffs.get("DF_CC"), undefined);
				assert.equal(diffs.get("VARS"), undefined);
				assert.equal(diffs.get("E_LINE"), undefined);
				assert.equal(diffs.get("CH_ADD"), undefined);
				assert.equal(diffs.get("STKBOT"), undefined);
				assert.equal(diffs.get("STKEND"), undefined);
				assert.equal(diffs.get("NXTLIN"), undefined);
			});

			it('all diff', () => {
				const other = new Uint8Array(116);
				other.fill(0x22);
				const diffs = sysVars.compare(other);
				assert.deepEqual(diffs.get("S_POSN"), new Uint8Array([0x22, 0x22]));
				assert.equal(diffs.get("16441"), undefined);
				assert.equal(diffs.size, 25);
			});

			it('1 diff', () => {
				const other = new Uint8Array(sysVars.getValues());
				other[25] = 255;	// DF_SZ
				const diffs = sysVars.compare(other);
				assert.deepEqual(diffs.get("DF_SZ"), new Uint8Array([255]));
				assert.equal(diffs.size, 1);
			});
		});
	});
});
