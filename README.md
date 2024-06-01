# ImmerJS

## Basic
Immer (German for: always) is a tiny package that allows you to work with immutable state in a more convinient way

```js
const baseState = [
  {
    title: "Learn TypeScript",
    done: true,
  },
  {
    title: "Try Immer",
    done: false,
  },
];
```

Imagine we have the above base state, and we'll need to update the second todo, and add a third one. However, we don't want to mutate the original baseState, and we want to avoid deep cloning as well (to preserve the first todo).

*Without Immer*

```js
const nextState = baseState.slice(); // shallow clone the array
nextState[1] = {
  // replace element 1...
  ...nextState[1], // with a shallow clone of element 1
  done: true, // ...combined with the desired update
};
// since nextState was freshly cloned, using push is safe here,
// but doing the same thing at any arbitrary time in the future would
// violate the immutability principles and introduce a bug!
nextState.push({ title: "Tweet about it" });
```

*With Immer*
We can leverage the produce function, which takes as first argument the state we want to start from, and as second argument we pass a function, called the recipe, that is passed a draft to which we can apply straightforward mutations. Those mutations are recorded and used to produce the next state once the recipe is done.

```js
import { produce } from "immer"
const nextState = produce(baseState, draft => {
    draft[1].done = true
    draft.push({title: "Tweet about it"})
})
```

### How Immer works
The basic idea is that with Immer you will apply all your changes to a temporary draft, which is a proxy of the currentState. Once all your mutations are completed, Immer will produce the nextState based on the mutations to the draft state. This means that you can interact with your data by simply modifying it while keeping all the benefits of immutable data.

Current -> Draft -> Next

### Using `produce`
```js
produce(baseState, recipe: (draftState) => void): nextState
```

`produce` takes a base state, and a recipe that can be used to perform all the desired mutations on the `draft` that is passed in. The interesting thing about Immer is that the `baseState` will be untouched, but the `nextState` will reflect all changes made to `draftState`.

> Note that the recipe funciton itself normally doesn't return anything. However, it is possible to return in case you want to replace the draft object in its entirely with another object.

*Terminology*
- `(base)state`, the immutable state passed to `produce`
- `recipe`: the second argument of `produce`, that captures how the base state should be "mutated".
- `draft`: the first argument of any `recipe`, which is a proxy to the original base state that can be safely mutated.
- `producer`. A function that uses produce and is generally of the form `(baseState, ...arguments)` => `resultState`

### Curried producers
*Before*:
```js
import {produce} from "immer"

function toggleTodo(state, id) {
    return produce(state, draft => {
        const todo = draft.find(todo => todo.id === id)
        todo.done = !todo.done
    })
}

const baseState = [
    {
        id: "JavaScript",
        title: "Learn TypeScript",
        done: true
    },
    {
        id: "Immer",
        title: "Try Immer",
        done: false
    }
]

const nextState = toggleTodo(baseState, "Immer")
```

*After*:
```js
import {produce} from "immer"

// curried producer:
const toggleTodo = produce((draft, id) => {
    const todo = draft.find(todo => todo.id === id)
    todo.done = !todo.done
})

const baseState = [
    /* as is */
]

const nextState = toggleTodo(baseState, "Immer")
```

## Advanced Features

### Map and Set

Since version 6 support for Maps and Sets has to be enabled explicitly by calling enableMapSet() once when starting your application.

### Classes

### Current
Example:
```js
const base = {
    x: 0
}

const next = produce(base, draft => {
    draft.x++
    const orig = original(draft)
    const copy = current(draft)
    console.log(orig.x)
    console.log(copy.x)

    setTimeout(() => {
        // this will execute after the produce has finished!
        console.log(orig.x)
        console.log(copy.x)
    }, 100)

    draft.x++
    console.log(draft.x)
})
console.log(next.x)

// This will print
// 0 (orig.x)
// 1 (copy.x)
// 2 (draft.x)
// 2 (next.x)
// 0 (after timeout, orig.x)
// 1 (after timeout, copy.x)
```

### Original
> `original` cannot be invoked on objects that aren't drafts.

### Patches

Since version 6 support for Patches has to be enabled explicitly by calling enablePatches() once when starting your application.

To help with replaying patches, applyPatches comes in handy. Here is an example how patches could be used to record the incremental updates and (inverse) apply them:
```js
import {produce, applyPatches} from "immer"

// version 6
import {enablePatches} from "immer"
enablePatches()

let state = {
    name: "Micheal",
    age: 32
}

// Let's assume the user is in a wizard, and we don't know whether
// his changes should end up in the base state ultimately or not...
let fork = state
// all the changes the user made in the wizard
let changes = []
// the inverse of all the changes made in the wizard
let inverseChanges = []

fork = produce(
    fork,
    draft => {
        draft.age = 33
    },
    // The third argument to produce is a callback to which the patches will be fed
    (patches, inversePatches) => {
        changes.push(...patches)
        inverseChanges.push(...inversePatches)
    }
)

// In the meantime, our original state is replaced, as, for example,
// some changes were received from the server
state = produce(state, draft => {
    draft.name = "Michel"
})

// When the wizard finishes (successfully) we can replay the changes that were in the fork onto the *new* state!
state = applyPatches(state, changes)

// state now contains the changes from both code paths!
expect(state).toEqual({
    name: "Michel", // changed by the server
    age: 33 // changed by the wizard
})

// Finally, even after finishing the wizard, the user might change his mind and undo his changes...
state = applyPatches(state, inverseChanges)
expect(state).toEqual({
    name: "Michel", // Not reverted
    age: 32 // Reverted
})
```
