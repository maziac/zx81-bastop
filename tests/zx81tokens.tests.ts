import * as assert from 'assert';
import {Zx81Tokens} from '../src/zx81tokens';

/** Tests the ZX81 P file converter.
 */
describe('Zx81Tokens', () => {
	describe('convertBasLine', () => {
		it('not ending with NEWLINE', () => {
			assert.equal(Zx81Tokens.convertBasLine(new Uint8Array([255])), '# Note: Line did not end with 118 (END token) but with 255.');
		});
		it('REM', () => {
			assert.equal(Zx81Tokens.convertBasLine(new Uint8Array([0xEA, 0x26, 0x27, 0x28, 0x76])), 'REM ABC');
		});
		it('Quoted string with quotes, PRINT "A\"B\"C"', () => {
			assert.equal(Zx81Tokens.convertBasLine(new Uint8Array([0xF5, 0x0B, 0x26, 0xC0, 0x27, 0xC0, 0x28, 0x0B, 0x76])), `PRINT "A\\\"B\\\"C"`);
		});
	});

	describe('getLastNumber', () => {
		it('empty string', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(''), '');
		});
		it('0', () => {
			assert.equal((Zx81Tokens as any).getLastNumber('0'), '0');
		});
		it('0', () => {
			assert.equal((Zx81Tokens as any).getLastNumber('4 5 0'), '0');
		});
		it('.5', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' .5'), '.5');
		});
		it('0.6', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 0.6'), '0.6');
		});
		it('1E6', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 1E6'), '1E6');
		});
		it('2E+7', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 2E+7'), '2E+7');
		});
		it('2E-7', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 2E-7'), '2E-7');
		});
		it('2EE-7', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 2EE-7'), 'E-7');
		});
		it('-2E-7', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' -2E-7'), '2E-7');
		});
		it('+2E-7', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' +2E-7'), '2E-7');
		});
		it('3E-5-.4E-9', () => {
			assert.equal((Zx81Tokens as any).getLastNumber(' 3E-5-.4E-9'), '.4E-9');
		});
	});
});
