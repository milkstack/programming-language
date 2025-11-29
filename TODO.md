- add features

  - break/continue
  - printing to the console
  - arrays
    - iterators? map, filter, reduce, forEach
  - objects
  - strings -- char arrays I assume
  - types

- fix variable scope implementation. I'm pretty sure the right LLVM way is to

```
const oldValue = variables[variableName];
variables[variableName] = newValue

// -- logic for function/if/loop scope --

variables[variableName] = oldValue
```

- Carry line numbers and character numbers all the way into the generator
- add && and || -- parantheses may already just work
- implement default immutable vars and add a mutable keyword (or Mutable<T> type?)
- fix npm vulns, or don't and just rewrite the compiler in the new language :)
