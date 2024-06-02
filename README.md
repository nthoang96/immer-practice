# ImmerJS

Example: https://github.com/mweststrate/immer-gifts/tree/lesson20

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

An easier way to obtain the patches is to use `produceWithPatches`, which has the same signature as `produce`

```js
import {produceWithPatches} from "immer"

const [nextState, patches, inversePatches] = produceWithPatches(
    {
        age: 33
    },
    draft => {
        draft.age++
    }
)
```

### Auto freezing
Immer automatically freezes any state trees that are modified using `produce`.

`setAutoFreeze(true / false)` can be used to explicitly turn this feature on or off.

### Returning new data from producers
It is not needed to return anything from a producer, as Immer will return the (finalized) version of the draft anyway. However, it is allowed to just return draft.

```js
const userReducer = produce((draft, action) => {
    switch (action.type) {
        case "renameUser":
            // OK: we modify the current state
            draft.users[action.payload.id].name = action.payload.name
            return draft // same as just 'return'
        case "loadUsers":
            // OK: we return an entirely new state
            return action.payload
        case "adduser-1":
            // NOT OK: This doesn't do change the draft nor return a new state!
            // It doesn't modify the draft (it just redeclares it)
            // In fact, this just doesn't do anything at all
            draft = {users: [...draft.users, action.payload]}
            return
        case "adduser-2":
            // NOT OK: modifying draft *and* returning a new state
            draft.userCount += 1
            return {users: [...draft.users, action.payload]}
        case "adduser-3":
            // OK: returning a new state. But, unnecessary complex and expensive
            return {
                userCount: draft.userCount + 1,
                users: [...draft.users, action.payload]
            }
        case "adduser-4":
            // OK: the immer way
            draft.userCount += 1
            draft.users.push(action.payload)
            return
    }
})
```

### Producing `undefined` using `nothing`

```js
import {produce, nothing} from "immer"

const state = {
    hello: "world"
}

produce(state, draft => {})
produce(state, draft => undefined)
// Both return the original state: { hello: "world"}

produce(state, draft => nothing)
// Produces a new state, 'undefined'
```

### Inline shortcuts using `void`

```js
// Single mutation
produce(draft => void (draft.user.age += 1))

// Multiple mutations
produce(draft => void ((draft.user.age += 1), (draft.user.height = 186)))
```

## createDraft / finishDraft
`createDraft` and `finishDraft` are two low-level functions that are mostly useful for libraries that build abstractions on top of immer. It avoids the need to always create a function in order to work with drafts. Instead, one can create a draft, modify it, and at some time in the future finish the draft, in which case the next immutable state will be produced.

```js
import {createDraft, finishDraft} from "immer"

const user = {
    name: "michel",
    todos: []
}

const draft = createDraft(user)
draft.todos = await (await window.fetch("http://host/" + draft.name)).json()
const loadedUser = finishDraft(draft)
```

> `finishDraft` takes a `patchListener` as second argument, which can be used to record the patches, similarly to `produce`.

⚠️ in general, we recommend to use produce instead of the createDraft / finishDraft combo, produce is less error prone in usage, and more clearly separates the concepts of mutability and immutability in your code base.

## Performance tips
### Pre-freeze data
When adding a large data set to the state tree in an Immer producer (for example data received from a JSON endpoint), it is worth to call freeze(json) on the root of the data that is being added first. To shallowly freeze it. This will allow Immer to add the new data to the tree faster, as it will avoid the need to recursively scan and freeze the new data.

### You can always opt-out
### For expensive search operations, read from the original state, not the draft
Immer will convert anything you read in a draft recursively into a draft as well. If you have expensive side effect free operations on a draft that involves a lot of reading, for example finding an index using find(Index) in a very large array, you can speed this up by first doing the search, and only call the produce function once you know the index. *Thereby preventing Immer to turn everything that was searched for in a draft. Or, alternatively, perform the search on the original value of a draft, by using original(someDraft), which boils to the same thing.*

### Pull produce as far up as possible
Always try to pull produce 'up',
```js
for example for (let x of y) {
  produce(base, d => d.push(x))
}
```
is exponentially slower than
```js
produce(base, d => { for (let x of y) d.push(x)})
```
