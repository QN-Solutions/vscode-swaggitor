'use strict';

import {
    IPCMessageReader, IPCMessageWriter, createConnection, IConnection, TextDocuments,
    TextDocument, DiagnosticSeverity, Diagnostic, InitializeResult,
    TextDocumentPositionParams, CompletionItem, CompletionItemKind
} from 'vscode-languageserver';

var SwaggerParser = require('swagger-parser');
var YamlJS = require('js-yaml');

// Create IPC connection
let connection: IConnection = createConnection(new IPCMessageReader(process), new IPCMessageWriter(process));

// Create text document manager and listen for events on the documents in the editor
let documents: TextDocuments = new TextDocuments();
documents.listen(connection);

/**
 * Initialize the language server.
 */
connection.onInitialize((_params): InitializeResult => {
    // unused
    // workspaceRoot = params.rootPath;
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

// Type definition for extension settings
interface Settings {
    swaggitor: SwaggitorSettings;
}

interface SwaggitorSettings {
    checkOnChange: boolean;
}

let checkOnChange: boolean;

/**
 * Configuration change event.
 */
connection.onDidChangeConfiguration((change) => {
    // cast the settings to the defined interface type

    let newSettings = <Settings>change.settings;

    // read in the individual configuration settings here
    checkOnChange = newSettings.swaggitor.checkOnChange || false;

    // Revalidate any open text documents
    // documents.all().forEach(validateTextDocument);
});

/**
 * Handle event triggered when the document was saved.
 */
documents.onDidSave((saveObj) => {
    validateTextDocument(saveObj.document);
});

documents.onDidChangeContent((changeObj) => {
    if (checkOnChange) {
        validateTextDocument(changeObj.document);
    }
})


function validateSwaggerSyntax(document: TextDocument): Object {

    let diagnostics: Diagnostic[] = [];

    try {
        var resultObj: Object;

        switch (document.languageId) {
            case "json": {
                // try parsing it
                resultObj = JSON.parse(document.getText());
            }
            case "yaml":
            case "yml": {
                // try parsing it
                resultObj = YamlJS.safeLoad(document.getText());
            }
        }

        if (typeof resultObj == 'object' && resultObj.hasOwnProperty('swagger')) {
            return resultObj;
        }

    } catch (err) {

        // if parsing the document fails try looking for the swagger key
        var sourceText = document.getText().toLowerCase();

        // if the swagger key is present, assume this is a swagger file
        // and formatting or syntax errors prevent parsing.
        if (sourceText.indexOf("swagger") != -1) {
            // generate diagnostics information containing error information

            var diagnostic = {
                severity: DiagnosticSeverity.Warning,
                code: 0,
                message: err.reason,
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
            if (err.mark) {
                diagnostic.range.start = diagnostic.range.end = {
                    line: err.mark.line,
                    character: err.mark.column
                };
            }
        }

        diagnostics.push(diagnostic);
    }

    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });

    // null - no further parsing required. either syntax issues or not a swagger file
    return null;
}

function validateTextDocument(textDocument: TextDocument): void {
    var swaggerObj = validateSwaggerSyntax(textDocument);

    if (!swaggerObj) {
        return;
    }

    SwaggerParser.validate(swaggerObj)
        .then(function (_api: any) {
            // empty the diagnostics information since swagger defintion seems to be correct
            let diagnostics: Diagnostic[] = [];
            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics
            });
            // notify the client to display status bar message
            connection.sendRequest("validated", null);
        })
        .catch(function (err: any) {
            let diagnostics: Diagnostic[] = [];

            /* CLUMSY
             * swagger-parser only delivers first issue
             * and unfortunately no row / column information
             */
            for (let errEntry of err.details) {

                var diagnostic = {
                    severity: DiagnosticSeverity.Warning,
                    code: 0,
                    message: errEntry.message,
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

                diagnostics.push(diagnostic);
            }

            connection.sendDiagnostics({
                uri: textDocument.uri,
                diagnostics
            });

            // trigger client to display status bar message
            connection.sendRequest("validated", err);
        })
}

/**
 * Provide completion items.
 */
connection.onCompletion((_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
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