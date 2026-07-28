/**
 * Content validator — wired as `prebuild`. Loads every content file through
 * the same loaders the app uses; exits non-zero on any schema violation,
 * missing file, duplicate strategy_number, or malformed :::region block.
 */
import {
  getAllStrategies,
  getObjections,
  getRegions,
  getVerticals,
} from "../src/lib/content";
import { OBJECTIONS, REGIONS, STRATEGY_SLUGS, VERTICALS } from "../src/lib/regions";

try {
  const strategies = getAllStrategies();
  const regions = getRegions();
  const objections = getObjections();
  const verticals = getVerticals();

  const expect = (label: string, got: number, want: number) => {
    if (got !== want) throw new Error(`Expected ${want} ${label}, found ${got}`);
  };
  expect("strategies", strategies.length, STRATEGY_SLUGS.length);
  expect("regions", regions.length, REGIONS.length);
  expect("objections", objections.length, OBJECTIONS.length);
  expect("verticals", verticals.length, VERTICALS.length);

  const callouts = strategies.reduce(
    (n, s) => n + s.segments.filter((seg) => seg.region !== null).length,
    0,
  );

  console.log(
    `Content OK: ${strategies.length} strategies, ${regions.length} regions, ` +
      `${objections.length} objections, ${verticals.length} verticals, ` +
      `${callouts} regional callouts.`,
  );
} catch (err) {
  console.error(`Content validation FAILED: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
