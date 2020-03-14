const path = require("path"),
  InjectDependency = require("./InjectDependency"),
  { HotModuleReplacementPlugin } = require("webpack");

class WebExtensionDevPlugin {
  constructor(opts) {
    this.opts = Object.assign(opts, {
      manifest: "manifest.json"
    });
    this.hot = false;
  }

  parseManifest(contextPath) {
    const manifestPath = path.resolve(contextPath, this.opts.manifest);
    const manifest = (this.manifest = require(manifestPath));
    const manifestDir = path.dirname(manifestPath);

    this.contentScripts = new Map();
    (manifest.content_scripts || []).forEach((scripts, index) => {
      if (scripts.js && scripts.js.length) {
        this.contentScripts.set(
          this.opts.contentScriptName
            ? this.opts.contentScriptName(scripts)
            : `content-${index}`,
          {
            originalScripts: scripts.js,
            entrypoints: scripts.js.map(script =>
              path.resolve(manifestDir, script)
            )
          }
        );
      }
    });

    this.browserAction =
      manifest.browser_action &&
      manifest.browser_action.default_popup &&
      path.resolve(manifestDir, manifest.browser_action.default_popup);

    if (manifest.background) {
      this.backgroundScripts =
        manifest.background.scripts &&
        manifest.background.scripts.map(script =>
          path.resolve(manifestDir, script)
        );
      this.backgroundPage =
        manifest.background.page &&
        path.resolve(manifestDir, manifest.background.page);
    }

    if (this.opts.backgroundScripts) {
      if (!this.backgroundPage) {
        throw new Error(
          "backgroundScripts specified without a background.page in manifest.json." +
            " Add a background.scripts field to manifest.json instead."
        );
      }
      this.backgroundScripts = this.opts.backgroundScripts.map(script =>
        path.resolve(contextPath, script)
      );
    }
  }

  generateNewManifest(compilation) {}

  apply(compiler) {
    this.parseManifest(path.resolve(compiler.options.context || "."));

    compiler.options.entry = Object.assign(
      {},
      this.backgroundScripts && { background: this.backgroundScripts }
    );

    for (const [entryName, { entrypoints }] of this.contentScripts.entries()) {
      compiler.options.entry[entryName] = entrypoints;
    }

    compiler.hooks.beforeCompile.tap("WebExtensionDevPlugin", () => {
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
      }
    );

    compiler.hooks.emit.tap("WebExtensionDevPlugin", compilation => {
      debugger;
    });
  }
}

module.exports = WebExtensionDevPlugin;
