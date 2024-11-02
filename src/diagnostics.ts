import * as vscode from 'vscode';

/** Handles the diagnostics for the ZX81 BASIC Converter.
*/
export class Diagnostics {
	// The diagnostics collection.
	private static readonly diagnosticCollection = vscode.languages.createDiagnosticCollection('ZX81 BASIC Converter');


	/** Set an error.
	 * @param message The error message.
	 * @param uri The uri of the file.
	 * @param line The line number.
	 * @param col The column number.
	 */
	public static setError(message: string, uri: vscode.Uri, line: number, col: number) {
		const range = new vscode.Range(line, col, line, col);
		const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Error);
		this.diagnosticCollection.set(uri, [diagnostic]);
	}

	/** Set a warning.
	 * @param message The warning message.
	 * @param uri The uri of the file.
	 * @param line The line number.
	 * @param col The column number.
	 */
	public static setWarning(message: string, uri: vscode.Uri, line: number, col: number) {
		const range = new vscode.Range(line, col, line, col);
		const diagnostic = new vscode.Diagnostic(range, message, vscode.DiagnosticSeverity.Warning);
		this.diagnosticCollection.set(uri, [diagnostic]);
	}


	/** Clear all diagnostics. */
	public static clearDiagnostics() {
		this.diagnosticCollection.clear();
	}


	/** Dispose the diagnostics. */
	public static dispose() {
		this.diagnosticCollection.dispose();
	}
}