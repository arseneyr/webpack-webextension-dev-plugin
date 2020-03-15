const path = require("path");

function resolve(path, obj) {
  return (
    path &&
    path.split(".").reduce(function(prev, curr) {
      return prev ? prev[curr] : null;
    }, obj)
  );
}

class ManifestParser {
  constructor(manifestPath, contextPath, opts) {
    this._assets = null;
    this._manifestPath = manifestPath;
    this._manifestDir = path.dirname(manifestPath);
    this._contextPath = contextPath;
    this._opts = opts;
  }

  get ASSET_MAP() {
    return [
      {
        entry: "browser_popup",
        optionScriptPath: "browserPopupScripts",
        pagePath: "browser_action.default_popup"
      },
      {
        entry: "page_popup",
        optionScriptPath: "pagePopupScripts",
        pagePath: "page_action.default_popup"
      },
      {
        entry: "background",
        optionScriptPath: "backgroundScripts",
        manifestScriptPath: "background.scripts",
        pagePath: "background.page"
      },
      {
        entry: "option",
        optionScriptPath: "optionScripts",
        pagePath: "options_ui.page"
      },
      m =>
        (m.content_scripts || []).reduce((acc, cur, index) => {
          return cur.js && cur.js.length
            ? acc.concat({
                entry:
                  typeof this._opts.contentScriptName === "function"
                    ? this._opts.contentScriptName(cur)
                    : `content-${index}`,
                manifestScriptPath: `content_scripts.${index}.js`
              })
            : acc;
        }, [])
    ];
  }

  _generateAssets() {
    const manifest = require(this._manifestPath);

    this._assets = this.ASSET_MAP.reduce(
      (acc, asset) =>
        acc.concat(typeof asset == "function" ? asset(manifest) : asset),
      []
    )
      .map(a => ({
        ...a,
        manifestScripts: resolve(a.manifestScriptPath, manifest),
        manifestPage: resolve(a.pagePath, manifest),
        optionScripts: resolve(a.optionScriptPath, this._opts)
      }))
      .filter(a => {
        if (a.optionScripts && !a.manifestPage) {
          throw new Error(
            `${a.optionScriptPath} specified without corresponding ${a.pagePath} in manifest.json`
          );
        }
        return a.manifestScripts || a.manifestPage || a.optionScripts;
      })
      .map(a => ({
        ...a,
        manifestScripts:
          a.manifestScripts &&
          a.manifestScripts.map(s => path.resolve(this._manifestDir, s)),
        manifestPage:
          a.manifestPage && path.resolve(this._manifestDir, a.manifestPage),
        optionScripts:
          a.optionScripts &&
          a.optionScripts.map(s => path.resolve(this._contextPath, s))
      }));
  }

  getEntries() {
    if (!this._assets) {
      this._generateAssets();
    }

    return this._assets.map(a => ({
      entry: a.entry,
      scripts:
        a.manifestScripts || a.optionScripts
          ? (a.manifestScripts || []).concat(a.optionScripts || [])
          : undefined,
      page: a.manifestPage
    }));
  }

  get manifestPath() {
    return this._manifestPath;
  }
}

module.exports = ManifestParser;
