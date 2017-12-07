module.exports = (ts, file, source, files, fileNames, compilerOptions) => {
  if (!files[file]) {
    files[file] = {
      version: Date.now(),
    }
    fileNames.push(file)
  } else {
    files[file].version = Date.now()
  }
  const output = ts.transpileModule(source, {
    compilerOptions,
    reportDiagnostics: false,
  })

  return output
}
