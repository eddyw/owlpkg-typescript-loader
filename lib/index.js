var fs = require('fs');
var getOptions = require('loader-utils').getOptions;
var path = require('path');
var validateOptions = require('schema-utils');
var ts = require('typescript');
var util = require('util');
var async = require('async');
var crypto = require('crypto');
var _a = require('./diagnostics'), getDiagnostics = _a.getDiagnostics, getMessageFromDiagnostic = _a.getMessageFromDiagnostic;
var schema = require('./schema');
var setupCompilerOptions = require('./setupCompilerOptions');
var transpiler = require('./transpiler');
var env = process.env.NODE_ENV || 'development';
var pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), { encoding: 'utf-8' }));
/**
 * @typedef {Object} CacheLoaderOptions
 * @property {string=} cacheIdentifier
 * @property {string=} cacheDirectory
 * @property {Function=} read
 * @property {Function=} write
 * @property {Function=} cacheKey
 */
/**
 * @typedef {Object} LoaderOptions
 * @property {string=} tslint
 * @property {string=} tslintFormatter
 * @property {string=} typescript
 * @property {string=} getCustomTransformers
 * @property {string=} jsconfig
 * @property {string=} tsconfig
 * @property {CacheLoaderOptions=} cache
 */
/**
 * @typedef DiagnosticMessage
 * @property {string} type - All messages are "diagnostic"
 * @property {string} code - Diagnostic or tslint code
 * @property {string|undefined} file - FileName
 * @property {string|undefined} text - source code
 * @property {number} line
 * @property {number} character
 * @property {string} severity - "warning" or "error"
 * @property {string} source - diagnostic or tslint error/warning
 * @property {string} content - message content
 */
/**
 * @typedef {Object} SourceMap
 * @property {number} [version=3] - Source Map version
 * @property {string} file - FileName
 * @property {Array<string>} sources - Array containing the fileName
 * @property {string} sourceRoot
 * @property {string} names
 * @property {number} mappings
 */
/**
 * @typedef FileItem
 * @property {number} version - File Version (Incremented in every change)
 * @property {string} content - Transpiled code
 * @property {boolean} emitted - If the file was transpiled
 * @property {SourceMap} map - SourceMap
 * @property {Array} diagnostics
 */
var inspect = function (obj, depth) {
    if (depth === void 0) { depth = 0; }
    return util.inspect(obj, true, depth, true);
};
/**
 * Format message the Webpack way
 * @param {DiagnosticMessage} message
 * @return {Error} - Error message that can be emitted by the loader
 */
var webpackFormatter = function (message) {
    var err = new Error();
    err.stack = '';
    err.message = (message.file
        ? "(" + message.line + "," + message.character + "): " + message.content
        : message.content);
    return err;
};
/**
 * Generates a formatter function that will use tslint's
 * formatters
 * @param {*} tslintFormatter
 * @return {any}
 */
var generateTsLintFormatter = function (tslintFormatter) {
    /**
     * Format message the Webpack way
     * @param {DiagnosticMessage} message
     * @return {Error} - Error message that can be emitted by the loader
     */
    var newFormatter = function (message) {
        var err = new Error(
        // @ts-ignore
        tslintFormatter.format([
            {
                getFailure: function () { return message.content; },
                getFileName: function () { return message.file + ":" + (message.line + 1) + ":" + (message.character + 1); },
                getRuleName: function () { return message.source; },
                getRawLines: function () { return message.text; },
                getRuleSeverity: function () { return message.severity; },
                getStartPosition: function () { return ({
                    getLineAndCharacter: function () { return ({
                        line: message.line,
                        character: message.character,
                    }); },
                }); },
            },
        ]));
        err.stack = ' ';
        if (err.message.includes('\n', err.message.length - 2)) {
            err.message = err.message.substr(0, err.message.length - 2);
        }
        return err;
    };
    return newFormatter;
};
/**
 * Fixes SourceMap by specifying the correct filename
 * @param {string} file - FileName
 * @param {string} sourceMapText - JSON Stringified sourceMap
 * @return {SourceMap}
 */
var fixSourceMap = function (file, sourceMapText) {
    /**
     * @type {SourceMap}
     */
    var map = JSON.parse(sourceMapText || '{}');
    map.file = file;
    map.sources = [file];
    return map;
};
/**
 * Emits diagnostics as errors/warnings and keeps in cache
 * @param {Object} that - context of "this" (the loader)
 * @param {Array} diagnostics - an array of diagnostics generated by TS
 * @param {Array} [cacheDiagnostics=undefined] - a reference to an array where to cache diagnostic messages
 */
var emitDiagnostics = function (that, diagnostics, cacheDiagnostics) {
    if (Array.isArray(diagnostics)) {
        diagnostics.forEach(function (diagnostic) {
            var message = getMessageFromDiagnostic(typescript, diagnostic);
            var formattedMessage = formatter(message);
            if (message.severity === 'error') {
                that.emitError(formattedMessage);
            }
            else {
                that.emitWarning(formattedMessage);
            }
            if (Array.isArray(cacheDiagnostics)) {
                cacheDiagnostics.push({
                    message: formattedMessage.message,
                    severity: message.severity,
                });
            }
        });
    }
};
/**
 * Transpile source code to the target specified in CompilerOptions,
 * if source is not provided, transpiles using TSlanguageService
 * @param {string} file - fileName being transpiled (includes correct file in SourceMaps)
 * @param {string} source - Source Code
 */
var transpile = function (file, source) {
    if (source === void 0) { source = null; }
    listFiles[file].version += 1;
    if (!source) {
        var output = service.getEmitOutput(file, false);
        var map = fixSourceMap(file, output.outputFiles[0].text);
        var content = output.outputFiles[1].text;
        listFiles[file].content = content;
        listFiles[file].map = map;
    }
    else {
        var output = typescript.transpileModule(source, {
            compilerOptions: compilerOptions,
            reportDiagnostics: false,
        });
        listFiles[file].content = output.outputText;
        listFiles[file].map = fixSourceMap(file, output.sourceMapText);
    }
    listFiles[file].emitted = true;
    listFiles[file].diagnostics = getDiagnostics(service, file);
};
/**
 * Removes content from memory and sourceMaps
 * @param {string} file - fileName
 */
var cleanAfterTranspile = function (file) {
    delete listFiles[file].content;
    delete listFiles[file].map;
    listFiles[file].emitted = false;
};
/**
 * Watches file for changes, transpiles on the fly..
 * It allow for fast builds making the transpile code
 * available when the loader is called
 * @param {string} file - fileName
 */
var watchFile = function (file) {
    fs.watchFile(file, {
        persistent: true,
        interval: 10,
    }, function (curr, prev) {
        if (Number(curr.mtime) <= Number(prev.mtime))
            return;
        if (!listFiles[file].emitted) {
            transpile(file);
        }
    });
};
/**
 * Add file to list of files that keep version, content, and
 * diagnostic messages. Adds also to watched files
 * @param {string} file - fileName
 */
var addFileToList = function (file) {
    listFiles[file] = {
        map: null,
        version: 1,
        content: null,
        emitted: null,
        diagnostics: [],
    };
    listFileNames.push(file);
};
var cacheKey = function (request, cacheOptions) {
    var _a = options.cache, cacheIdentifier = _a.cacheIdentifier, cacheDirectory = _a.cacheDirectory;
    var hash = digest(cacheIdentifier + "\n" + request);
    return path.join(cacheDirectory, hash + ".json");
};
var read = function (key, callback) {
    fs.readFile(key, 'utf-8', function (err, content) {
        if (err) {
            callback(err);
            return;
        }
        try {
            var data = JSON.parse(content);
            callback(null, data);
        }
        catch (e) {
            callback(e);
        }
    });
};
var digest = function (str) { return (crypto
    .createHash('md5')
    .update(str)
    .digest('hex')); };
var write = function (key, data, callback) {
    var dirname = path.dirname(key);
    var content = JSON.stringify(data);
    var sys = typescript.sys;
    if (!directories.has(dirname)) {
        if (!sys.directoryExists(dirname)) {
            sys.createDirectory(dirname);
            directories.add(dirname);
        }
    }
    fs.writeFile(key, content, { encoding: 'utf-8' }, callback);
};
var getLoaderOptions = function (that) {
    /** @type {LoaderOptions} */
    var defaultOptions = Object.assign({
        getCustomTransformers: function () { return ({}); },
    }, getOptions(that) || {});
    validateOptions(schema, defaultOptions, loaderName);
    var defaultCacheOptions = {
        cacheDirectory: path.resolve('.cache-typescript'),
        cacheIdentifier: "cache-typescript:" + pkg.version + " " + env,
        cacheKey: cacheKey,
        read: read,
        write: write,
    };
    if (defaultOptions.cache) {
        if (typeof defaultOptions.cache === 'object') {
            defaultOptions.cache = Object.assign({}, defaultCacheOptions, defaultOptions.cache);
        }
        else {
            defaultOptions.cache = defaultCacheOptions;
        }
    }
    return defaultOptions;
};
/** @type {LoaderOptions} */
var options;
var initialized = false;
var service = null;
var compilerOptions = null;
var formatter = webpackFormatter;
/** @type {Object<string,FileItem>} */
var listFiles = {};
var listFileNames = [];
var directories = new Set();
var fileCache = new Map();
var typescript = ts;
var loaderName = '@owlpkg/typescript-loader';
function loader(source, sourceMap, meta) {
    var callback = this.async();
    var file = this.resourcePath;
    var data = this.data;
    var dependencies = this.getDependencies().concat(this.loaders.map(function (l) { return l.path; }));
    var contextDependencies = this.getContextDependencies();
    var cacheDiagnostics = [];
    // If the file and result should be cached
    var cache = true;
    if (this.cacheable) {
        // The loader result is cacheable
        this.cacheable(true);
    }
    if (!initialized) {
        initialized = true;
        compilerOptions = setupCompilerOptions(typescript, options, loaderName);
        if (typeof options.tslint !== 'undefined') {
            var tslint = require('tslint');
            var enableTsLintLanguageService = require('./TsLintLangService');
            enableTsLintLanguageService(typescript, options.tslint);
            if (options.tslintFormatter) {
                var TsLintFormatter = tslint.findFormatter(options.tslintFormatter);
                if (TsLintFormatter) {
                    var tslintFormatter = new TsLintFormatter();
                    formatter = generateTsLintFormatter(tslintFormatter);
                }
            }
        }
        var moduleResolutionCache_1 = ts.createModuleResolutionCache(process.cwd(), function (fileName) { return ts.sys.useCaseSensitiveFileNames
            ? fileName
            : fileName.toLowerCase(); });
        var moduleResolutionHost_1 = {
            fileExists: typescript.sys.fileExists,
            readFile: typescript.sys.readFile,
        };
        service = typescript.createLanguageService({
            getScriptFileNames: function () { return listFileNames; },
            getCurrentDirectory: function () { return process.cwd(); },
            getCustomTransformers: function () { return ({}); /* TODO! */ },
            getDefaultLibFileName: function () { return typescript.getDefaultLibFilePath(compilerOptions); },
            getCompilationSettings: function () { return compilerOptions; },
            useCaseSensitiveFileNames: function () { return typescript.sys.useCaseSensitiveFileNames; },
            readFile: function (fileName, encoding) {
                if (fileName === file)
                    return source;
                if (fileCache.has(fileName))
                    return fileCache.get(fileName);
                var fileContent = ts.sys.readFile(fileName, encoding);
                fileCache.set(fileName, fileContent);
                return fileContent;
            },
            fileExists: function (fileName) {
                if (file === fileName)
                    return true;
                return typescript.sys.fileExists(fileName);
            },
            getScriptVersion: function (fileName) {
                if (!listFiles[fileName])
                    return undefined;
                return listFiles[fileName].version.toString();
            },
            getScriptSnapshot: function (fileName) {
                var fileContent = typescript.sys.readFile(fileName, 'utf-8');
                return fileContent
                    ? typescript.ScriptSnapshot.fromString(fileContent)
                    : undefined;
            },
            resolveModuleNames: function (moduleNames, containingFile) {
                var resolvedModules = [];
                for (var _i = 0, moduleNames_1 = moduleNames; _i < moduleNames_1.length; _i++) {
                    var moduleName = moduleNames_1[_i];
                    var result = typescript.resolveModuleName(moduleName, containingFile, compilerOptions, moduleResolutionHost_1, moduleResolutionCache_1);
                    if (result.resolvedModule) {
                        resolvedModules.push(result.resolvedModule);
                    }
                    else {
                        // TODO: What about paths/alias?
                        resolvedModules.push({
                            resolvedFileName: moduleName,
                            extension: '',
                            isExternalLibraryImport: true,
                            packageId: undefined,
                        });
                    }
                }
                return resolvedModules;
            },
        }, typescript.createDocumentRegistry(typescript.sys.useCaseSensitiveFileNames));
    }
    /**
     * Watch for changes in the file,
     * so it's transpiled on the background and the transpiled
     * file is (hopefully) available before Webpack gets here
     */
    if (!listFiles[file]) {
        addFileToList(file);
        watchFile(file);
        transpile(file, source);
    }
    /**
     * If file was not transpiled by the watcher,
     * then transpile here
     */
    if (!listFiles[file].emitted) {
        transpile(file);
    }
    /**
     * Print diagnostics errors and warnings,
     * keep diagnostics in cache
     */
    emitDiagnostics(this, listFiles[file].diagnostics, cacheDiagnostics);
    if (!options.cache) {
        callback(null, listFiles[file].content, listFiles[file].map);
        cleanAfterTranspile(file);
    }
    else {
        /**
         * Credits to devs of cache-loader
         * https://github.com/webpack-contrib/cache-loader/blob/master/src/index.js#L42
         */
        var toDepDetails_1 = function (dep, mapCallback) {
            fs.stat(dep, function (err, stats) {
                if (err)
                    return mapCallback(err);
                var mtime = stats.mtime.getTime();
                if (mtime / 1000 >= Math.floor(data.startTime / 1000)) {
                    cache = false;
                }
                mapCallback(null, {
                    path: dep,
                    mtime: mtime,
                });
            });
        };
        async.parallel([
            function (cb) { return async.mapLimit(dependencies, 20, toDepDetails_1, cb); },
            function (cb) { return async.mapLimit(contextDependencies, 20, toDepDetails_1, cb); },
        ], function (err, taskResults) {
            if (err || !cache) {
                callback(null, listFiles[file].content, listFiles[file].map);
                cleanAfterTranspile(file);
                return;
            }
            var deps = taskResults[0], contextDeps = taskResults[1];
            write(data.cacheKey, {
                diagnostics: cacheDiagnostics,
                dependencies: deps,
                remainingRequest: data.remainingRequest,
                contextDependencies: contextDeps,
                result: [
                    listFiles[file].content,
                    listFiles[file].map,
                ],
            }, function () {
                callback(null, listFiles[file].content, listFiles[file].map);
                cleanAfterTranspile(file);
            });
        });
    } // if options.cache
}
function pitch(remainingRequest, precedingRequest, dataInput) {
    var _this = this;
    if (!options) {
        options = getLoaderOptions(this);
    }
    if (options.cache) {
        var data_1 = dataInput;
        var callback_1 = this.async();
        data_1.remainingRequest = remainingRequest;
        data_1.cacheKey = cacheKey(remainingRequest);
        read(data_1.cacheKey, function (err, cacheData) {
            if (err || cacheData.remainingRequest !== remainingRequest)
                return callback_1();
            async.each(cacheData.dependencies.concat(cacheData.contextDependencies), function (dependency, cb) {
                fs.stat(dependency.path, function (statsErr, stats) {
                    if (statsErr)
                        return cb(statsErr);
                    if (stats.mtime.getTime() !== dependency.mtime)
                        return cb(true);
                    cb();
                });
            }, function (asyncErr) {
                if (asyncErr) {
                    data_1.startTime = Date.now();
                    return callback_1();
                }
                cacheData.dependencies.forEach(function (dep) { return _this.addDependency(dep.path); });
                cacheData.contextDependencies.forEach(function (dep) { return _this.addContextDependency(dep.path); });
                if (Array.isArray(cacheData.diagnostics)) {
                    cacheData.diagnostics.forEach(function (diagnostic) {
                        var errDiagnostic = new Error();
                        errDiagnostic.message = diagnostic.message;
                        errDiagnostic.stack = '';
                        if (diagnostic.severity === 'error') {
                            _this.emitError(errDiagnostic);
                        }
                        else {
                            _this.emitWarning(errDiagnostic);
                        }
                    });
                }
                callback_1.apply(void 0, [null].concat(cacheData.result));
            }); // async.each
        }); // read(...)
    } // if options.cache
}
loader.pitch = pitch;
module.exports = loader;
