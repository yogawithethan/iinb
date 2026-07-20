// Allow `import Logo from './foo.svg'` — handled by react-native-svg-transformer
// at bundle time, returns a React component.
declare module '*.svg' {
  import type { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}
