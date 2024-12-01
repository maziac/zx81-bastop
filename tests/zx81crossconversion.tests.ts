import * as assert from 'assert';
import {Zx81PfileToBas} from '../src/zx81pfiletobas';
import {Zx81BasToPfile} from '../src/zx81bastopfile';


/** Tests converting zX81 BASIC program and p-file back and forth.
 */
describe('Zx81 Cross Conversion', () => {

	describe('BASIC1 -> p1 -> BASIC2 -> p2: p1==p2?', () => {

		function cmpBasP1WithP2Length0(bas1: string) {
			const conv1 = new Zx81BasToPfile(bas1) as any;
			conv1.encodeBasic();
			const p1 = conv1.basicCodeOut;
			const bas2 = Zx81PfileToBas.getZx81BasicText(new Uint8Array(p1));
			const conv2 = new Zx81BasToPfile(bas2) as any;
			conv2.encodeBasic();
			const p2 = conv2.basicCodeOut
			assert.deepEqual(p1, p2);
			assert.equal(p2.length, 0);
		}

		function cmpBasP1WithP2(bas1: string) {
			console.log(bas1);
			const conv1 = new Zx81BasToPfile(bas1) as any;
			conv1.encodeBasic();
			const p1 = conv1.basicCodeOut;
			const bas2 = Zx81PfileToBas.getZx81BasicText(new Uint8Array(p1));
			const conv2 = new Zx81BasToPfile(bas2) as any;
			conv2.encodeBasic();
			const p2 = conv2.basicCodeOut;
			assert.deepEqual(p1, p2);
			assert.notEqual(p2.length, 0);
		}

		it('empty', () => {
			cmpBasP1WithP2Length0('');
		});
		it('empty (# comments', () => {
			cmpBasP1WithP2Length0('# comment1\n # comment2\n');
		});
		it('1 empty REM', () => {
			cmpBasP1WithP2('10 REM\n');
		});
		it('2 empty REM', () => {
			cmpBasP1WithP2('10 REM\n20 REM\n');
		});
		it('quoted string', () => {
			cmpBasP1WithP2('10 PRINT "HELLO";"WORLD"\n');
		});

		describe('real snippets', () => {
			// Note: when copying from an editor the \ need to be
			// exchanged with \\, so that they are not interpreted as
			// escape characters.

			it('zx81 sample program', () => {
				cmpBasP1WithP2(
					`   1 REM YAE#[RND]7:/[LN]%;[RND]W[RETURN]ZS\\ 'YA$4[NEXT]/[FOR]\\.'4[119]7([UNPLOT]7[TAN]
  10 IF INKEY$<>"S" THEN  GOTO VAL "10"
  20 RAND USR VAL "16514"
`);
			});
			it('zx81 sample program with comments', () => {
				cmpBasP1WithP2(`
# The machine code
   1 REM YAE#[RND]7:/[LN]%;[RND]W[RETURN]ZS\\ 'YA$4[NEXT]/[FOR]\\.'4[119]7([UNPLOT]7[TAN]
# Wait until "S" is pressed
  10 IF INKEY$<>"S" THEN  GOTO VAL "10"
# Start the machine code
  20 RAND USR VAL "16514"
`);
			});

			it('osmo 1', () => {
				cmpBasP1WithP2(`
   8 REM %C%O%P%Y%R%I%G%H%T\\::%B%Y\\::%T%.%B%U%S%S%E
  90 LET L=1
  95 POKE O,1
 100 POKE 16418,0
 110 CLS
 120 PRINT Z$
 121 PRINT AT 11,4;A$
 125 SAVE "EXTENDED OSM%O"
 130 GOTO 8800
1000 PRINT AT 0,0;X$
1030 IF L=25 THEN  LET L=26
1050 PRINT AT 12,L;">"
1100 PRINT AT 15,19;
1110 IF PEEK O/2<>INT (PEEK O/2) THEN  PRINT TAB 15;"%A"
1120 IF PEEK O=2 OR PEEK O=3 OR PEEK O>5 THEN  PRINT TAB 14;"%<%*%>"
1130 IF PEEK O>3 THEN  PRINT TAB 13;"%(\\'.%Y\\.'%)"
1135 FOR N=0 TO 200
1140 NEXT N
1200 RETURN
2500 LET M=2
2510 FOR N=1 TO 8
2515 LET M=M+1
2520 IF M>8 THEN  LET M=1
2525 LET O(N,1)=K(M,1)
2530 LET O(N,2)=K(M,2)
2535 NEXT N
2540 FOR N=1 TO 8
2545 LET K(N,1)=O(N,1)
2550 LET K(N,2)=O(N,2)
2555 NEXT N
`);
			});
			it('osmo 2', () => {
				cmpBasP1WithP2(`
2690 GOSUB 6011
2700 GOSUB 6600
2705 IF K=1 THEN  GOTO 4000
2710 IF K<>0 THEN  GOSUB 9900
2730 LET OB=16902+INT (RND*200)
2740 LET UN=17254+INT (RND*200)
2750 POKE 18827,OB-256*INT (OB/256)
2755 POKE 18828,INT (OB/256)
2760 POKE 18843,UN-256*INT (UN/256)
2765 POKE 18844,INT (UN/256)
2780 LET L=L+1
2790 GOSUB 6011
2800 GOSUB 6028
2805 IF K=1 THEN  GOTO 4000
2810 IF K<>0 THEN  GOSUB 9900
2870 GOSUB 6011
2880 LET L=L+1
2900 GOSUB 6090
2905 IF K=1 THEN  GOTO 4000
2910 IF K<>0 THEN  GOSUB 9900
2950 POKE 20349,5
2980 LET L=L+1
2990 GOSUB 6011
3000 GOSUB 6600
3005 IF K=1 THEN  GOTO 4000
3010 IF K<>0 THEN  GOSUB 9900
3030 IF K<>0 THEN  GOTO 2990
3200 GOSUB 1000
3210 PRINT AT 3,0;B$
3220 PRINT AT 18,0;C$
`);
			});
			it('osmo 3', () => {
				cmpBasP1WithP2(`
4133 IF RND<.5 THEN  PRINT AT M,N;"\\""
4134 IF RND>.5 THEN  PRINT AT 7,N-(M=6)+(M=8);":"
4135 FOR N=0 TO RND*3

6431 FOR N=0 TO 5
6432 PRINT AT 5,8;"\\: \\: \\: \\: \\: \\: \\: \\: \\: \\: ";AT 6,8;"\\..RIGHT ON\\''";AT 7,8;"\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :"
6433 LET RND=RND*RND
6434 PRINT AT 5,8;"\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :\\ :";AT 6,8;"\\''%R%I%G%H%T\\::%O%N\\..";AT 7,8;"\\: \\: \\: \\: \\: \\: \\: \\: \\: \\: "
6435 NEXT N
6436 PRINT AT 10,11;"%B%O%N%U%S\\::";
6437 GOSUB 8000

6463 POKE 18623,INT (SC/256)
6464 GOTO 6470
6465 PRINT AT 10,8;"%S%O%R%R%Y%,\\::%N%O\\::%B%O%N%U%S"
6467 GOSUB 7000
6485 FOR N=0 TO 40
6487 NEXT N

6620 POKE N,K(M,1)
6630 POKE N+1,K(M,2)
6635 LET M=M+1
6640 NEXT N
6650 IF NOT USR 23120 THEN  GOSUB 7000
6700 RETURN
7000 LET K=3
7080 IF PEEK O=4 THEN  LET K=1
7100 POKE O,(6 AND PEEK O=7)+(4 AND (PEEK O=2 OR PEEK O=6))+(2 AND (PEEK O=1 OR PEEK O=3))
8020 POKE 22109,E(N,2)
8100 LET TY=USR 22088

8110 IF E(N,3)=3 THEN  LET RND=RND*RND*RND
8160 NEXT N
8190 RETURN
8800 FOR N=0 TO 100
8810 NEXT N

8900 LET TY=USR 19480+USR 17765+USR 17765
8905 PRINT AT 7,1;"%A%R%E\\::%Y%O%U\\::%R%E%A%D%Y\\::%W%I%T%H\\::%Y%O%U%R\\::%L%I%F%E\\::%?"
8910 FOR N=0 TO 50
8920 NEXT N
8930 PRINT AT 10,10;"%T%H%E%N\\::%G%O\\::%F%O%R";AT 12,9;"%T%H%E\\::%S%P%A%C%E%-%W%A%R"
8940 LET L=1
8945 LET RU=1
`);
			});
			it('osmo 4', () => {
				cmpBasP1WithP2(`
9903 LET TY=USR 19480+USR 17765+USR 17765
9904 FOR N=0 TO 9
9905 NEXT N
9908 POKE 18101,118
9910 POKE 18102,67
9920 FOR P=17462 TO 17270 STEP -32
9922 GOSUB 6013
9925 LET TY=USR 17765
9930 POKE P,128
9931 POKE P+31,128
9932 POKE P+32,128
9933 POKE P+33,128
9934 POKE P+62,128
9936 POKE P+63,128
9937 POKE P+64,128
9938 POKE P+65,128
9939 POKE P+66,128
9940 NEXT P
9945 GOSUB 6011
9950 LET TY=USR 17765
9980 PRINT AT 10,10;"%>%>%R%E%A%D%Y%<%<"
9990 RETURN
`);
			});

		});
	});

	describe('p1 -> BASIC -> p2: p1==p2?', () => {

		function compareP1WithP2(p1: number[]) {
			const bas = Zx81PfileToBas.getZx81BasicText(new Uint8Array(p1));
			console.log(bas);
			const conv = new Zx81BasToPfile(bas) as any;
			conv.encodeBasic();
			const p2 = conv.basicCodeOut;
			assert.deepEqual(p1, p2);
			assert.notEqual(p2.length, 0);
		}

		describe('REM', () => {
			it('all codes, one by one', () => {
				const p1 = [
					0, 1, 	// Line number
					3, 0, 	// Length
					0xEA,	// REM
					0,
					0x76	// Newline
				];
				for (let i = 0; i < 256; i++) {
					p1[5] = i;
					try {
						compareP1WithP2(p1);
					}
					catch (e) {
						console.log(i, e);
						throw Error('Failed at conversion of ' + i + ' (0x' + i.toString(16).padStart(2, '0') + ')');
					}
				}
			});
			it('all codes, alltogether', () => {
				const p1 = [
					0, 1, 	// Line number
					2, 1, 	// Length
					0xEA,	// REM
				];
				for (let i = 0; i < 256; i++)
					p1.push(i);
				p1.push(0x76);	// Newline
				compareP1WithP2(p1);
			});
		});

		describe('quoted string', () => {
			it('all codes, one by one', () => {
				const p1 = [
					0, 1, 	// Line number
					5, 0, 	// Length
					0xF5,	// PRINT
					0x0B,	// "
					0,
					0x0B,	// "
					0x76	// Newline
				];
				for (let i = 0; i < 256; i++) {
					if (i === 0x0B)
						continue;
					p1[6] = i;
					try {
						compareP1WithP2(p1);
					}
					catch (e) {
						console.log(i, e);
						throw Error('Failed at conversion of ' + i + ' (0x' + i.toString(16).padStart(2, '0') + ')');
					}
				}
			});
			it('all codes, alltogether', () => {
				const p1 = [
					0, 1, 	// Line number
					3, 1, 	// Length
					0xF5,	// PRINT
					0x0B,	// "
				];
				for (let i = 0; i < 256; i++) {
					if (i !== 0x0B)
						p1.push(i);
				}
				p1.push(0x0B);	// "
				p1.push(0x76);	// Newline
				compareP1WithP2(p1);
			});
		});

		describe('"normal"', () => {
			it('all codes, one by one', () => {
				const p1 = [
					0, 1, 	// Line number
					3, 0, 	// Length
					0xFF,	// COPY
					0,
					0x76	// Newline
				];
				for (let i = 0; i < 256; i++) {
					if (i === 0x0B || (i >= 0x1C && i <= 0x25) || i === 0x7E)	// Exclude quotes and digits and number
						continue;
					p1[5] = i;
					try {
						compareP1WithP2(p1);
					}
					catch (e) {
						console.log(i, e);
						throw Error('Failed at conversion of ' + i + ' (0x' + i.toString(16).padStart(2, '0') + ')');
					}
				}
			});
			it('all codes, alltogether', () => {
				const p1Contents:number[] = [];
				p1Contents.push(0xFF);	// COPY
				for (let i = 0; i < 256; i++) {
					//for (let i = 0; i < 256; i++) {
					if (i === 0x0B || (i >= 0x1C && i <= 0x25) || i === 0x7E)	// Exclude quotes and digits and number
						continue;
					p1Contents.push(i);

					// Avoid ambiguous characters, e.g. ">", "="
					if(i >= 0x12 && i <= 0x14)
						p1Contents.push(0);	// Add space
					// Also for ambiguous RND and PI
					if (i === 0x40 || i === 0x42)
						p1Contents.push(0);	// Add space
				}
				p1Contents.push(0x76);	// Newline
				// Concatenate
				const p1 = [
					0, 1, 	// Line number
					p1Contents.length, 0, 	// Length
					...p1Contents
				];
				compareP1WithP2(p1);
			});
		});
	});

	describe('float -> zx81-float -> float2 -> zx81-float2', () => {

		function checkValue(value: number) {
			const f1 = value;
			const conv = new Zx81BasToPfile('') as any;
			const f1Buf = conv.getZx81Float(f1);
			const f2 = (Zx81PfileToBas as any).convertBufToZx81Float(f1Buf);
			const tolerance = 1e-10;
			assert.ok(Math.abs(f2 - f1) < tolerance, `Expected ${f1} but got ${f2}`);
		}

		it('0', () => {
			checkValue(0);
		});

		it('1', () => {
			checkValue(1);
		});

		it('0.5', () => {
			checkValue(0.5);
		});

		it('0.05', () => {
			checkValue(0.05);
		});

		it('2E-1', () => {
			checkValue(2E-1);
		});

		it('2E-120', () => {
			checkValue(2E-1);
		});
	});


	describe('getCommentHeader', () => {
		it('BASIC prgm stopped, no vars', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(!txt.includes('#!basic-start'));
			assert.ok(!txt.includes('#!basic-vars:'));
			assert.ok(!txt.includes('#!dfile:'));
		});

		it('BASIC prgm with line', () => {
			const conv = new Zx81BasToPfile("#!basic-start=258\n5 REM\n258 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!basic-start=258'));
		});
		it('BASIC vars, 1 line', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[1,2,255]") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!basic-vars:[1,2,255]'));
		});
		it('BASIC vars, 2 lines', () => {
			const conv = new Zx81BasToPfile("#!basic-vars:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29]") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!basic-vars:[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]'));
			assert.ok(txt.includes('#!basic-vars:[20,21,22,23,24,25,26,27,28,29]'));
		});

		it('BASIC prgm, dfile', () => {
			const conv = new Zx81BasToPfile("1 REM\n2 PRINT") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[], [0, 0, 0], [0, 0x1C, 0], [0, 0, 0x1D]];
			conv.basicVariablesOut = [];
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!dfile:'));
			// Count occurrences of '#!dfile:'
			const dfileCount = (txt.match(/#!dfile:/g) || []).length;
			assert.equal(dfileCount, 4);
			assert.equal(txt, "#!dfile-collapsed\n#!dfile:\n#!dfile:\n#!dfile: 0\n#!dfile:  1\n\n");
		});

		it('sysvars, DF_SZ', () => {
			const conv = new Zx81BasToPfile("1 REM\n") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			conv.systemVariablesOut.setSysVarAtAddr("DF_SZ", 200);
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!system-vars:'));
			assert.ok(txt.includes('#!system-vars:DF_SZ=200'));
		});
		it('sysvars, FRAMES', () => {
			const conv = new Zx81BasToPfile("1 REM\n") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			conv.systemVariablesOut.setSysVarAtAddr("FRAMES", 12345);
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!system-vars:'));
			assert.ok(txt.includes('#!system-vars:FRAMES=12345'));
		});
		it('sysvars, MEMBOT', () => {
			const conv = new Zx81BasToPfile("1 REM\n") as any;
			conv.dfileCollapsed = true;
			conv.dfileOut = [[]];
			conv.basicVariablesOut = [];
			conv.systemVariablesOut.setSysVarAtAddr("MEMBOT", [
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
				11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
				21, 22, 23, 24, 25, 26, 27, 28, 29, 30
			]);
			const pfile = conv.createPfile();
			const txt = (Zx81PfileToBas as any).getCommentHeader(pfile);
			assert.ok(txt.includes('#!system-vars:'));
			assert.ok(txt.includes('#!system-vars:MEMBOT=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]'));
		});
	});
});
