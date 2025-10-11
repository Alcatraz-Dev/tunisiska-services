import { decode } from "./zip";


export function decodeSwish(encoded: string) {
  try {
    return JSON.parse(decode(encoded));
  } catch (error) {
    return null;
  }
}