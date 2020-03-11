const path = require("path"),
  { EntryPlugin } = require("webpack"),
  InjectDependency = require('./InjectDependency')

class WebExtensionDevPlugin {
  constructor(opts) {
    this.opts = Object.assign(opts, {
      manifest: "manifest.json"
    });
  }
  processManifest(manifestPath) {
    this.manifest = require(manifestPath);
  }

  apply(compiler) {
    this.processManifest(
      path.resolve(compiler.options.context || ".", this.opts.manifest)
    );

    /*compiler.hooks.normalModuleFactory.tap("reloadPlugin", factory => {
      factory.hooks.parser.for("javascript/auto").tap("ReloadPlugin", parser =>
        parser.hooks.call.for("require.inject").tap("ReloadPlugin", expr => {
          const chunkName = parser.evaluateExpression(expr.arguments[0]);
          debugger;
          new EntryPlugin(
            parser.state.current.context,
            chunkName.string,
            "yo"
          ).apply(compiler);
          return true;
        })
      );
    });*/

    compiler.hooks.compilation.tap(
      "WebExtensionDevPlugin",
      (compilation, { normalModuleFactory }) => {
        compilation.dependencyTemplates.set(
					InjectDependency,
					new InjectDependency.Template()
				);
        normalModuleFactory.hooks.parser
          .for("javascript/auto")
          .tap("WebExtensionDevPlugin", parser => {
            parser.hooks.call
              .for("require.inject")
              .tap("WebExtensionDevPlugin", expr => {
                const chunkName = parser.evaluateExpression(expr.arguments[0]);
                const dep = new InjectDependency(chunkName, expr.range);
                compilation.addEntry(
                  parser.state.current.context,
                  EntryPlugin.createDependency(chunkName.string, "yo"),
                  "yo",
                  (...args) => {
                    debugger;
                  }
                );
                parser.state.current.addDependency(dep);
                return true;
              });
          });
      }
    );
  }
}

module.exports = WebExtensionDevPlugin;
