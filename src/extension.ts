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
    context.subscriptions.push(vscode.commands.registerCommand('zx81-bastop.convertbastop', async (fileUri: vscode.Uri, outUri: vscode.Uri) => {
        console.log(`zx81-bastop.convertbastop: file=${fileUri}, out=${outUri}`);
        if (!fileUri)
            return;

        // Clear diagnostics
        Diagnostics.clearDiagnostics();

        // Open document
        const basDoc = await vscode.workspace.openTextDocument(fileUri);
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
                Diagnostics.setError(error.message, fileUri, error.line, error.column);
            }
            else {
                // Handle unknown error types
                vscode.window.showErrorMessage('Error: ' + error);
            }
            return;
        }

        // Show save file dialog
        const pFilePath = (outUri) ? outUri.fsPath : fileUri.fsPath + '.p';
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

    // Task provider for zx81-bastop.convertbastop
    context.subscriptions.push(vscode.tasks.registerTaskProvider('zx81-bastop.convertbastop', {
        provideTasks: () => {
            return [];
        },
        resolveTask(task: vscode.Task) {
            //console.log('resolveTask', _task);
            return getZx81BastopTasks(task);;
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
        if (event.affectsConfiguration('zx81-bastop.')) {
            // TODO: REMOVE
            //const newSetting = config.get('myExtension.newSetting');
        }
    }
}


/** Creates a task to convert a BASSIC file to a p-file.
 * Task parameters:
 * file: The *.bas file to convert
 * out: The output file name for the p-file.
 * @returns {vscode.Task[]} An array containing the zx81-bastop conversion task.
 */
function getZx81BastopTasks(): vscode.Task[] {
    const tasks: vscode.Task[] = [];
    const task = new vscode.Task(
        {
            type: 'zx81-bastop.convertbastop',
            file: 'file',
        },
        vscode.TaskScope.Workspace,
        'Convert ZX81 BASIC',
        'zx81-bastop',
        new vscode.CustomExecution(async (resolvedDefinition: vscode.TaskDefinition) => {
            const file = resolvedDefinition.file;
            const out = resolvedDefinition.out;
            return new Promise<vscode.Pseudoterminal>((resolve) => {
                const writeEmitter = new vscode.EventEmitter<string>();
                const closeEmitter = new vscode.EventEmitter<number>();
                resolve({
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: () => {
                        vscode.commands.executeCommand('zx81-bastop.convertbastop', file, out).then(() => {
                            writeEmitter.fire('Conversion complete.\r\n');
                            closeEmitter.fire(0);
                        });
                    },
                    close: () => {}
                });
            });
        })
    );
    tasks.push(task);
    return tasks;
}