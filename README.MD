# Swaggitor - Swagger extension for Visual Studio

This extension validates YAML or JSON Swagger API definitions.

Current features are:
- Validate YAML and JSON files.
- Files are validated upon saving.
- Shows syntax and indentation errors.
- Handles $refs to external files, when validating

Support for code completion is implemented, but we still lack a list of Swagger keywords containing:
- keywords
- short desciption
- documentation

# Options

you can modify the behaviour of the plugin by changing parameters
- `swaggitor.checkOnChange`
  - type: boolean
  - default: false 

   if set, the checks are processed every time you change your specification file, otherwise the extension will only check if document is saved
  

# Contribute

- `git clone`
- `cd vscode-swaggitor`
- `npm install`
- `code .`
- use the debugger section to `Launch Client`
- in order to debug the language server use Launch Target `Attach to Server`

# TODOs

It is still a little rough around the edges, so feel free to report problems and bugs or contribute ;-). 

- enhance the parsing of swagger-parser errors