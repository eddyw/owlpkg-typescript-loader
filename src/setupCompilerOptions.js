const path = require('path')

module.exports = (ts, options, loaderName) => {
  let configFilePath = null
  let tslintFilePath = null
  let compilerOptions = null

  const err = new Error()
  err.stack = ''

  if (!options.tsconfig && !options.jsconfig) {
    options.tsconfig = 'tsconfig.json'
  }

  configFilePath = path.resolve(options.tsconfig || options.jsconfig)
  tslintFilePath = options.tslint && path.resolve(options.tslint)

  if (!ts.sys.fileExists(configFilePath)) {
    const typeofConfigFile = options.tsconfig
      ? 'tsconfig'
      : 'jsconfig'
    err.message = `(${loaderName}) ${typeofConfigFile} file ${configFilePath} couldn't be found`
    throw err
  }
  if (options.tslint && !ts.sys.fileExists(tslintFilePath)) {
    err.message = `(${loaderName}) tslint file ${tslintFilePath} couldn't be found`
    throw err
  }

  try {
    compilerOptions = ts.convertCompilerOptionsFromJson(
      JSON.parse(ts.sys.readFile(configFilePath, 'utf-8')).compilerOptions || {},
    )
  } catch (e) {
    err.message = `(${loaderName}) ${e.message} in ${configFilePath}`
    throw err
  }

  if (options.jsconfig) {
    Object.assign(compilerOptions.options, {
      allowJs: true,
    })
  }

  return Object.assign(compilerOptions.options, {
    sourceMap: true,
    inlineSourceMap: false,
    noEmit: false,
    noEmitOnError: false,
  })
}
