"use strict";

const makeSerializable = require("webpack/lib/util/makeSerializable");
const NullDependency = require("webpack/lib/dependencies/NullDependency");

/** @typedef {import("webpack-sources").ReplaceSource} ReplaceSource */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependencyTemplate").DependencyTemplateContext} DependencyTemplateContext */
/** @typedef {import("../dependencies/ImportDependenciesBlock")} ImportDependenciesBlock */

class InjectDependency extends NullDependency {
  constructor(entryName, range) {
    super();
    this.entryName = entryName;
    this.range = range;
  }

  get type() {
    return "require.inject()";
  }
}

InjectDependency.Template = class InjectDependencyTemplate extends NullDependency.Template {
  /**
   * @param {Dependency} dependency the dependency for which the template should be applied
   * @param {ReplaceSource} source the current replace source which can be modified
   * @param {DependencyTemplateContext} templateContext the context object
   * @returns {void}
   */
  apply(
    dependency,
    source,
    { runtimeTemplate, module, moduleGraph, chunkGraph, runtimeRequirements }
  ) {
    debugger;
  }
};

module.exports = InjectDependency;
