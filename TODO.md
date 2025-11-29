- add gd tests I guess
- add features

  - while loops + break/continue
  - types
  - arrays
    - iterators? map, filter, reduce, forEach
  - objects
  - strings -- char arrays I assume

- fix variable scope implementation. I'm pretty sure the right LLVM way is to

```
const oldValue = variables[variableName];
variables[variableName] = newValue

// -- logic for function/if/loop scope --

variables[variableName] = oldValue
```

- Carry line numbers and character numbers all the way into the generator
- add && and || -- parantheses may already just work
- implement default immutable vars and add a mutable keyword (or Mutable<T> type?). We can check if
