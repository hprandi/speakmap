# Tests

- Test files sit next to the code they test, named `<File>.test.ts`.
- The top-level `describe` is the name of the class or function under test.
- Each nested `describe` is the name of the requirement it covers.
- Test language use code words (`graph`, `id`), never product words (`map`, `label`).
- Each `it` reads `when <condition>, then <outcome>`, as short as possible while keeping the meaning.
- Concrete values (ids, texts) go in the test body, not in the name.
