const tslintLanguageService = require('tslint-language-service')

module.exports = (ts, configFile) => {
  let orgCreateLanguageService = ts.createLanguageService

  Reflect.defineProperty(ts, 'createLanguageService', {
    configurable: true,
    enumerable: true,
    set(v) {
      orgCreateLanguageService = v
    },
    get() {
      return function createLanguageService(host, documentRegistry) {
        const pluginModule = tslintLanguageService({ typescript: ts })

        return pluginModule.create({
          config: {
            name: 'tslint-language-service',
            configFile,
          },
          project: {
            projectService: {
              logger: { info: () => null },
            },
          },
          languageService: orgCreateLanguageService(host, documentRegistry),
        })
      }
    },
  })
}
