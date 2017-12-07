module.exports.getDiagnostics = (service, file) => [].concat(
  service.getCompilerOptionsDiagnostics(),
  service.getSyntacticDiagnostics(file),
  service.getSemanticDiagnostics(file),
)

module.exports.getMessageFromDiagnostic = (ts, diagnostic) => ({
  type: 'diagnostic',
  code: diagnostic.code,
  file: diagnostic.file && diagnostic.file.fileName,
  text: (diagnostic.file && diagnostic.file.text) || '',
  line: diagnostic.file && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line,
  character: diagnostic.file && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).character,
  severity: ts.DiagnosticCategory[diagnostic.category].toLowerCase(),
  source: diagnostic.source || 'diagnostic',
  content: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
})
