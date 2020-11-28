### v1.6.0 (2020-11-28)

- [Remove require stack from MODULE\_NOT\_FOUND errors.](https://github.com/alexjeffburke/evaldown/commit/7d649d7280a4698720bb8305d758bfad95cc4b5a) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Correctly update the source version of the README.](https://github.com/alexjeffburke/evaldown/commit/64dd382946d94de69f18bba1431821ac9b43e062) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Upgrade unexpected to 12 and bump associated pugins](https://github.com/alexjeffburke/evaldown/commit/c46008652dd526dc3f83d7cfc0a6653dfd8a9120) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Fix output when directly processing a file that errors in check\(\).](https://github.com/alexjeffburke/evaldown/commit/7afa158de45b445dd3635f307905a48617d9efe3) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Rework error architecture and surface require errors as per-snippet.](https://github.com/alexjeffburke/evaldown/commit/9c58ec05e8e3ff6f9f226deb3eba0acb2bf71073) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+5 more](https://github.com/alexjeffburke/evaldown/compare/v1.5.0...v1.6.0)

### v1.5.0 (2020-09-12)

- [Add changelog generation to the version hook.](https://github.com/alexjeffburke/evaldown/commit/0b3ad676221b6cbe34e315f1f4391a66fc46bc78) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Wire in validation of the documentation on CI.](https://github.com/alexjeffburke/evaldown/commit/05936a62b536cf7b5c39b95e84413d3298b3dd8d) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Do a pass over the README after recent additions.](https://github.com/alexjeffburke/evaldown/commit/c9f5eb4419aa661f8599365c118088216b423bb8) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Revisit the interaction of ignored snippets and inplace operation.](https://github.com/alexjeffburke/evaldown/commit/624bd2adf149b1ad72d0a67eda40135fa4abb958) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Generate an unexpected string diff on mismatched output.](https://github.com/alexjeffburke/evaldown/commit/f814bf4f1d02b51432b1aaa4d98a43951511d7c8) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+2 more](https://github.com/alexjeffburke/evaldown/compare/v1.4.1...v1.5.0)

### v1.4.1 (2020-09-03)

- [Relax the restriction on hidden blocks not being allowed to output.](https://github.com/alexjeffburke/evaldown/commit/56439985d72e625555ca4ef2a6debc887765bcea) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Set \_\_dirname for snippets.](https://github.com/alexjeffburke/evaldown/commit/5a09a15d6817e1cb2919017f9dd448c7818ffe9d) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Handle no argument calls to console.log\(\) as an empty string.](https://github.com/alexjeffburke/evaldown/commit/0f5d905a13bbe4729a2015b4e0b94087e3b62542) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Add support for logging messages using format strings.](https://github.com/alexjeffburke/evaldown/commit/ca666bcb05711b02e39e2cccebaecf48c666a3b5) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.4.0 (2020-08-23)

- [Move require option handling into a decoding function and expose.](https://github.com/alexjeffburke/evaldown/commit/6053c804c66d1247580642dff166c9faf4aedc53) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Ensure fileGlobals are run after require.](https://github.com/alexjeffburke/evaldown/commit/a9eab15ac26265aa6f2d7d9c61e9a45798e2f3ac) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Ensure setExpect\(\) call so evaluate:false snippets render coloured.](https://github.com/alexjeffburke/evaldown/commit/96418cce498185c5a0174c00b851e8124c03df33) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Perform source rewriting on the transpiled output.](https://github.com/alexjeffburke/evaldown/commit/d22f7370fad3e59d540df5f627edddb825ce9316) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Allow giving the constructor transpileFn and hand it down in evalOpts.](https://github.com/alexjeffburke/evaldown/commit/f356b135c514ed3e64dba393b1dc0e6bbe3e84c6) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+3 more](https://github.com/alexjeffburke/evaldown/compare/v1.3.1...v1.4.0)

### v1.3.1 (2020-08-22)

- [Fix issue extracting snippets with an empty comment having no flags.](https://github.com/alexjeffburke/evaldown/commit/be31261f25fbc01cc7d10aa6371d63455cb712a5) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Assert that uninterpreted languages are ignored.](https://github.com/alexjeffburke/evaldown/commit/70edc4a0ab8a4f08712ad5e7e7e4295de93322c0) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.3.0 (2020-08-22)

- [Output validation messages that correspond to the comparison made.](https://github.com/alexjeffburke/evaldown/commit/bd0957242585a27dfbd91475b18b42ccd8eb224e) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Rearrange validation loops so the compare function choice is inline.](https://github.com/alexjeffburke/evaldown/commit/4103d386975982e1515e5cfa7a01c8e7d75d5d6f) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Store start time in the stats so overall duration is shown correctly.](https://github.com/alexjeffburke/evaldown/commit/f412b3aca568c3fa886227b7e18965ae802f686b) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Rework to emit a test for each snippet within a file.](https://github.com/alexjeffburke/evaldown/commit/d02d3ab2ad19225309a985d6c1df533934cdd9dc) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Restore pending bits.](https://github.com/alexjeffburke/evaldown/commit/952d0d57feb002e95086fc3369ea53b28f104f75) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+1 more](https://github.com/alexjeffburke/evaldown/compare/v1.2.3...v1.3.0)

### v1.2.3 (2020-08-10)

- [Correct missing character and newline in legacy flag rewriting.](https://github.com/alexjeffburke/evaldown/commit/c9af1ae2ca7a7d297499598d62e119948b4f4a9e) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.2.2 (2020-07-27)

- [Enforce an output width when serialising via expect on unexpected errors.](https://github.com/alexjeffburke/evaldown/commit/1955fb36741de9438b322cabbd2270e1a0dd9cb1) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Avoid quoting string values logged via the console.](https://github.com/alexjeffburke/evaldown/commit/3dc21e1112019d7c2a086d37b3e0ed0b48320add) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Fix issue that causes some cleaned stack traces to contain a trailing \)](https://github.com/alexjeffburke/evaldown/commit/6ec245c1d9fbae42dfdc91354365489ba4df8b5d) ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))

### v1.2.1 (2020-07-25)

- [Correct the event emitted when beginning a test.](https://github.com/alexjeffburke/evaldown/commit/a6cf450eb807d6211f63b7b4d732fb78c908c25a) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Promote mocha to a runtime dependency.](https://github.com/alexjeffburke/evaldown/commit/6654feebf048c77bec151fa4b62d58d5db9151e4) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.2.0 (2020-07-25)

- [Use mocha reporters to output validation mode results to the console.](https://github.com/alexjeffburke/evaldown/commit/79f59aa47d870a9ce430565800d2b03434e2730f) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Account for the cleanStackTrace flag in validation.](https://github.com/alexjeffburke/evaldown/commit/bd4ee2da09b4ceb82db8cb0653cb705ff1f6c783) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Remove unreachable branch.](https://github.com/alexjeffburke/evaldown/commit/1be88dbda68e5e505895e2498433ef210cf1e4dc) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Be consistent with our naming of fs module imports.](https://github.com/alexjeffburke/evaldown/commit/7c52aaf7a5f912673c448fc21dc96cbb727f3766) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Bump mocha to version 8.](https://github.com/alexjeffburke/evaldown/commit/11a68ef1d5eda251179e48cd28eb5a0c127bef41) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+3 more](https://github.com/alexjeffburke/evaldown/compare/v1.1.2...v1.2.0)

### v1.1.2 (2020-07-17)

- [Account for consecutive console capturing snippets with empty output.](https://github.com/alexjeffburke/evaldown/commit/00e7f1fb1fad47e631530e25e62c792478599c11) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.1.1 (2020-07-14)

- [Account for being in the output recording path but having no lines.](https://github.com/alexjeffburke/evaldown/commit/ab40ecbf7c2764421767303a9c7fe4ccb72723f4) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Make the validation semantics behave as in u-markdown.](https://github.com/alexjeffburke/evaldown/commit/714ab46e03eca96e433de18b8c19c22b8e51e589) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.1.0 (2020-07-12)

- [Ensure the validate mode can operate with directories.](https://github.com/alexjeffburke/evaldown/commit/1255f1b1440c762dec64a2bcf4047709b627bec1) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Add --capture option to CLI to allow setting the default capture mode.](https://github.com/alexjeffburke/evaldown/commit/87f6499e97edef3fb98126a5b893bf080c10c133) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Document the --validate option.](https://github.com/alexjeffburke/evaldown/commit/1d3b56a734bd8c7f3de489cdb2b1b9e81fdaa964) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Implement a source file validation mode.](https://github.com/alexjeffburke/evaldown/commit/a6c1c52b38c3ba9583a841a3c6674c1d998b154e) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.0.1 (2020-07-12)

- [Always replace explicitly listed globals during cleanup.](https://github.com/alexjeffburke/evaldown/commit/32209bf03a101baea912b4558f12998cfb396039) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Correctly wrap snippets whose last line has a comment.](https://github.com/alexjeffburke/evaldown/commit/20293ca04582a6ac24b9312923e1efbbface5b60) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Refer only to --inplace in the README.](https://github.com/alexjeffburke/evaldown/commit/835b77542dd5e68b25d7ce37090d7c976ccd8eb5) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v1.0.0 (2020-07-04)

- [Split out createRequire wrapper and cleanup imports.](https://github.com/alexjeffburke/evaldown/commit/82dc05507885619f71776ef6deff85dc1d52b6ca) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Finish replacing var with let\/const as appropriate.](https://github.com/alexjeffburke/evaldown/commit/db34299265766246dad5c1eec7c03869236d1fe5) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Switch to the latest unforked version of marked for HTML output.](https://github.com/alexjeffburke/evaldown/commit/a3e960c02cc05a10f9ac547f7e92dc02dd55ea59) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Rework snippet getTests\(\) method to become lang agnostic.](https://github.com/alexjeffburke/evaldown/commit/378bac7306f80ad639c5cdeb3bbb37349421b833) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Remove freshExpect remnants and make use of that flag an error.](https://github.com/alexjeffburke/evaldown/commit/306563bd25b8dc1f176414fe7a209bdb5136c29b) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+1 more](https://github.com/alexjeffburke/evaldown/compare/v0.7.1...v1.0.0)

### v0.7.1 (2020-06-27)

- [Ensure snippet errors information is available as the error message.](https://github.com/alexjeffburke/evaldown/commit/b47cbfc3a6c58ba3c7275d51761679a41dfe602f) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v0.7.0 (2020-06-27)

- [Also test on node 14.](https://github.com/alexjeffburke/evaldown/commit/4a4d30e3eed40bfc237991c2ed09d8c4c675f2df) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Redo the fix committed in b128d5e.](https://github.com/alexjeffburke/evaldown/commit/aaa99e2b67b998e4be0c5ae398c42933eaeba911) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Remove nowrap and add flag for globals to persist into fresh context.](https://github.com/alexjeffburke/evaldown/commit/2a50cd940be03dace975c53f6d90232e46623d07) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Introduce formal source rewriting.](https://github.com/alexjeffburke/evaldown/commit/d554f9b8919c3f95283031d547953482656a0280) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v0.6.1 (2020-05-31)

- [Clear local expect after execution to ensure HTML is pretty printed.](https://github.com/alexjeffburke/evaldown/commit/b128d5e704109806b53c81356a1f97544bf4851d) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Make the context an explicit argument to evaluateSnippet.](https://github.com/alexjeffburke/evaldown/commit/cc54c234045b18fb9bbc77ebd26ada00e4adfc62) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v0.6.0 (2020-04-25)

- [Record snippet check errors for output as a FileEvaluationError.](https://github.com/alexjeffburke/evaldown/commit/8a12f8016c0efe2d78b8dd59adc7f9fd23fd39d8) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Cover a few missed combinations in the Stats spec file.](https://github.com/alexjeffburke/evaldown/commit/12ea416c79415ef385f255521759750296e49076) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Avoid removing hidden snippets when writing inplace.](https://github.com/alexjeffburke/evaldown/commit/1437a98cee688426d296e399d4610b1e4193078c) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Implement hide flag.](https://github.com/alexjeffburke/evaldown/commit/cdc55db6d658744341a37e261727f7c13f03ece7) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Simplify previous snippet handling by passing it into onSnippet\(\).](https://github.com/alexjeffburke/evaldown/commit/ee84d8a6d44daac47631df92efcac27b8d1b789e) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+9 more](https://github.com/alexjeffburke/evaldown/compare/v0.5.0...v0.6.0)

### v0.5.0 (2020-04-18)

- [List find-up as a full dependency.](https://github.com/alexjeffburke/evaldown/commit/aaab46cef555bfc4b6c7d8b321d72c0d05882cd7) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Generate the README as markdown to allow GitHub to syntax highlight.](https://github.com/alexjeffburke/evaldown/commit/013dfa01891f00c925139f0c0eb3aeb8636ec5fd) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Update docs & metadata for TypeScript.](https://github.com/alexjeffburke/evaldown/commit/08a3a538d0947d0a2c4880a15880447ded0c957e) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Allow overriding the comment marker from the command line.](https://github.com/alexjeffburke/evaldown/commit/d79abf11d6877a3788c93ab34edff69479a3c914) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Implement a require option for a preamble to inject per file.](https://github.com/alexjeffburke/evaldown/commit/4cf9b6c0d207d65d8ac8b2d158f9136a8d9934ab) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+11 more](https://github.com/alexjeffburke/evaldown/compare/v0.4.1...v0.5.0)

### v0.4.1 (2020-04-10)

- [Fix missing quotes around strings logged to the console.](https://github.com/alexjeffburke/evaldown/commit/5b775494e567c286ca1e79d317da2c9b85a454a6) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Colocate per-snippet flags tests.](https://github.com/alexjeffburke/evaldown/commit/7d8d52b53c12a5b6ad2c2b81b8fe0fd573d6cec1) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v0.4.0 (2020-04-09)

- [Ensure falsy values are serialised correctly by the console.](https://github.com/alexjeffburke/evaldown/commit/8c54b5114fc075895a760ad06878c4fca5a77f44) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Use inspection for all values.](https://github.com/alexjeffburke/evaldown/commit/3dfc0492b6664ceec76483b4f369812bf8dff004) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Allow a targetPath to be specified via the command line.](https://github.com/alexjeffburke/evaldown/commit/01410fab9134d6e2e9400bb067ed02614debb847) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Make snippet evaluation call on Markdown instances explicit.](https://github.com/alexjeffburke/evaldown/commit/e7999cd86a7d3cc6318c317ebc5a906c5317dc52) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Fix execution of the preamble for transpiled snippets.](https://github.com/alexjeffburke/evaldown/commit/3492ec35af0b661f0ecd358666d4549cd2771b42) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+5 more](https://github.com/alexjeffburke/evaldown/compare/v0.3.1...v0.4.0)

### v0.3.1 (2020-04-05)

- [Avoid using shift\(\) when serialising output in InspectedConsole.](https://github.com/alexjeffburke/evaldown/commit/84743b495305123e53324a93a6202c5380d01839) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Ensure a per-snippet capture mode always takes precedence.](https://github.com/alexjeffburke/evaldown/commit/b1d02e7ad71a7f6c616ea192b7d0646fd76e0a50) ([Alex J Burke](mailto:alex@alexjeffburke.com))

### v0.3.0 (2020-04-04)

- [Isolate "nowrap" capture test from differences in node versions.](https://github.com/alexjeffburke/evaldown/commit/8051abdf88f6afd2d0a071a42a7ec2380fc6eb9c) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Document using flags via HTML comments.](https://github.com/alexjeffburke/evaldown/commit/f64ed073a6c7579b3450d9df31a28cb6b18f4b7b) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Update README for single file CLI support.](https://github.com/alexjeffburke/evaldown/commit/8e0bb449218ddf1dbcee6a5e55b2234fac435bbb) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Allow specifying the output format a command line option.](https://github.com/alexjeffburke/evaldown/commit/24a02b1efe98b2a6b4956a95f189e759d9028fe1) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Force the output format to markdown when updating a file in-place.](https://github.com/alexjeffburke/evaldown/commit/6d07ab397129107e6d04a7e05f129c2285c4c66a) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+18 more](https://github.com/alexjeffburke/evaldown/compare/v0.2.0...v0.3.0)

### v0.2.0 (2020-03-29)

#### Pull requests

- [#51](https://github.com/alexjeffburke/evaldown/pull/51) Upgrade mocha to version 7.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#50](https://github.com/alexjeffburke/evaldown/pull/50) Use the output from the expect of the UnexpectedError instead of the top-level one ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#48](https://github.com/alexjeffburke/evaldown/pull/48) Rejection from promises ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [#47](https://github.com/alexjeffburke/evaldown/pull/47) Avoid breaking with const\/let when babel is not present ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#45](https://github.com/alexjeffburke/evaldown/pull/45) Upgrade eslint-plugin-node to version 11.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#44](https://github.com/alexjeffburke/evaldown/pull/44) Add the ability for output blocks to specify a cleanStackTrace flag ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#43](https://github.com/alexjeffburke/evaldown/pull/43) Upgrade prettier to version 1.19.1 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#42](https://github.com/alexjeffburke/evaldown/pull/42) Upgrade eslint-plugin-node to version 10.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#41](https://github.com/alexjeffburke/evaldown/pull/41) Upgrade eslint-config-standard to version 14.0.0 ([depfu[bot]](mailto:23717796+depfu[bot]@users.noreply.github.com))
- [#38](https://github.com/alexjeffburke/evaldown/pull/38) Allow a 3.x series peer of magicpen-prism for newer Unexpected. ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [#37](https://github.com/alexjeffburke/evaldown/pull/37) Upgrade async to version 3.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#35](https://github.com/alexjeffburke/evaldown/pull/35) Upgrade mocha to version 6.0.0 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#33](https://github.com/alexjeffburke/evaldown/pull/33) Support multiple preceding html comments ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#32](https://github.com/alexjeffburke/evaldown/pull/32) Allow code block modifiers\/flags in HTML comments ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#31](https://github.com/alexjeffburke/evaldown/pull/31) Use the next major version of unexpected ([Sune Simonsen](mailto:sune@we-knowhow.dk))
- [#30](https://github.com/alexjeffburke/evaldown/pull/30) Add prettier setup ([Andreas Lind](mailto:andreaslindpetersen@gmail.com))
- [#29](https://github.com/alexjeffburke/evaldown/pull/29) Unsupport node versions &lt; 6 ([Andreas Lind](mailto:andreaslindpetersen@gmail.com), [depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#13](https://github.com/alexjeffburke/evaldown/pull/13) Upgrade async to version 2.6.1 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#15](https://github.com/alexjeffburke/evaldown/pull/15) Upgrade esprima to version 4.0.1 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#16](https://github.com/alexjeffburke/evaldown/pull/16) Upgrade passerror to version 1.1.1 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#18](https://github.com/alexjeffburke/evaldown/pull/18) Upgrade source-map-support to version 0.5.9 ([depfu[bot]](mailto:depfu[bot]@users.noreply.github.com))
- [#8](https://github.com/alexjeffburke/evaldown/pull/8) Babel transpile before esprima parsing ([Sune Simonsen](mailto:sune@we-knowhow.dk))
- [#1](https://github.com/alexjeffburke/evaldown/pull/1) Make magicpen-prism a peer dependency and try it on semver ([Sune Simonsen](mailto:sune@we-knowhow.dk))
- [#6](https://github.com/alexjeffburke/evaldown/pull/6) Rewrite function declarations to variable declarations to avoid Babel bug ([Sune Simonsen](mailto:sune@we-knowhow.dk))
- [#5](https://github.com/alexjeffburke/evaldown/pull/5) Support babel transpiling when generating html and updating snippets ([Sune Simonsen](mailto:sune@we-knowhow.dk))
- [#4](https://github.com/alexjeffburke/evaldown/pull/4) Integrate with babel and source map support ([Andreas Lind](mailto:andreas@one.com))

#### Commits to master

- [Set repository info.](https://github.com/alexjeffburke/evaldown/commit/c0acb45adeaf1d9320c0433f616b78c1d2eee632) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Do an editorial pass over the README.](https://github.com/alexjeffburke/evaldown/commit/0b779d4f55739e661acdfe7fd3816b243ffbaab1) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Change the default output capture mode name to "return".](https://github.com/alexjeffburke/evaldown/commit/3b2cc750567d663c269cbfbca8885f3f77646f1e) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Generate a stats objected detailing file status from processFiles\(\).](https://github.com/alexjeffburke/evaldown/commit/66cd32404f125940af0cc1a19f0a00c535d9a23b) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Exhaust all the snippets in a file before reporting evaluation error.](https://github.com/alexjeffburke/evaldown/commit/6de21d62497c0aa75e0ab14742fafffee44f01e8) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+47 more](https://github.com/alexjeffburke/evaldown/compare/v0.1.0...v0.2.0)

### v0.1.0 (2020-03-23)

- [Update package metadata.](https://github.com/alexjeffburke/evaldown/commit/3a69602f26e54cc73b58f1f3e945daab6fc72938) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Send coverage data to coveralls.](https://github.com/alexjeffburke/evaldown/commit/7466ba8a50e78dee2d6e79d95bf4586eb102537a) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Document the markdown output format.](https://github.com/alexjeffburke/evaldown/commit/6b6796524b30658baebfc1cd6643347e7341c4ac) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Settle on "wrapOutput" to specify an output wrapping function.](https://github.com/alexjeffburke/evaldown/commit/ad68f0a96cb735692be8ae4a6f3cab6e6accca05) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [Add "console" capture to the README.](https://github.com/alexjeffburke/evaldown/commit/7780d185bf16c8c6a955a019633ad121af0a3d9d) ([Alex J Burke](mailto:alex@alexjeffburke.com))
- [+28 more](https://github.com/alexjeffburke/evaldown/compare/3a69602f26e54cc73b58f1f3e945daab6fc72938%5E...v0.1.0)

