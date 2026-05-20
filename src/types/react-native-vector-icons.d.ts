declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import type {TextProps} from 'react-native';
  import type {ComponentType} from 'react';

  type IconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
  };

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
