'use strict';

import * as path from 'path';

import {
    workspace, Disposable, ExtensionContext, window
} from 'vscode';

import {
    LanguageClient, LanguageClientOptions, ServerOptions, TransportKind
} from 'vscode-languageclient';

/**
 * Activates the extension.
 */
export function activate(context: ExtensionContext) {

    // build path to server module
    let serverModule = context.asAbsolutePath(path.join('server', 'main.js'));

    // server debug options
    let debugOptions = {
        execArgv: [
            "--nolazy",
            "--inspect=6004"
        ]
    };

    // create server options
    let serverOptions: ServerOptions = {
        run: {
            module: serverModule,
            transport: TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions
        }
    }

    // create client options
    let clientOptions: LanguageClientOptions = {
        documentSelector: [
            { scheme: 'file', language: 'yaml' },
            { scheme: 'file', language: 'yml' },
            { scheme: 'file', language: 'json' }
        ],
        synchronize: {
            configurationSection: "swaggitor",
            fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    let languageClient = new LanguageClient('swaggitor', 'Swaggitor Server', serverOptions, clientOptions);

    languageClient.onReady().then(() => {
        // add a request to handle displaying a status bar message after validation
        languageClient.onRequest("validated", (params: any): void => {
            if (params != null) {
                window.setStatusBarMessage(params.message, 2000);
            }
            else {
                window.setStatusBarMessage('Swagger definition is valid!', 2000);
            }
        });
    });

    let disposable: Disposable = languageClient.start();

    context.subscriptions.push(disposable);
}