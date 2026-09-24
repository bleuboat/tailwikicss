import { apply } from "./apply.ts"

const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLDivElement;

input.addEventListener("input", () => {
  output.innerText = apply(input.value);
})
