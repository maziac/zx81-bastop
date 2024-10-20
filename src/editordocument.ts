import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {Zx81PfileToBas} from './zx81pfiletobas';
import {Utility} from './utility';



/**
 * This document stores some info, e.g. the parser used.
 */
export class EditorDocument implements vscode.CustomDocument {
	// The associated uri of the binary file.
	public uri: vscode.Uri;

	// Remember the webviewPanel for sending updates.
	public webviewPanel: vscode.WebviewPanel;


	// Keeps the list of open documents. Used in case a parser is updated.
	protected static documentList = new Set<EditorDocument>();


	/**
	 * Returns all EditorDocuments in an array.
	 * @returns Array of active EditorDocuments.
	 */
	public static getDocuments(): EditorDocument[] {
		const arr = Array.from(this.documentList);
		return arr;
	}


	/**
	 * Remove from list.
	 */
	public dispose(): void {
		EditorDocument.documentList.delete(this);
	}


	/**
	 * Initializes the document with the webviewpanel.
	 * Reads the data file and starts parsing.
	 * @param webviewPanel The webview panel passed from vscode.
	 */
	public init(webviewPanel: vscode.WebviewPanel) {
		try {
			// Remember
			EditorDocument.documentList.add(this);
			this.webviewPanel = webviewPanel;

			// Allow js
			webviewPanel.webview.options = {
				enableScripts: true
			};

			// Normal behavior: Parser installed.
			// Handle 'ready' message from the webview
			const filePath = this.uri.fsPath;
			webviewPanel.webview.onDidReceiveMessage(async message => {
				switch (message.command) {
					case 'ready':
						this.parseAndSendToWebview(filePath);
						break;
					case 'customParserError':
						// Not used
						vscode.window.showErrorMessage('Error in decoding P-File: ' + message.message);
						break;
					case 'selectLine':	// Not used
						break;
					case 'openCustomParser':	// Not used
						break;
					case 'reload':
						// Reload/re-parse the file
						this.parseAndSendToWebview(filePath);
						break;
					case 'dbgLog':	// Not used
						break;
					case 'saveas':
						// Save text or image to file
						const data = message.data;
						const ext = message.ext;
						const options: vscode.SaveDialogOptions = {
							saveLabel: 'Save',
							defaultUri: vscode.Uri.file(filePath + '.' + ext)
						};
						if (ext === 'png')
							options.filters = {'Images': [ext]};
						else
							options.filters = {'Text Files': [ext]};
						const uri = await vscode.window.showSaveDialog(options);
						if (uri) {
							if (typeof data === 'string') {
								fs.writeFileSync(uri.fsPath, data, 'utf8');
								const txt = (ext === 'bas') ? 'ZX81 BASIC program' : 'Text';
								vscode.window.showInformationMessage(`${txt} saved to ${uri.fsPath}`);
							}
							else {
								const buffer = Buffer.from(data);
								fs.writeFileSync(uri.fsPath, buffer);
								vscode.window.showInformationMessage(`Image saved to ${uri.fsPath}`);
							}
						}
						break;
					case 'copyBasic':
						{
							// Read file
							const [data, offset] = this.getPfileData(filePath);
							// Get BASIC text
							const basicText = this.getCommentHeaderAndBasicText(data.slice(offset));
							// Copy BASIC text to clipboard
							vscode.env.clipboard.writeText(basicText);
							vscode.window.showInformationMessage('ZX81 BASIC text copied to clipboard.');
							break;
						}
					case 'saveBasicAs':
						{
							// Read file
							const [data, offset] = this.getPfileData(filePath);
							// Get BASIC text
							const basicText = this.getCommentHeaderAndBasicText(data.slice(offset));
							// Save BASIC text to a file
							const saveOptions: vscode.SaveDialogOptions = {
								saveLabel: 'Save BASIC As',
								defaultUri: vscode.Uri.file(filePath + '.bas'),
								filters: {'Text Files': ['bas']}
							};
							const saveUri = await vscode.window.showSaveDialog(saveOptions);
							if (saveUri) {
								fs.writeFileSync(saveUri.fsPath, basicText, 'utf8');
								vscode.window.showInformationMessage(`ZX81 BASIC text saved to ${saveUri.fsPath}`);
							}
							break;
						}
				}
			});

			// Set the html
			const html = this.getMainHtml();
			this.webviewPanel.webview.html = html;
		}
		catch (e) {
			console.error('Error: ', e);
		}
	}


	/**
	 * Reads the file and sends the data to the webview.
	 * @param data The file data to decode
	 * @param zx81FilenameLength The length of the ZX81
	 * filename. 0 if not a p81 file.
	 * @param zx81Filename The ZX81 filename. undefined if not
	 * a p81 file.
	 * @param basicTxt The BASIC text.
	 */
	protected sendDataToWebView(data: Uint8Array, zx81FilenameLength: number, zx81Filename: string | undefined, basicTxt: string) {
		// Send file data to webview
		const message = {
			command: 'setData',
			data,
			zx81FilenameLength,
			zx81Filename,
			basicTxt
		};
		this.webviewPanel.webview.postMessage(message);
	}


	/**
	 * Reads the file and sends the data to the webview.
	 */
	protected sendParserToWebView() {
		// Send the parser to the webview
		const message = {
			command: 'setParser',
			binFilePath: this.uri.fsPath
		};
		this.webviewPanel.webview.postMessage(message);
	}


	/** Parses the BASIC text. Sends the text and the rest of the data
	 * to the webview for display and parsing.
	 * @param filePath The path to the file to parse.
	 */
	protected parseAndSendToWebview(filePath: string) {
		// Read file
		const [data, offset, zx81Filename] = this.getPfileData(filePath);
		// Get BASIC text
		const basicTxt = this.getBasicText(data.slice(offset));
		// Send data to webview
		this.sendDataToWebView(data, offset, zx81Filename, basicTxt);
		// Start parser
		this.sendParserToWebView();
	}


	/** If file is a p81 file it reads the name, returns it and also returns the rest of
	 * data (sliced).
	 * Otherwise the data is directly read from the file and returned.
	 * @returns [data, offset, zx81Filename] The data and it's offset to the filename and the filename.
	 * If no p81 file then zx81Filename is undefined.
	 */
	protected getPfileData(filePath: string): [Uint8Array, number, string | undefined] {
		// Read file
		const dataFs = fs.readFileSync(filePath);
		const data = Uint8Array.from(dataFs);
		// Check file extension
		const ext = path.extname(filePath).toLowerCase();
		if (ext === '.p81') {
			// Read the filename
			const [offset, zx81Filename] = Zx81PfileToBas.getP81Filename(data);
			// Return rest of the data
			return [data, offset, zx81Filename];
		}
		// Return the full data
		return [data, 0, undefined];
	}


	/** Returns the BASIC text from the ZX81 p-file.
	 * @param data The p-file data.
	 * @returns The BASIC text. Can include error text if the
	 * conversion was (partly) unsuccessful.
	 */
	protected getBasicText(data: Uint8Array): string {
		const bracketized = true;
		// Extract the start to end of the BASIC program
		const offsDFile = 0x400C - 0x4009;
		const dfile_ptr = data[offsDFile] + data[offsDFile + 1] * 256;
		const start = 0x407D - 0x4009;
		const end = dfile_ptr - 0x4009;
		const basicCode = data.slice(start, end);
		// Convert to text
		let basicTxt = Zx81PfileToBas.getZx81BasicText(basicCode, bracketized);
		// Some p-files have BASIC lines inside the dfile area.
		// (Often 1k programs to save memory.)
		const offsNXTLIN = 0x4029 - 0x4009;
		const NXTLIN = data[offsNXTLIN] + data[offsNXTLIN + 1] * 256;
		if (NXTLIN > dfile_ptr) {
			// BASIC program outside BASIC area,
			// anyhow, try to parse it.
			const startNXTLIN = NXTLIN - 0x4009;
			const basicOutside = data.slice(startNXTLIN);
			const basicTxtOutside = Zx81PfileToBas.getZx81BasicText(basicOutside, bracketized);
			basicTxt += '\n\n BASIC program outside BASIC area at 0x' + Utility.getHexString(NXTLIN, 4) + ':\n' + basicTxtOutside;
		}
		return basicTxt;
	}


	/** Returns the comment header + BASIC text from the ZX81 p-file.
	 * @param data The p-file data.
	 * @returns The comment header + BASIC text.
	 */
	protected getCommentHeaderAndBasicText(data: Uint8Array): string {
		// Comment header
		let txt = Zx81PfileToBas.getCommentHeader(data);
		// BASIC
		txt += this.getBasicText(data);
		return txt;
	}


	/**
	 * Returns the html code to display the text.
	 */
	protected getMainHtml(): string {
		// Add the html styles etc.
		const extPath = vscode.extensions.getExtension("maziac.zx81-bastop")!.extensionPath;
		const mainHtmlFile = path.join(extPath, 'html', 'main.html');
		let mainHtml = fs.readFileSync(mainHtmlFile).toString();
		// Exchange local path
		const resourcePath = vscode.Uri.file(extPath);
		const vscodeResPath = this.webviewPanel.webview.asWebviewUri(resourcePath).toString();
		mainHtml = mainHtml.replace('${vscodeResPath}', vscodeResPath);

		// Add a Reload and Copy button for debugging
		//mainHtml = mainHtml.replace('<body>', '<body><button onclick="parseStart()">Reload</button><button onclick="copyHtmlToClipboard()">Copy HTML to clipboard</button>');

		return mainHtml;
	}
}
