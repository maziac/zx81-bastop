

/** Represents the ZX81 system variables and provides methods to manipulate and compare them.
 *
 * The ZX81 system variables are stored in a specific memory range and this class allows
 * access to these variables by their names or addresses. It also provides functionality
 * to set and get the values of these variables, create default values, and compare
 * the system variables with another instance.
 *
 * @example
 * ```typescript
 * const zx81Vars = new Zx81SystemVars();
 * zx81Vars.createDefaults();
 * const values = zx81Vars.getValues();
 * zx81Vars.setValues(0x4000, 0x8000, 0x9000, 0xA000);
 * const diff = zx81Vars.compare(otherZx81Vars);
 * ```
 */
export class Zx81SystemVars {

	// Object with all addresses and sizes of the system variables.
	protected sysVarsNames = {
		"VERSN": { address: 16393, size: 1 },
		"E_PPC": { address: 16394, size: 2 },
		"D_FILE": { address: 16396, size: 2 },
		"DF_CC": { address: 16398, size: 2 },
		"VARS": { address: 16400, size: 2 },
		"DEST": { address: 16402, size: 2 },
		"E_LINE": { address: 16404, size: 2 },
		"CH_ADD": { address: 16406, size: 2 },
		"X_PTR": { address: 16408, size: 2 },
		"STKBOT": { address: 16410, size: 2 },
		"STKEND": { address: 16412, size: 2 },
		"BERG": { address: 16414, size: 1 },
		"MEM": { address: 16415, size: 2 },
		"16417": { address: 16417, size: 1 },
		"DF_SZ": { address: 16418, size: 1 },
		"S_TOP": { address: 16419, size: 2 },
		"LAST_K": {address: 16421, size: 2},
		"16423": {address: 16423, size: 1},
		"MARGIN": { address: 16424, size: 1 },
		"NXTLIN": { address: 16425, size: 2 },
		"OLDPPC": { address: 16427, size: 2 },
		"FLAGX": { address: 16429, size: 1 },
		"STRLEN": { address: 16430, size: 2 },
		"T_ADDR": { address: 16432, size: 2 },
		"SEED": { address: 16434, size: 2 },
		"FRAMES": { address: 16436, size: 2 },
		"COORDS": { address: 16438, size: 2 },
		"PR_CC": { address: 16440, size: 1 },
		"S_POSN": { address: 16441, size: 2 },
		"CDFLAG": { address: 16443, size: 1 },
		"PRBUFF": { address: 16444, size: 33 },
		"MEMBOT": { address: 16477, size: 30 },
		"16507": { address: 16507, size: 2 }
	};

	// The system variable values.
	protected sysVarsValues: Uint8Array;

	// A map with the system variable addresses and their names.
	protected sysVarsAddresses: Map<number, string>;


	// Constructor
	constructor() {
		this.sysVarsAddresses = new Map();
		for (const [name, {address}] of Object.entries(this.sysVarsNames)) {
			this.sysVarsAddresses.set(address, name);
		}
		// Add same entries for numbers
		const sysVarNamesArray = Object.keys(this.sysVarsNames);
		for (const name of sysVarNamesArray) {
			const info = this.sysVarsNames[name];
			const addressStr = info.address.toString();
			this.sysVarsNames[addressStr] = info;
		}
	}


	/** Return the array with the values. */
	public getValues(): number[] {
		return Array.from(this.sysVarsValues);
	}


	// Return an object with default system variable values.
	public createDefaults() {
		this.sysVarsValues = new Uint8Array([
			0x00, // VERSN
			0x01, 0x00, // E_PPC
			0x00, 0x00, // D_FILE
			0x00, 0x00, // DF_CC
			0x00, 0x00, // VARS
			0x00, 0x00, // DEST
			0x00, 0x00, // E_LINE
			0x00, 0x00, // CH_ADD
			0x00, 0x00, // X_PTR
			0x00, 0x00, // STKBOT
			0x00, 0x00, // STKEND
			0x00, // BREG
			0x3D, 0x40, // MEM
			0x00, // UNUSED1
			0x02, // DF_SZ
			0x02, 0x00, // S_TOP
			0xBF, 0xFD, // LAST_K
			0x0F, // DEBOUN
			0x37, // MARGIN
			0x00, 0x00, // NXTLIN (offset 32)
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
			...Array(32).fill(0), // PRBUFF (32 spaces)
			0x76, // Newline
			...Array(30).fill(0), // MEMBOT (30 zeros)
			0x00, 0x00 // UNUSED2
		]);
	}


	/** Fill the system variable values with the given array.
	 * @param values The array of values to set.
	 */
	public setValuesFromArray(values: Uint8Array) {
		if (values.length !== 16509-16393)
			throw Error("Invalid system variable values array.");
		this.sysVarsValues = values;
	}


	/** Sets the system variables to the specified values.
	 */
	public setValues(dfilePtr: number, basicVars: number, basicEnd: number, nextLineAddr: number) {
		this.setSysVarAtAddr("D_FILE", dfilePtr);
		this.setSysVarAtAddr("DF_CC", dfilePtr + 1);
		this.setSysVarAtAddr("VARS", basicVars);
		this.setSysVarAtAddr("E_LINE", basicEnd);
		this.setSysVarAtAddr("CH_ADD", basicEnd + 4);
		this.setSysVarAtAddr("STKBOT", basicEnd + 5);
		this.setSysVarAtAddr("STKEND", basicEnd + 5);
		this.setSysVarAtAddr("NXTLIN", nextLineAddr);
	}


	/** Sets a system variable at a specific address.
	 * @param addr The name or address of the system variable
	 * @param value An 8 or 16 bit value or a buffer with many values.
	 * It depends on the system variable size how long the size of the written data is.
	 */
	public setSysVarAtAddr(addr: number | string, value: number | number[]) {
		// Convert to string if number
		if (typeof addr === 'number') {
			const addrName = this.sysVarsAddresses.get(addr);
			if (addrName === undefined)
				throw Error(`Invalid system variable address ${addr}.`);
			addr = addrName as string;
		}
		// Get info for sys variable
		const sysVarInfo = this.sysVarsNames[addr]!;
		const address = sysVarInfo.address;
		const size = sysVarInfo.size;
		let index = address - 16393;
		// Check value type
		if (typeof value === 'number') {
			const highValue = value >> 8;
			value = [value & 0xFF];
			if (size === 1 && highValue !== 0)
				throw Error(`Invalid value for system variable ${addr}: ${value}. Expected a byte but got a word.`);
			if (size > 1)
				value.push(highValue);
		}
		if (value.length !== size)
			throw Error(`Invalid value for system variable ${addr}: ${value}. Expected ${size} bytes but got only ${value.length}.`);
		let minSize = Math.min(value.length, size);
		for (let i = 0; i < minSize; i++) {
			this.sysVarsValues[index++] = value[i];
		}
	}


	/** Returns the system variable value at a given address.
	 * @param addr The address of the system variable.
	 * @returns The value of the system variable.
	 */
	protected getSysVarAtAddr(addr: number | string): number {
		// Convert to string if number
		if (typeof addr === 'number') {
			const addrName = this.sysVarsAddresses.get(addr);
			if (addrName === undefined)
				throw Error(`Invalid system variable address: ${addr}.`);
			addr = addrName as string;
		}
		// Get info for sys variable
		const sysVarinfo = this.sysVarsNames[addr]!;
		const address = sysVarinfo.address;
		const size = sysVarinfo.size;
		const index = address - 16393;
		let word = this.sysVarsValues[index];
		if (size > 1)
			word += 256 * this.sysVarsValues[index + 1];
		return word;
	}


	/** Compares with another system variables object and returns the diff.
	 * @param other The other system variables object to compare with.
	 * @returns A map with the differences: key = name, values = values (of other).
	 */
	public compare(other: Uint8Array): Map<string, Uint8Array> {
		// Values to skip during compare
		const skipNames = ["D_FILE", "DF_CC", "VARS", "E_LINE", "CH_ADD", "STKBOT", "STKEND", "NXTLIN"];

		const diffs: Map<string, Uint8Array> = new Map();
		for (const [name, {address, size}] of Object.entries(this.sysVarsNames)) {
			if (skipNames.includes(name))
				continue;
			const index = address - 16393;
			let equal = true;
			for (let i = index; i < index + size; i++) {
				if (this.sysVarsValues[i] !== other[i]) {
					equal = false;
					break;
				}
			}
			if (!equal) {
				const values = other.slice(index, index + size);
				diffs.set(name, values);
			}
		}
		return diffs;
	}
}
