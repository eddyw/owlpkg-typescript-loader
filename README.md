# Webpack TypeScript Loader

A TypeScript loader for Webpack:

* It has a built-in cache (based on [cache-loader](https://github.com/webpack-contrib/cache-loader)) for incremental builds/rebuilds
* It works with [thread-loader](https://github.com/webpack-contrib/thread-loader) and [HappyPack](https://github.com/amireh/happypack) Webpack Plugin for faster initial builds (Type Checking and cache work in parallel as well)
* [tslint](https://palantir.github.io/tslint/) support with [tslint-language-service](https://github.com/angelozerr/tslint-language-service) (TypeScript Language Service Plugin for tslint)

## Install
```bash
npm install --save-dev @owlpkg/typescript-loader
```
## Install with TSLint Support
```bash
npm install --save-dev @owlpkg/typescript-loader tslint tslint-language-service
```

## Usage (with tsconfig.json)
**webpack.config.js**
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve('src'),
        exclude: /node_modules/,
        use: [
          {
            loader: '@owlpkg/typescript-loader',
            options: {
              tsconfig: './tsconfig.json',
              cache: true
            }
          }
        ]
      }
    ]
  }
}
```

## Usage (with jsconfig.json)
**webpack.config.js**
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        include: path.resolve('src'),
        exclude: /node_modules/,
        use: [
          {
            loader: '@owlpkg/typescript-loader',
            options: {
              jsconfig: './jsconfig.json',
              cache: true
            }
          }
        ]
      }
    ]
  }
}
```

## Usage (with HappyPack and TSLint)
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve('src'),
        exclude: /node_modules/,
        use: [
          {
            loader: 'happypack/loader',
            options: {
              id: 'buildMyApp'
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new HappyPack({
      id: 'buildMyApp',
      verbose: false,
      loaders: [
        {
          loader: '@owlpkg/typescript-loader',
          options: {
            tslint: './tslint.json',
            tsconfig: './tsconfig.json',
            cache: true,
          }
        }
      ]
    })
  ]
}

```

## Loader Options

|Name           |Type       |Default             |Description     |
|:--|:--:|:-----:|:----------|
| **`tsconfig`** | `{string}` | `'./tsconfig.json'` | Path to TSConfig File (It cannot be used together with `jsconfig` option)
| **`jsconfig`** | `{string}` | `undefined` | Path to JSConfig File (It cannot be used together with `tsconfig` option)
| **`tslint`** | `{string}` | `undefined` | Path to `tslint.json` file
| **`tslintFormatter`** | `{string}` | `undefined` | Transform emitted result using a tslint formatted as specified in [tslint/formatters](https://palantir.github.io/tslint/formatters/)
| **`cache`** | `{boolean|Object}` | `false` | Cache the result and diagnostics of the loader to disk. If the `cache` is an object, it accepts the same properties as the [cache-loader options](https://github.com/webpack-contrib/cache-loader/blob/master/README.md#options) do
| **`getCustomTransformers`** | `() => ({ before?: TransformerFactory[], after?: TransformerFactory[] })` | `() => ({})` | Provides custom transformers. For instance, [typescript-plugin-styled-components](https://github.com/Igorbek/typescript-plugin-styled-components)

### Important!
Only the `compilerOptions` in your `tsconfig` or `jsconfig` file are taken into account for compilation. It's important to specify the `exclude` and (optionally) the `include` properties in the loader.

## Contributing
This is a young project and a work in progress (but stable). So, it needs help. Please, feel free to contribute.

## License
MIT License

## Inspiration
*(It's at the end of the README, so you don't have to read it if you don't want to)*

I started to write this loader to improve build time and build time in incremental builds in my own projects. It was inspired in `ts-loader`, `HappyPack` and `cache-loader` mainly. In fact, the internal built-in cache shares (almost) the same code base as `cache-loader`.

The idea, VSCode is able to display diagnostic errors almost immediatly after you open the editor (even in big projects). I figured that if I build the loader as if it were a Code Editor such as VSCode, I should figure out a way to implement Type Checking only for the watched files. Here is a helpful link:
[Using the Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)

Technically, every file that is being transpiled is added to a list of watch-files. So, by watching files we are able to detect changes even before webpack calls the loader and transpile the source in the background and make the transpiled code and diagnostics available when the loader is called. This decreases build time in incremental builds or Webpack Watch Mode.

TSLint runs as a TypeScript Language Service Plugin, so there is no need for a separate loader or run a separate process for it. It works within the TS Compiler (to say in a way) and the errors and warnings are part of the TS diagnostic messages as well.

The cache (based on `cache-loader`), keeps the last result of a transpiled file and its diagnostics, so restarting Webpack loads the previously saved result from the cache. If no files were changed, then build time is really fast. However, if a file was changed, that file is transpiled but the unchanged files are served from cache.
