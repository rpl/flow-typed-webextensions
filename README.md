# flow-typed-webextensions

**flow-typed-webextensions** is a set of flow types definitions generated from the WebExtensions API JSON schema files (retrieved from a [mozilla-central][mozilla-central] clone, and then parsed and converted into flow types using the small nodejs script included in the [flow-typed-webextensions][flow-typed-webextensions-repo] repository).

If you are wondering "why is this interesting?":

- wear your earphones
- play your favorite track
- press play on the following screencast demo:

[![Screenshot of flow based validation and autocompletion on WebExtensions API code][screenshot]][screencast]

- if now you are interested, [star this repository][star-this-repo] and continue to read ;-)

## Installation

You'll need:
* [download install flow](flow-download)
* install and configure flow validation and/or autocompletion enabled in your editor (e.g. Atom, Vim, Emacs etc.)
* enable flow on your project (e.g. create a `.flow-config` file or run `flow init` in the project dir)
* download and copy in your project dir the last generated flow definitions file compatible with the flow version the you are using in your project, e.g.:
  - **flow >= v0.32.0**: https://raw.githubusercontent.com/rpl/flow-typed-webextensions/master/definitions/npm/flow-typed-webextensions_v0.1.0/flow_v0.32.x-/flow-typed-webextensions_v0.1.0.js

The above steps should be enough to provide you the autocompletion based on the flow types definitions,
but you can optionally enforce the flow type checks as well using the following steps:

* enable flow weak checks in one of the sources (using the `// @flow weak` preamble inline comment)
* run `flow check path/to/sources` and fix the flow errors
* turn flow into the "full type checks" mode (removing `weak` from the preamble inline comment)
* run `flow check path/to/sources` and provide additional flow type annotations

If the installation steps are not that simple on your platform/editor
and this README file can be improved to make it simpler, then we should fix it,
and to do so, you should [file a bug report][file-issues] or
[open a pull request][open-a-pull-request].

If something is broken (e.g. the autocompletion or type checks are not working as expected),
well... that is not cool, it is not cool at all!
we should fix it, and to do so, you should [file a bug report ;-)][file-issues]

## Hacking and Contributing

Hey! This tool is under active development. To get involved you can [watch this repository][watch-this-repo], [file issues][file-issues],
fork this repository and create pull requests, or ask a question on dev-addons.

Read the [contributing section][contributing] for how to develop and test new features and fixes.

[mozilla-central]: https://hg.mozilla.org/mozilla-central
[screenshot]: https://raw.githubusercontent.com/rpl/flow-typed-webextensions/master/doc/screenshot.png
[screencast]: https://youtu.be/vmdsDd3D8JM
[flow-typed-webextensions-repo]: https://github/rpl/flow-typed-webextensions
[flow-download]: https://github.com/facebook/flow/releases/latest
[watch-this-repo]: https://github.com/rpl/flow-typed-webextensions/subscription
[star-this-repo]: https://github.com/rpl/flow-typed-webextensions/stargazers
[contributing]: CONTRIBUTING.md
[file-issues]: https://github.com/rpl/flow-typed-webextensions/issues/new
[open-a-pull-request]: https://help.github.com/categories/collaborating-with-issues-and-pull-requests/
