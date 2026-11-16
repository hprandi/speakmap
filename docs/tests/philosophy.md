# Testing philosophy

Tests are named according to Google's *Software Engineering at Google* nomenclature, by the resources they use, not by how much code they cover:

- **Small**: one process, no network, deterministic. See [small tests](small.md). Run using `npm test`
- **Medium**: one machine, with local processes such as a dev server or a headless browser. There are none yet.
- **Large**: the real system with real external services. These are manual checks for now.

Every size follows the [test conventions](../conventions/tests.md).
