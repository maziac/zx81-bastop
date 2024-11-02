import * as vscode from 'vscode';
import * as fs from 'fs';
import {EditorProvider} from './editorprovider';
import {PackageInfo} from './packageinfo';
import {Zx81BasToPfile, Zx81ParseError} from './zx81bastopfile';
import {Diagnostics} from './diagnostics';
import path = require('path');
import {EditorDocument} from './editordocument';


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

    // Command to convert a p-file into a ZX81 BASIC text file.
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.convertptobas', async uri => {
        try {
            const filePath = uri.fsPath;
            // Read file
            const [data, offset] = EditorDocument.getPfileData(filePath);
            // Get BASIC text
            const basicText = EditorDocument.getCommentHeaderAndBasicText(data.slice(offset), false);
            // Save as
            await EditorDocument.saveBasicAs(basicText, filePath);
        }
        catch (error) {
            vscode.window.showErrorMessage('Error: ' + error);
        }
    }));

    // Command to convert a ZX81 BASIC text file into a P-file.
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.convertbastop', async (fileUri: vscode.Uri, outUri: vscode.Uri | undefined) => {
        console.log(`zx81-bastop.convertbastop: file=${fileUri}, out=${outUri}`);
        if (!fileUri)
            return;

        // Clear diagnostics
        Diagnostics.clearDiagnostics();

        // Open document
        const basDoc = await vscode.workspace.openTextDocument(fileUri);
        const basText = basDoc.getText();
        // Get base folder
        const baseFolder = path.dirname(fileUri.fsPath);

        // BASIC parser
        let pfile;
        try {
            const parser = new Zx81BasToPfile(basText);
            // Set file reader
            parser.setReadFileFunction((filename: string) => {
                const filePath = path.resolve(baseFolder, filename);
                const fileContent = fs.readFileSync(filePath);
                const buf = Array.from(fileContent);
                return buf;
            });
            // Listen for warnings
            parser.on('warning', (message: string, line: number, column: number) => {
                Diagnostics.setWarning(message, fileUri, line, column);
            });
            // Create pfile
            pfile = parser.createPfile();
        }
        catch (error) {
            // Handle errors
            if (error instanceof Zx81ParseError) {
                // Add error to diagnostics
                Diagnostics.setError(error.message, fileUri, error.line, error.column);
            }
            else {
                // Handle unknown error types
                vscode.window.showErrorMessage('Error: ' + error);
            }
            return;
        }

        // Show save file dialog
        if (!outUri) {
            const pFilePath = fileUri.fsPath + '.p';
            const options: vscode.SaveDialogOptions = {
                saveLabel: 'Save',
                defaultUri: vscode.Uri.file(pFilePath),
                filters: {'ZX81 P-Files': ['p']}
            };
            outUri = await vscode.window.showSaveDialog(options);
        }
        // Save the file
        if (outUri) {
            fs.writeFileSync(outUri.fsPath, new Uint8Array(pfile), {encoding: null});
            vscode.window.showInformationMessage(`ZX81 P-File saved to ${outUri.fsPath}`);
        }
    }));

    // Task provider for zx81-bastop.convertbastop
    context.subscriptions.push(vscode.tasks.registerTaskProvider('zx81-bastop.convertbastop', {
        provideTasks: () => {
            return [];
        },
        resolveTask(task: vscode.Task) {
            //console.log('resolveTask', _task);
           return getZx81BastopTask(task);
        }
    }));


    // // Check for every change.
    // context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    //     configure(context, event);
    // }));
}


// /**
//  * Reads the configuration.
//  */
// function configure(context: vscode.ExtensionContext, event?: vscode.ConfigurationChangeEvent) {
//     if (event) {
//         if (event.affectsConfiguration('zx81-bastop.')) {
//             //const newSetting = config.get('myExtension.newSetting');
//         }
//     }
// }


/** Creates a task to convert a BASSIC file to a p-file.
 * Task parameters:
 * file: The *.bas file to convert
 * out: The output file name for the p-file.
 * @returns vscode.Task An array containing the zx81-bastop conversion task.
 */
function getZx81BastopTask(task: vscode.Task): vscode.Task {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? '';
    let fileUri;
    let file = task.definition.file;
    if (file) {
        if (!path.isAbsolute(file))
            file = path.join(workspaceFolder, file);
        fileUri = vscode.Uri.file(file);
    }
    let outUri;
    let out = task.definition.out;
    if (out) {
        if (!path.isAbsolute(out))
            out = path.join(workspaceFolder, out);
        outUri = vscode.Uri.file(out);
    }
    const retTask = new vscode.Task(
        task.definition,
        task.scope ?? vscode.TaskScope.Workspace,
        task.name,
        task.source,
        new vscode.CustomExecution(async (): Promise<vscode.Pseudoterminal> => {
            return new Promise<vscode.Pseudoterminal>((resolve) => {
                const writeEmitter = new vscode.EventEmitter<string>();
                const closeEmitter = new vscode.EventEmitter<number>();
                resolve({
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: async () => {
                        try {
                            await vscode.commands.executeCommand('zx81-bastop.convertbastop', fileUri, outUri);
                            writeEmitter.fire('Conversion complete.\r\n');
                            closeEmitter.fire(0);
                        } catch (error) {
                            writeEmitter.fire(`Conversion failed: ${error.message}\r\n`);
                            closeEmitter.fire(1);
                        }
                    },
                    close: () => {}
                });
            });
        })
    );

    return retTask;
}