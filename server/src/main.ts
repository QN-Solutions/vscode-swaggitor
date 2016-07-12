'use strict';

import {
    IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocumentSyncKind, TextDocuments,
    TextDocument, Diagnostic, DiagnosticSeverity, InitializeParams, InitializeResult, TextDocumentPositionParams,
    CompletionItem, CompletionItemKind
} from 'vscode-languageserver';

var SwaggerParser = require('swagger-parser');
var YamlJS = require('js-yaml');

// Type definition for extension settings
interface Settings {
    languageServerSettings: SwaggitorSettings;
}

interface SwaggitorSettings {
    // empty for now
}

// Create IPC connection
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create text document manager and listen for events on the documents in the editor
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

// Root path of the workspaceRoot
let workspaceRoot: string;

/**
 * Initialize the language server.
 */
connection.onInitialize((params): InitializeResult => {
    workspaceRoot = params.rootPath;

    // return server caps
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            completionProvider: {
                resolveProvider: true
            }
        }
    }
});

/**
 * Configuration change event.
 */
connection.onDidChangeConfiguration((change) => {
    // cast the settings to the defined interface type
    let newSettings = <Settings>change.settings;

    // read in the individual configuration settings here
});

/**
 * Checks if a document is actually a swagger document.
 */
function isSwaggerDocument(document: TextDocument) : boolean
{
    try {
        switch (document.languageId) {
            case "json":
                // try parsing it
                var sourceObject = JSON.parse(document.getText());
                // and if parsing succeeds check for the swagger version key
                if(typeof sourceObject !== 'object' || !sourceObject.swagger)
                    return false;
                else
                    return true;
            case "yaml":
            case "yml":
                // try parsing it
                var sourceObject = YamlJS.safeLoad(document.getText());
                // and if parsing succeeds check for the swagger version key
                if(typeof sourceObject !== 'object' || !sourceObject.swagger)
                    return false;
                else
                    return true;
            default:
                return false;
        }
    }
    catch(exc) {
        // if parsing the document fails try looking for the swagger key
        var sourceText = document.getText().toLowerCase();
        
        // if the swagger key cannot be found return false. otherwise assume this is a swagger file
        // and just formatting or syntax errors prevent parsing.
        if(sourceText.indexOf("swagger") != -1)
            return true;
        else
            return false;
    }
}

/**
 * Handle event triggered when the document was saved.
 */
documents.onDidSave((saveObj) => {

    if(isSwaggerDocument(saveObj.document))
    {
        // parse the file on save and send diagnostics about any parser error to the language client.
        SwaggerParser.parse(saveObj.document.uri).then(function(api) {
            // empty the diagnostics information since swagger defintion seems to be correct
            let diagnostics: Diagnostic[] = [];
            connection.sendDiagnostics({
                uri: saveObj.document.uri,
                diagnostics
            });
            // notify the client to display status bar message
            connection.sendRequest({method: "validated"}, null);
        }).catch(function(err) {
            // generate diagnostics information containing error information
            let diagnostics: Diagnostic[] = [];
            var diagnostic = {
                code: 0,
                message: err.message,
                range: {
                    start: {
                        line: 0,
                        character: 1
                    },
                    end: {
                        line: 0,
                        character: 1
                    }
                },
                source: "Swaggitor"
            };
            // if there are error marks provided by the parser use them to mark the error in source
            if(err.mark) {
                diagnostic.range.start = diagnostic.range.end = {
                    line: err.mark.line,
                    character: err.mark.column
                };
            }

            diagnostics.push(diagnostic);
            
            connection.sendDiagnostics({
                uri: saveObj.document.uri,
                diagnostics
            });

            // trigger client to display status bar message
            connection.sendRequest({method: "validated"}, err);
        })
    }
});

/**
 * Provide completion items.
 */
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return swaggerCodeCompleteDefs;
});

/**
 * Resolve provides additional information for code completion.
 */
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
});

// Start listening for events on the connection object
connection.listen();

/**
 * Put all code complete defintions here
 */
var swaggerCodeCompleteDefs = [
    {
        label: "swagger",
        kind: CompletionItemKind.Field,
        detail: "Swagger version",
        documentation: "Required. Specifies the Swagger Specification version being used. It can be used by the Swagger UI and other clients to interpret the API listing. The value MUST be \"2.0\"."
    },
    {
        label: "info",
        kind: CompletionItemKind.Text,
        detail: "Info object",
        documentation: "The object provides metadata about the API. The metadata can be used by the clients if needed, and can be presented in the Swagger-UI for convenience."
    }
];