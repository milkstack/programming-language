- add features

  - arrays
    - iterators? map, filter, reduce, forEach
  - objects
  - strings -- char arrays I assume
    - interpolation + concatenation
  - types
  - && and || -- parantheses may already just work

- Carry line numbers and character numbers all the way into the generator
- implement default immutable vars and add a mutable keyword (or Mutable<T> type?)
- fix npm vulns, or don't and just rewrite the compiler in the new language :)

- fix variable scope implementation. I'm pretty sure the right LLVM way is to:

```
const oldValue = variables[variableName];
variables[variableName] = newValue

// -- logic for function/if/loop scope --

variables[variableName] = oldValue
```

- super duper nice to have features eventually
  - regex
