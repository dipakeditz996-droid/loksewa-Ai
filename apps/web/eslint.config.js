import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // react-three-fiber renders three.js objects as custom JSX intrinsics
    // (mesh, boxGeometry, meshStandardMaterial, ...) with props like
    // `position`/`args`/`castShadow` that eslint-plugin-react doesn't know
    // about outside of DOM elements — false positives here, not real bugs.
    files: ["app/home/hero-scene/**/*.tsx"],
    rules: {
      "react/no-unknown-property": "off",
    },
  },
];
