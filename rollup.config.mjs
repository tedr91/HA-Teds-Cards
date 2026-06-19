import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";
import terser from "@rollup/plugin-terser";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("./package.json", "utf-8"));
const dev = process.env.ROLLUP_WATCH === "true";

/** Import `.svg` files as raw string modules (used for the animated weather icons). */
const svgRaw = {
  name: "svg-raw",
  load(id) {
    if (id.endsWith(".svg")) {
      return `export default ${JSON.stringify(readFileSync(id, "utf-8"))};`;
    }
    return null;
  },
};

export default {
  input: "src/ted-cards.ts",
  output: {
    file: "dist/ted-cards.js",
    format: "es",
    sourcemap: dev,
    inlineDynamicImports: true,
    banner:
      "/*! Ted's Cards (https://github.com/tedr91/HA-Teds-Cards) — MIT.\n" +
      " * Clock Weather Card inspired by pkissling/clock-weather-card & samuelgoodell/clock-weather-card-hui-icons (MIT).\n" +
      " * 'Fancy' icons: Meteocons by Bas Milius (https://github.com/basmilius/weather-icons), MIT.\n" +
      " * 'Cool' icons: Home Assistant frontend weather SVGs via samuelgoodell/clock-weather-card-hui-icons (MIT). */",
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    svgRaw,
    typescript({ tsconfig: "./tsconfig.json", sourceMap: dev, inlineSources: dev }),
    json(),
    replace({
      preventAssignment: true,
      values: {
        "__TED_CARDS_VERSION__": JSON.stringify(pkg.version),
      },
    }),
    !dev && terser({ format: { comments: /^!/ } }),
  ].filter(Boolean),
};
