// In your application's entrypoint
import { enableMapSet } from "immer";

enableMapSet();

// ...later
import { produce } from "immer";

const usersById_v1 = new Map([
  ["michel", { name: "Michel Weststrate", country: "NL" }],
]);

const usersById_v2 = produce(usersById_v1, (draft) => {
  draft.get("michel").country = "UK";
});

console.log(usersById_v2);
