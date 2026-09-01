declare module '*.css'
declare module '*.md' {
  import type { SlideDef } from 'prezzer'
  const slides: SlideDef[]
  export default slides
}
