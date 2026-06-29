import { Image } from 'react-native';

export function LogoBadge({ size = 34 }: { size?: number }) {
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require('@/assets/logo.png')}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  );
}
