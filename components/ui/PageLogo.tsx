import { Image, View } from 'react-native';
import { spacing } from '@/constants/design';

// Standard Voya360 logo for page headers.
// variant="nav"  → 74×74, positioned absolutely in a nav bar row (paddingRight: 72 on the row)
// variant="tab"  → 34×34 circle, inline at the end of a header row
export function PageLogo({ variant = 'tab' }: { variant?: 'nav' | 'tab' }) {
  if (variant === 'nav') {
    return (
      <Image
        source={require('@/assets/logo.png')}
        style={{
          position: 'absolute',
          right: spacing.pagePadding,
          top: '50%',
          marginTop: -37,
          width: 74,
          height: 74,
        }}
        resizeMode="contain"
      />
    );
  }

  return (
    <Image
      source={require('@/assets/logo.png')}
      style={{ width: 60, height: 60 }}
      resizeMode="contain"
    />
  );
}
