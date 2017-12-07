var tslintLanguageService = require('tslint-language-service');
module.exports = function (ts, configFile) {
    var orgCreateLanguageService = ts.createLanguageService;
    Reflect.defineProperty(ts, 'createLanguageService', {
        configurable: true,
        enumerable: true,
        set: function (v) {
            orgCreateLanguageService = v;
        },
        get: function () {
            return function createLanguageService(host, documentRegistry) {
                var pluginModule = tslintLanguageService({ typescript: ts });
                return pluginModule.create({
                    config: {
                        name: 'tslint-language-service',
                        configFile: configFile,
                    },
                    project: {
                        projectService: {
                            logger: { info: function () { return null; } },
                        },
                    },
                    languageService: orgCreateLanguageService(host, documentRegistry),
                });
            };
        },
    });
};
