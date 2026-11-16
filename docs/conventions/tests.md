# Tests

- Test files sit next to the code they test, named `<File>.test.ts`.
- The top-level `describe` is the name of the class or function under test.
- Each nested `describe` is the name of the requirement it covers.
- Each `it` reads `when <action>, then <outcome>`, as short as possible while keeping the meaning.
- The `it` describes the action at the system under test and its outcome, in words rather than method names (`when a capture runs`, not `when stopCapture is called`).
- Concrete values (ids, texts) go in the test body, not in the name.
- The test body is split by `// given`, `// when` and `// then` comments.
- `given` sets the starting state and how each collaborator will respond, `when` holds only the action under test (one call, or a short sequence that forms one action), and `then` checks the outcome.
- When the order of events is the behavior under test, alternate `// when` and `// then` along the timeline instead.
