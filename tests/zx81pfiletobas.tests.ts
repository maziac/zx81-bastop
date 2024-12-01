import * as assert from 'assert';
import {Zx81PfileToBas} from '../src/zx81pfiletobas';

/** Tests the ZX81 P file converter.
 */
describe('Zx81PfileToBas', () => {

	describe('generic', () => {
		it('empty', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(new Uint8Array(0));
			assert.equal(txt, '');
		});
		it('1 empty REM', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(Uint8Array.from([
				0, 1, 	// Line number
				2, 0, 	// Length
				0xEA,	// REM
				0x76	// Newline
			]));
			assert.equal(txt, '1 REM \n');
		});
		it('3 empty REM', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(Uint8Array.from([
				0, 10, 	// Line number
				2, 0, 	// Length
				0xEA,	// REM
				0x76,	// Newline

				0, 11, 	// Line number
				2, 0, 	// Length
				0xEA,	// REM
				0x76,	// Newline

				9999 >> 8, 9999 & 0xFF, 	// Line number
				2, 0, 	// Length
				0xEA,	// REM
				0x76	// Newline
			]));
			assert.equal(txt, '10 REM \n11 REM \n9999 REM \n');
		});
		it('REM with 1 trailing space', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(Uint8Array.from([
				0, 1, 	// Line number
				3, 0, 	// Length
				0xEA,	// REM
				0,
				0x76	// Newline
			]));
			assert.equal(txt, '1 REM [0]\n');
		});
		it('REM with 3 trailing space', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(Uint8Array.from([
				0, 1, 	// Line number
				5, 0, 	// Length
				0xEA,	// REM
				0, 0, 0,
				0x76	// Newline
			]));
			assert.equal(txt, '1 REM   [0]\n');
		});
	});

	describe('getLastNumber', () => {
		it('empty string', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(''), '');
		});
		it('0', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber('0'), '0');
		});
		it('0', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber('4 5 0'), '0');
		});
		it('.5', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' .5'), '.5');
		});
		it('0.6', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 0.6'), '0.6');
		});
		it('1E6', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 1E6'), '1E6');
		});
		it('2E+7', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 2E+7'), '2E+7');
		});
		it('2E-7', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 2E-7'), '2E-7');
		});
		it('2EE-7', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 2EE-7'), 'E-7');
		});
		it('-2E-7', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' -2E-7'), '2E-7');
		});
		it('+2E-7', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' +2E-7'), '2E-7');
		});
		it('3E-5-.4E-9', () => {
			assert.equal((Zx81PfileToBas as any).getLastNumber(' 3E-5-.4E-9'), '.4E-9');
		});
	});

	describe('getP81Filename', () => {
		it('1 character string', () => {
			assert.deepEqual(Zx81PfileToBas.getP81Filename(new Uint8Array([0x26 + 0x80, 1, 2, 3, 4])), [1, 'A']);
		});
		it('2 character string', () => {
			assert.deepEqual(Zx81PfileToBas.getP81Filename(new Uint8Array([0x26, 0x27 + 0x80, 1, 2, 3, 4])), [2, 'AB']);
		});
		it('128 character string', () => {
			const len = 128;
			const buf = new Uint8Array(len);
			for (let i = 0; i < len; i++)
				buf[i] = 0x26;
			assert.deepEqual(Zx81PfileToBas.getP81Filename(buf), [128, 'A'.repeat(128)]);

			buf[len - 1] += 0x80;
			assert.deepEqual(Zx81PfileToBas.getP81Filename(buf), [128, 'A'.repeat(128)]);
		});
		it('>128 character string', () => {
			const len = 129;
			const buf = new Uint8Array(len);
			for (let i = 0; i < len; i++)
				buf[i] = 0x26;
			buf[len - 1] += 0x80;
			assert.deepEqual(Zx81PfileToBas.getP81Filename(buf), [128, 'A'.repeat(128)]);
		});
	});

	describe('dfile', () => {
		it('empty', () => {
			const txt = Zx81PfileToBas.getZx81BasicText(new Uint8Array());
			assert.equal(txt, '');
		});
	});

	describe('errors', () => {
		it('not end with 0x76', () => {
			const p1 = [
				0, 1, 	// Line number
				2 + 256, 0, 	// Length
				0xEA,	// REM
			];
			const txt = Zx81PfileToBas.getZx81BasicText(new Uint8Array(p1));
			assert.ok(txt.includes('line did not end with 118'));
		});
	});
});
