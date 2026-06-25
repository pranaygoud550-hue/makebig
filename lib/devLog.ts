/** Log only in development — keeps production console clean. */
export function devLog(...args: unknown[]) {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
}
