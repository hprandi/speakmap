# Small tests

## Test at behavioral boundaries

A boundary is where a complete behavior can be observed, such as a module's API or an implementation of a domain contract.
Test behavior through its boundary, regardless of how many internal units are involved.

## Test internal units selectively

Test units behind a boundary independently when their complexity makes them difficult to cover through the boundary, or when failures have serious consequences.
Otherwise, rely on boundary-level coverage.

## Test each behavior at a single boundary

Test each behavior at the boundary responsible for it.
Other boundaries should verify that the behavior is correctly integrated, without duplicating its business rules.

## Replace only dependencies the test cannot control

Use real implementations for code we own and dependencies that run quickly and deterministically.
Replace external services, unavailable platform capabilities, and sources of nondeterminism such as time or randomness.
Make replacements at the closest edge we control, keeping as much of our own code under test as possible.

## Prefer fakes over mocks

Prefer fakes that provide predictable behavior without coupling tests to implementation details.

## Assert outcomes, not interactions

Verify observable results and state changes rather than internal method calls.
Assert interactions only when the interaction itself is part of the expected behavior.

## Write tests before implementation

Define the expected behavior in tests before the actual implementation.