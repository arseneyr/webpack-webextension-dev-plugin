"use strict";

const NullDependency = require("webpack/lib/dependencies/NullDependency"),
  { SingleEntryPlugin } = require("webpack");

class InjectDependency extends NullDependency {
  constructor(entryName, range) {
    super();
    this.entryName = entryName;
    this.range = range;
  }

  get type() {
    return "require.inject()";
  }

  getResourceIdentifier() {
    return `inject${this.entryName}`;
  }
}

InjectDependency.Template = class InjectDependencyTemplate {
  apply(dependency, source, runtime) {}
};

InjectDependency.Factory = class InjectDependencyFactory {
  constructor(compilation) {
    this.compilation = compilation;
  }
  create({ context, dependencies }, callback) {
    this.compilation.addEntry(
      context,
      SingleEntryPlugin.createDependency(dependencies[0].entryName, `injected`),
      `injected`,
      err => callback(err)
    );
  }
};

module.exports = InjectDependency;
