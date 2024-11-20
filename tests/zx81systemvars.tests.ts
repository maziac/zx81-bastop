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
		const start = 16393;

		beforeEach(() => {
			sysVars = new Zx81SystemVars();
			sysVars.createDefaults();
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
	});
});
