const path = require("path"),
  InjectDependency = require("./InjectDependency"),
  ManifestParser = require("./ManifestParser"),
  { HotModuleReplacementPlugin } = require("webpack"),
  HtmlWebpackPlugin = require("html-webpack-plugin");

class WebExtensionDevPlugin {
  constructor(opts) {
    this.opts = Object.assign(opts, {
      manifest: "manifest.json"
    });
    this.hot = false;
  }

  apply(compiler) {
    this.manifestParser = new ManifestParser(
      path.resolve(compiler.options.context, this.opts.manifest),
      compiler.options.context,
      this.opts
    );

    const entries = this.manifestParser.getEntries();

    compiler.options.entry = {};

    for (const entry of entries) {
      if (entry.scripts) {
        compiler.options.entry[entry.entry] = entry.scripts;
        if (entry.page) {
          new HtmlWebpackPlugin({
            template: entry.page,
            filename: path.filename(entry.page),
            chunks: [entry.entry]
          }).apply(compiler);
        }
      } else if (entry.page) {
        // copy static html
      }
    }

    Object.assign(
      {},
      ...entries
        .filter(e => e.scripts)
        .map(({ entry, scripts }) => ({ [entry]: scripts }))
    );

    compiler.hooks.compile.tap("WebExtensionDevPlugin", () => {
      this.hot = compiler.options.plugins.some(
        p => p instanceof HotModuleReplacementPlugin
      );
    });

    const maps = new WeakMap();

    compiler.hooks.compilation.tap(
      "WebExtensionDevPlugin",
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyFactories.set(
          InjectDependency,
          new InjectDependency.Factory(compilation)
        );
        compilation.dependencyTemplates.set(
          InjectDependency,
          new InjectDependency.Template()
        );

        let injectMap = maps.get(compilation);
        if (!injectMap) {
          injectMap = new Map();
          maps.set(compilation, injectMap);
        }

        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("WebExtensionDevPlugin", parser => {
            parser.hooks.call
              .for("require.inject")
              .tap("WebExtensionDevPlugin", expr => {
                const chunkName = parser.evaluateExpression(expr.arguments[0]);
                const dep = new InjectDependency(chunkName.string, expr.range);
                parser.state.current.addDependency(dep);
                return true;
              });
          });
        compilation.hooks.additionalAssets.tap("WebExtensionDevPlugin", () => {
          compilation.fileDependencies.add(this.manifestParser.manifestPath);
        });
      }
    );

    compiler.hooks.emit.tap("WebExtensionDevPlugin", compilation => {
      debugger;
    });
  }
}

module.exports = WebExtensionDevPlugin;
