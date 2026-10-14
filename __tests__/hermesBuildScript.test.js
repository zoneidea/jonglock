const {test, expect} = require('@jest/globals');
const {Buffer} = require('buffer');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const script = fs.readFileSync(
  path.join(
    __dirname,
    '../node_modules/react-native/sdks/hermes-engine/utils/replace_hermes_version.js',
  ),
  'utf8',
);

function runHermes({configuration, frameworkExists, previousConfiguration}) {
  const calls = [];
  const writes = [];
  const podsRoot = '/tmp/jonglock system/Pods';
  const cli = {
    option() {
      return this;
    },
    usage() {
      return this;
    },
    argv: {configuration, reactNativeVersion: '0.77.3', podsRoot},
  };
  vm.runInNewContext(script, {
    console: {log() {}},
    require(name) {
      if (name === 'yargs') {
        return cli;
      }
      if (name === 'child_process') {
        return {execFileSync: (...args) => calls.push(args)};
      }
      if (name === 'fs') {
        return {
          existsSync: filename =>
            filename === '.last_build_configuration'
              ? previousConfiguration !== undefined
              : frameworkExists,
          readFileSync: () => Buffer.from(previousConfiguration),
          rmSync() {},
          mkdirSync() {},
          writeFileSync: (...args) => writes.push(args),
        };
      }
      throw new Error(`Unexpected dependency ${name}`);
    },
  });
  return {calls, writes, podsRoot};
}

test.each([undefined, 'Debug'])(
  'restores missing Debug framework even with previous configuration %s',
  previousConfiguration => {
    const {calls, writes, podsRoot} = runHermes({
      configuration: 'Debug',
      frameworkExists: false,
      previousConfiguration,
    });
    expect(calls).toEqual([
      [
        'tar',
        [
          '-xf',
          `${podsRoot}/hermes-engine-artifacts/hermes-ios-0.77.3-debug.tar.gz`,
          '-C',
          'hermes-engine',
        ],
      ],
    ]);
    expect(writes).toEqual([['.last_build_configuration', 'Debug']]);
  },
);

test.each([undefined, 'Debug'])(
  'keeps an existing Debug framework with previous configuration %s',
  previousConfiguration => {
    const {calls, writes} = runHermes({
      configuration: 'Debug',
      frameworkExists: true,
      previousConfiguration,
    });
    expect(calls).toEqual([]);
    expect(writes).toEqual([]);
  },
);

test('switches Debug to Release while preserving a path containing spaces', () => {
  const {calls, writes, podsRoot} = runHermes({
    configuration: 'Release',
    frameworkExists: true,
    previousConfiguration: 'Debug',
  });
  expect(calls[0][1][1]).toBe(
    `${podsRoot}/hermes-engine-artifacts/hermes-ios-0.77.3-release.tar.gz`,
  );
  expect(writes).toEqual([['.last_build_configuration', 'Release']]);
});
