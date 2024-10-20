import * as vscode from 'vscode';
import * as fs from 'fs';
import {EditorProvider} from './editorprovider';
import {PackageInfo} from './packageinfo';
import {Zx81BasToPfile, Zx81ParseError} from './zx81bastopfile';
import {Diagnostics} from './diagnostics';


export function activate(context: vscode.ExtensionContext) {
    // Init package info
    PackageInfo.init(context);

    // Log the extension dir
    //console.log(context.extension.id + ' folder: ' + context.extensionPath);

    // Register custom readonly editor provider
    const viewProvider = new EditorProvider();
    vscode.window.registerCustomEditorProvider('zx81-bastop.viewer', viewProvider, {webviewOptions: {enableFindWidget: true, retainContextWhenHidden: true}});

    // Command to open a file
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.open', uri => {
        // Open document
        vscode.commands.executeCommand('vscode.openWith', uri, 'zx81-bastop.viewer');
    }));

    // Command to convert a ZX81 BASIC text file into a P-file.
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.convertptobas', async uri => {
        // TODO
    }));

    // Command to convert a ZX81 BASIC text file into a P-file.
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.convertbastop', async uri => {
        // Clear diagnostics
        Diagnostics.clearDiagnostics();

        // Open document
        const basDoc = await vscode.workspace.openTextDocument(uri);
        const basText = basDoc.getText();

        // BASIC parser
        let pfile;
        try {
            const parser = new Zx81BasToPfile(basText);
            // Create pfile
            pfile = parser.createPfile();

         //   pfile = Zx81PfileToBas.createPfile();
        }
        catch (error) {
            // Handle errors
            if (error instanceof Zx81ParseError) {
                // Add error to diagnostics
                Diagnostics.setError(error.message, uri, error.line, error.column);
            }
            else {
                // Handle unknown error types
                vscode.window.showErrorMessage('Error: ' + error);
            }
            return;
        }

        // Show save file dialog
        const pFilePath = uri.fsPath + '.p';
        const options: vscode.SaveDialogOptions = {
            saveLabel: 'Save',
            defaultUri: vscode.Uri.file(pFilePath),
            filters: {'ZX81 P-Files': ['p']}
        };
        const saveUri = await vscode.window.showSaveDialog(options);

        // Save the file
        if (saveUri) {
            fs.writeFileSync(pFilePath, new Uint8Array(pfile), {encoding: null});
            vscode.window.showInformationMessage(`ZX81 P-File saved to ${pFilePath}`);
        }
    }));

    // Check for every change.
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
        configure(context, event);
    }));
}


/**
 * Reads the configuration.
 */
function configure(context: vscode.ExtensionContext, event?: vscode.ConfigurationChangeEvent) {
    if (event) {
        if (event.affectsConfiguration('binary-file-viewer.parserFolders')) {
            // TODO: REMOVE if no config is needed
        }
    }
}
