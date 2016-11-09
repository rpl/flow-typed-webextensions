Hacking on flow-typed-webextensions
===================================

## Prepare your development environment

You'll need:

    Git
    Node.js, 4.0.0 or higher
    npm, 3.0.0 or higher is recommended

Fork this repository,  clone it locally, install all dependencies and run the tests:

```
git clone https://github.com/YOURUSER/flow-typed-webextensions.git
cd flow-typed-webextensions
npm install
npm run flow-typed:install
npm run test
npm run flow-typed:run-tests
```

If `npm` doesn't log any error, you are set!

If it didn't worked, oh! well... that's a pity, you should [file a bug report ;-)][file-issues]

## Testing Suites

There are two parts of this project that have to be tested:

- the nodejs script that generated the flow types definitions from the WebExtensions API JSON schemas files
- the generated flow types definitions

### Testing the generated flow types definitions

The generated flow types definitions have to be tested:

- to ensure that `flow check` raises errors on code that is supposed to be invalid,
  and it passes successfully on code that is supposed to valid
- to ensure that it behaves as expected over a defined range of flow versions

This test suite is based of the same testing strategy used in the [flow-typed][flow-typed] repo,
and it uses the `flow-typed run-tests` cli command and the directory layout that it expects:

```
- definitions
  - npm
    - flow-typed-webextensions_vX.X.X
      - test_webextensions_api.js
      - flow_v0.34.x-
        - flow-typed-webextensions_vX.X.X.js
```

The file named `test_webextensions_api.js` contains the `flow check` assertions:

```js
// @flow

// $ExpectError property `nonexistentNS`. Property not found in object type
chrome.nonexistentNS.unknownMethod();

// $ExpectError property `unknownMethod`. Property not found in object type
chrome.runtime.unknownMethod();

chrome.runtime.sendMessage("test");
chrome.runtime.sendMessage(null, {
  includeTlsChannelId: true
}, (reply) => console.log(reply));

browser.runtime.sendMessage("test")
  .then(reply => console.log(reply));
```

The lines with a `// $ExpectError ...` comment are the assertions on the expected errors,
the lines without it are the assetions on the expected valid syntaxes.

#### How can I contribute to testing the generated flow types definitions

While there is no value in have a test for every single API method, the test suite should be
populated of more use cases (at least all the special cases and one for every kind of recurrent
pattern used over the WebExtensions APIs).

Define new `flow check` assertions is very simple, after setting up your development environment,
you can add additional assertions in the above `test_webextensions_api.js` and run the flow-typed
tests and check that the result is the one that you expect:

```
$ npm run flow-typed:run-tests

> flow-typed-webextensions@0.1.0 flow-typed:run-tests /path-to/flow-typed-webextensions
> flow-typed run-tests

Running definition tests in /path-to/flow-typed-webextensions/definitions/npm...

Fetching all Flow binaries...
  Fetching flow-v0.35.0...
  Fetching flow-v0.34.0...
  Fetching flow-v0.33.0...
  Fetching flow-v0.32.0...
  Fetching flow-v0.31.0...
  ...
Finished fetching Flow binaries.

Testing flow-typed-webextensions_v0.1.0/flow_>=v0.32.x (flow-v0.32.0)...
Testing flow-typed-webextensions_v0.1.0/flow_>=v0.32.x (flow-v0.33.0)...
Testing flow-typed-webextensions_v0.1.0/flow_>=v0.32.x (flow-v0.34.0)...
Testing flow-typed-webextensions_v0.1.0/flow_>=v0.32.x (flow-v0.35.0)...

All tests passed!

```

And then?

Then you should [create a branch and open a pull request ;-)][open-a-pull-request]

### Testing the nodejs script

The nodejs script that generates the flow types definitions have to be tested to ensure that:

- it can read the format of the WebExtensions API JSON schema files
- it can collect, aggregate the WebExtensions APIs definitions from a local mozilla-central clone
  and a list of API schemas directories (by default "toolkit/components/extensions/schemas" and
  "browser/components/extensions/schemas")
- it can list the collected definitions in topological ordered
- it generates a defined set of expected flow types definitions from a defined set of API schema
  definitions
- it generates the aggregated collection of all the flow types definitions (sorted topologically
  to ensure that the referenced types are always defined before being referenced in another flow
  type definition)
- it generates an inline comment preamble which contains `browser/config/version_display.txt` as the
  Firefox version of the related API schema files and a timestamp.

This test suite is based of [ava][avajs], and you can run it in watch mode, so that it automatically
runs the test file that you are working on using:

```
$ npm run ava:watch

> flow-typed-webextensions@0.1.0 ava:watch /path-to/flow-typed-webextensions
> ava --watch --verbose


  ✔ unit › api-schema-loader › apiSchemaLoader.loadFromDirs
  ✔ integrations › mozilla-central-api-schemas › apiSchemaLoader.loadFromDirs and convertToFlowTypes - load real mozilla-central schema files

  2 tests passed [20:10:51]

```

The `test` directory layout is composed of the 3 directories 'fixtures', 'integrations' and 'unit':

```
- test
  - unit
    - test-api-schema-loader.js
  - integrations
    - test-mozilla-central-api-schemas.js
  - fixtures
    - fake-mozilla-central
    - generated-flowtypes-fragments
    - mozilla-central
    - refresh-api-schemas-dump.sh
    - index.js
```

The `test/unit` dir contains tests that cover the modules as units, use fake fixtures from `test/fixtures/fake-mozilla-central` as inputs of the test target and then assert that the expected output has been produced.

The `test/integrations` dir contains tests that cover the overall process of reading, collecting and converting the real API JSON schema files.

In the `test/fixtures` dir, besides a collection of fake JSON schema files used in the `test/unit` tests, there is a dump of the real API JSON schema files from a mozilla-central local clone in `test/fixtures/mozilla-central`, this dump is kept in sync using the shell script `test/fixtures/refresh-api-schemas-dump.sh`.


#### How can I contribute changes to the features and tests of the nodejs script?

## Build the updated flow types definitions

Everytime the WebExtensions API JSON schemas dump has been updated from a local mozilla-central clone (e.g. because an API namespace or a method has been added or changed), the generated flow types definitions have to be refreshed as well.

To update the dump of the API JSON schema files:

```
$ ./test/fixtures/refresh-api-schemas-dump.sh /path-to/mozilla-central test/fixtures/mozilla-central
```

Once the API JSON schema files has been updated, it is better to check that the integration tests still pass successfully:

```
$ npm run test
...
```

If all the tests pass, we can regenerate the flow types definitions from the updated dump:

```
$ npm run flow-typed:build

> flow-typed-webextensions@0.1.0 flow-typed:build /path-to/flow-typed-webextensions
> node bin/flow-typed-webextensions.js -m test/fixtures/mozilla-central -o definitions/npm/flow-typed-webextensions_v0.1.0/flow_v0.32.x-/flow-typed-webextensions_v0.1.0.js

Flow types generated and saved to "definitions/npm/flow-typed-webextensions_v0.1.0/flow_v0.32.x-/flow-typed-webextensions_v0.1.0.js".
```

Using `git diff definitions/` we can evaluate the kind of change that have been made and
test them over the existent flow-typed tests:

```
$ npm run flow-typed:run-tests

> flow-typed-webextensions@0.1.0 flow-typed:run-tests /path-to/flow-typed-webextensions
> flow-typed run-tests

Running definition tests in /path-to/flow-typed-webextensions/definitions/npm...

Fetching all Flow binaries...
....
All tests passed!
```

Then, in a new pull request, create a single commit with the summary

```
chore: updated API schema and generated definitions (Firefox VERSION).
```

## What to do if the updated API Schemas breaks something?

oh! well... that is not cool, it is not cool at all!
we should fix it, and to do so, you should [file a bug report ;-)][file-issues]

But if you are intrigued by the issue, and you want to dig into it a bit more,
you are more than welcome, it would definitely help a lot, the more we know about the
issue, the simpler is to fix it and improve the generated flow definitions.

And so, speaking of what we can do when something is broken:

- reproduce the issue in a test case (e.g. you can experiment a bit on the actual API schema file
  in an integration test, identify which part of it is the source of the problem and finally create
  a new minimal test unit test case to reproduce it)

- if the issue is in the generated flow types, reproduce the issue with a new flow-typed assertion
  as described in the section "Testing the generated flow types definitions"

once a test case is in place, you can run ava in watch mode (`npm run ava:watch`), change the sources as you need, and then change your test to ensure that your new test runs and produces the expected results and verifies the test assertions.

And then?

Then you should [create a branch and open a pull request ;-)][open-a-pull-request]

[avajs]: https://github.com/avajs/ava
[flow-typed]: https://github.com/flowtype/flow-typed
[file-issues]: https://github.com/rpl/flow-typed-webextensions/issues/new
[open-a-pull-request]: https://help.github.com/categories/collaborating-with-issues-and-pull-requests/
