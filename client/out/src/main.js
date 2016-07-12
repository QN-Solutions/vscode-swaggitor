'use strict';
var path = require('path');
var vscode_1 = require('vscode');
var vscode_languageclient_1 = require('vscode-languageclient');
var YamlJS = require('js-yaml');
/**
 * Checks if a document is actually a swagger document.
 */
function isSwaggerDocument(document) {
    try {
        switch (document.languageId) {
            case "json":
                // try parsing it
                var sourceObject = JSON.parse(document.getText());
                // and if parsing succeeds check for the swagger version key
                if (typeof sourceObject !== 'object' || !sourceObject.swagger)
                    return false;
                else
                    return true;
            case "yaml":
            case "yml":
                // try parsing it
                var sourceObject = YamlJS.safeLoad(document.getText());
                // and if parsing succeeds check for the swagger version key
                if (typeof sourceObject !== 'object' || !sourceObject.swagger)
                    return false;
                else
                    return true;
            default:
                return false;
        }
    }
    catch (exc) {
        // if parsing the document fails try looking for the swagger key
        var sourceText = document.getText().toLowerCase();
        // if the swagger key cannot be found return false. otherwise assume this is a swagger file
        // and just formatting or syntax errors prevent parsing.
        if (sourceText.indexOf("swagger") != -1)
            return true;
        else
            return false;
    }
}
/**
 * Activates the extension.
 */
function activate(context) {
    // build path to server module
    var serverModule = context.asAbsolutePath(path.join('server', 'main.js'));
    // server debug options
    var debugOptions = {
        execArgv: [
            "--nolazy",
            "--debug=6004"
        ]
    };
    // create server options
    var serverOptions = {
        run: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: vscode_languageclient_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // create client options
    var clientOptions = {
        documentSelector: ['yaml', 'yml', 'json'],
        synchronize: {
            configurationSection: "swaggitorServerSettings",
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // check if this is a swagger definition at all
    if (isSwaggerDocument(vscode_1.window.activeTextEditor.document) == false)
        return;
    var languageClient = new vscode_languageclient_1.LanguageClient('Swaggitor', serverOptions, clientOptions);
    // add a request to handle displaying a status bar message after validation
    languageClient.onRequest({ method: "validated" }, function (params) {
        if (params != null) {
            vscode_1.window.setStatusBarMessage(params.message, 2000);
        }
        else {
            vscode_1.window.setStatusBarMessage('Swagger definition is valid!', 2000);
        }
    });
    var disposable = languageClient.start();
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=main.js.map