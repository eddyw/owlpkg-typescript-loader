module.exports = function (ts, file, source, files, fileNames, compilerOptions) {
    if (!files[file]) {
        files[file] = {
            version: Date.now(),
        };
        fileNames.push(file);
    }
    else {
        files[file].version = Date.now();
    }
    var output = ts.transpileModule(source, {
        compilerOptions: compilerOptions,
        reportDiagnostics: false,
    });
    return output;
};
