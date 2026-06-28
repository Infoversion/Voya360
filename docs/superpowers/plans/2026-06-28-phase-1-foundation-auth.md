# Phase 1: Foundation + Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working React Native app (Expo SDK 53) with NativeWind styling, Supabase auth, and full tab navigation — login, signup, profile, and skeleton home/bookings screens.

**Architecture:** Expo Router handles file-based navigation with a root `_layout.tsx` that listens to Supabase auth state changes and redirects between `(auth)` and `(tabs)` groups. Zustand stores session + user profile. NativeWind v4 provides Tailwind-style class utilities but all Phase 1 components use inline StyleSheet for performance and explicit token usage.

**Tech Stack:** Expo SDK 53 + TypeScript, Expo Router, NativeWind v4, Zustand, Supabase JS v2, React Native Testing Library

## Global Constraints

- Minimum touch target: 44×44dp on every interactive element
- Minimum font size: 16sp body, 14sp labels — never smaller
- Accent color: `#E8751A` (saffron) — only colour used for primary CTAs, never tinted for disabled state, use opacity 0.5 instead
- All prices: constant `SERVICE_FEE_USD = 9.99` — never computed, never a percentage
- RLS on every Supabase table — never bypass for convenience
- Passport numbers: never logged, never sent anywhere — Vault only (enforced in Phase 3)
- Copy rule: "Total you pay" not "Gross fare"; "Sign in" not "Login"; "Create account" not "Register"
- Expo SDK: 53 exactly — do not upgrade
- Supabase JS: v2 (`@supabase/supabase-js@^2`)

---

### Task 1: Expo Project Scaffolding

**Files:**
- Create: `package.json` (via create-expo-app)
- Create: `app.json`
- Create: `babel.config.js`
- Create: `metro.config.js`
- Create: `tailwind.config.js`
- Create: `global.css`
- Create: `nativewind-env.d.ts`
- Create: `tsconfig.json`
- Create: `.env.local` (template only — values filled by developer)
- Create: `jest.config.js`

**Interfaces:**
- Produces: runnable Expo dev server with NativeWind, Expo Router, and path alias `@/` resolving to project root

- [ ] **Step 1: Initialize Expo project in the existing directory**

```bash
cd /Users/nasirali/Documents/Projects/Voya360
npx create-expo-app@latest . --template blank-typescript
```

If that fails on a non-empty directory:
```bash
npx create-expo-app@latest voya360-temp --template blank-typescript
cp -r voya360-temp/. .
rm -rf voya360-temp
```

Expected: `package.json`, `App.tsx`, `app.json` appear in project root.

- [ ] **Step 2: Install Expo Router and navigation dependencies**

```bash
npx expo install expo-router expo-constants expo-linking expo-status-bar expo-font @expo/vector-icons
```

Expected: packages added to `node_modules` with no peer dep errors.

- [ ] **Step 3: Install NativeWind v4 and its peer dependencies**

```bash
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context
```

Expected: `nativewind` and `tailwindcss` in `package.json` dependencies.

- [ ] **Step 4: Install Supabase and AsyncStorage**

```bash
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 5: Install Zustand and dev dependencies**

```bash
npm install zustand
npm install --save-dev @testing-library/react-native jest-expo
```

- [ ] **Step 6: Update `package.json` — set Expo Router entry point and jest config**

Open `package.json`. Change the `"main"` field to `"expo-router/entry"`. Then add the `"jest"` block:

```json
{
  "main": "expo-router/entry",
  "jest": {
    "preset": "jest-expo",
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|nativewind|zustand)"
    ],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    }
  }
}
```

- [ ] **Step 7: Replace `app.json` with Expo Router + scheme config**

Delete existing `app.json` and create:

```json
{
  "expo": {
    "name": "Voya360",
    "slug": "voya360",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "voya360",
    "userInterfaceStyle": "light",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFFFFF"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.voya360.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.voya360.app"
    },
    "web": {
      "bundler": "metro",
      "output": "static"
    },
    "plugins": [
      "expo-router"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **Step 8: Replace `babel.config.js` with NativeWind v4 config**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

- [ ] **Step 9: Create `metro.config.js` with NativeWind integration**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 10: Create `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './engine/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: '#E8751A',
        'text-primary': '#1A1A1A',
        'text-muted': '#6B7280',
        success: '#16A34A',
        warning: '#D97706',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 11: Create `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 12: Create `nativewind-env.d.ts`**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 13: Update `tsconfig.json` to add path aliases**

Replace existing `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 14: Create `.env.local` template**

```bash
# Copy this to .env.local and fill in values from your Supabase project dashboard
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Add `.env.local` to `.gitignore`:
```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 15: Delete the auto-generated `App.tsx`**

Expo Router uses `app/` directory — the root `App.tsx` conflicts with it.
```bash
rm App.tsx 2>/dev/null || true
```

- [ ] **Step 16: Verify the dev server starts**

```bash
npx expo start --clear
```

Expected: QR code appears in terminal. Scanning on a device or opening in simulator shows the default Expo screen (or a "no index route" message — that's correct, we haven't created `app/_layout.tsx` yet).

- [ ] **Step 17: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Expo SDK 53 project with NativeWind v4, Expo Router, Supabase, Zustand"
```

---

### Task 2: Design Tokens

**Files:**
- Create: `constants/design.ts`

**Interfaces:**
- Produces: `colors`, `fontSize`, `spacing` exported constants used by every component

- [ ] **Step 1: Create `constants/design.ts`**

```typescript
export const colors = {
  accent:     '#E8751A',
  background: '#FFFFFF',
  text:       '#1A1A1A',
  textMuted:  '#6B7280',
  success:    '#16A34A',
  warning:    '#D97706',
  border:     '#E5E7EB',
} as const;

export const fontSize = {
  body:   16,
  label:  14,
  header: 22,
  price:  28,
  pnr:    32,
} as const;

export const spacing = {
  touchTarget: 44,
  pagePadding: 24,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add constants/design.ts
git commit -m "feat: add design tokens"
```

---

### Task 3: Base UI Components

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Input.tsx`
- Create: `components/ui/StepIndicator.tsx`
- Create: `__tests__/components/Button.test.tsx`
- Create: `__tests__/components/Input.test.tsx`

**Interfaces:**
- Produces:
  - `Button({ label, onPress, variant?, loading?, disabled? })`
  - `Input({ label, error?, ...TextInputProps })`
  - `StepIndicator({ currentStep: 1|2|3|4 })`

- [ ] **Step 1: Write failing tests for Button**

Create `__tests__/components/Button.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders the label', () => {
    const { getByText } = render(<Button label="Confirm & Pay" onPress={() => {}} />);
    expect(getByText('Confirm & Pay')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Confirm & Pay" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Confirm & Pay" onPress={onPress} disabled />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<Button label="Confirm & Pay" onPress={onPress} loading />);
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('hides label text when loading', () => {
    const { queryByText } = render(<Button label="Confirm & Pay" onPress={() => {}} loading />);
    expect(queryByText('Confirm & Pay')).toBeNull();
  });
});
```

- [ ] **Step 2: Run Button tests — expect FAIL**

```bash
npx jest __tests__/components/Button.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '@/components/ui/Button'"

- [ ] **Step 3: Create `components/ui/Button.tsx`**

```tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isInactive = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isInactive}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        minHeight: spacing.touchTarget,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: isPrimary
          ? isInactive ? `${colors.accent}80` : colors.accent
          : 'transparent',
        borderWidth: isPrimary ? 0 : 1.5,
        borderColor: isInactive ? `${colors.accent}80` : colors.accent,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : colors.accent} />
      ) : (
        <Text
          style={{
            fontSize: fontSize.body,
            fontWeight: '700',
            color: isPrimary ? '#FFFFFF' : colors.accent,
          }}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 4: Run Button tests — expect PASS**

```bash
npx jest __tests__/components/Button.test.tsx --no-coverage
```

Expected: 5 tests pass.

- [ ] **Step 5: Write failing tests for Input**

Create `__tests__/components/Input.test.tsx`:

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/ui/Input';

describe('Input', () => {
  it('renders label text', () => {
    const { getByText } = render(
      <Input label="Email address" value="" onChangeText={() => {}} />,
    );
    expect(getByText('Email address')).toBeTruthy();
  });

  it('shows error message when provided', () => {
    const { getByText } = render(
      <Input label="Email address" value="" onChangeText={() => {}} error="Invalid email" />,
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('does not show error when error prop is absent', () => {
    const { queryByText } = render(
      <Input label="Email address" value="" onChangeText={() => {}} />,
    );
    expect(queryByText('Invalid email')).toBeNull();
  });

  it('calls onChangeText when user types', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(
      <Input label="Email address" value="" onChangeText={onChangeText} />,
    );
    fireEvent.changeText(getByLabelText('Email address'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });
});
```

- [ ] **Step 6: Run Input tests — expect FAIL**

```bash
npx jest __tests__/components/Input.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '@/components/ui/Input'"

- [ ] **Step 7: Create `components/ui/Input.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, type TextInputProps } from 'react-native';
import { colors, fontSize, spacing } from '@/constants/design';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: fontSize.label,
          color: colors.textMuted,
          marginBottom: 6,
          fontWeight: '500',
        }}
      >
        {label}
      </Text>
      <TextInput
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        accessible
        accessibilityLabel={label}
        style={{
          height: spacing.touchTarget,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: error ? '#DC2626' : focused ? colors.accent : colors.border,
          paddingHorizontal: 14,
          fontSize: fontSize.body,
          color: colors.text,
          backgroundColor: colors.background,
        }}
      />
      {error && (
        <Text style={{ fontSize: 13, color: '#DC2626', marginTop: 4 }}>{error}</Text>
      )}
    </View>
  );
}
```

- [ ] **Step 8: Run Input tests — expect PASS**

```bash
npx jest __tests__/components/Input.test.tsx --no-coverage
```

Expected: 4 tests pass.

- [ ] **Step 9: Create `components/ui/StepIndicator.tsx`** (no tests — purely visual)

```tsx
import React from 'react';
import { View } from 'react-native';
import { colors } from '@/constants/design';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    <View
      style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep }}
      accessibilityLabel={`Step ${currentStep} of ${totalSteps}`}
    >
      {Array.from({ length: totalSteps }, (_, i) => (
        <View
          key={i}
          style={{
            height: 4,
            flex: 1,
            borderRadius: 2,
            backgroundColor: i < currentStep ? colors.accent : colors.border,
          }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 10: Run all tests to confirm nothing is broken**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add components/ __tests__/
git commit -m "feat: add Button, Input, and StepIndicator base UI components with tests"
```

---

### Task 4: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`
- Create: `supabase/migrations/002_rls.sql`

**Interfaces:**
- Produces: 6 Postgres tables with correct types, defaults, and indexes; RLS enabled on all user-scoped tables

- [ ] **Step 1: Create `supabase/migrations/001_schema.sql`**

```sql
create extension if not exists "pgcrypto";

create table public.users (
  id                 uuid primary key default gen_random_uuid(),
  email              text unique not null,
  full_name          text,
  phone              text,
  home_origin        text,
  home_destination   text,
  preferred_airlines text[] default '{}',
  avoided_airports   text[] default '{}',
  default_bag_count  int default 2,
  dietary_preference text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  dietary_confirmed  bool default false,
  created_at         timestamptz default now()
);

create table public.saved_travelers (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references public.users(id) on delete cascade not null,
  full_name         text not null,
  date_of_birth     date,
  passport_number   text,
  passport_expiry   date,
  passport_country  text,
  dietary_preference text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  seat_preference   text check (seat_preference in ('window','aisle','none')),
  is_primary        bool default false,
  created_at        timestamptz default now()
);

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete restrict not null,
  duffel_order_id  text unique not null,
  pnr              text,
  status           text check (status in ('confirmed','cancelled','refunded')) default 'confirmed',
  origin           text,
  destination      text,
  departure_at     timestamptz,
  arrival_at       timestamptz,
  airline          text,
  cabin_class      text,
  passenger_count  int,
  base_fare_usd    numeric(10,2),
  service_fee_usd  numeric(10,2) default 9.99,
  baggage_fee_usd  numeric(10,2) default 0,
  total_usd        numeric(10,2),
  e_ticket_url     text,
  created_at       timestamptz default now()
);

create table public.booking_passengers (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid references public.bookings(id) on delete cascade not null,
  saved_traveler_id   uuid references public.saved_travelers(id) on delete set null,
  full_name           text not null,
  dietary_preference  text check (dietary_preference in ('vegetarian','halal','kosher','vegan','none')),
  seat_number         text
);

create table public.price_history (
  id             uuid primary key default gen_random_uuid(),
  origin         text not null,
  destination    text not null,
  cabin_class    text not null,
  departure_date date not null,
  airline        text,
  price_usd      numeric(10,2),
  bags_included  bool,
  snapshot_at    timestamptz default now()
);

create table public.price_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete cascade not null,
  origin           text not null,
  destination      text not null,
  target_price_usd numeric(10,2) not null,
  cabin_class      text default 'economy',
  is_active        bool default true,
  triggered_at     timestamptz,
  created_at       timestamptz default now()
);

-- Index for price trend calculations (Phase 2)
create index idx_price_history_corridor
  on public.price_history(origin, destination, cabin_class, snapshot_at desc);

-- Index for price alert checker Edge Function (Phase 4)
create index idx_price_alerts_active
  on public.price_alerts(is_active) where is_active = true;
```

- [ ] **Step 2: Create `supabase/migrations/002_rls.sql`**

```sql
alter table public.users              enable row level security;
alter table public.saved_travelers    enable row level security;
alter table public.bookings           enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.price_history      enable row level security;
alter table public.price_alerts       enable row level security;

-- users: own row only
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- saved_travelers: own rows
create policy "saved_travelers_select" on public.saved_travelers
  for select using (auth.uid() = user_id);
create policy "saved_travelers_insert" on public.saved_travelers
  for insert with check (auth.uid() = user_id);
create policy "saved_travelers_update" on public.saved_travelers
  for update using (auth.uid() = user_id);
create policy "saved_travelers_delete" on public.saved_travelers
  for delete using (auth.uid() = user_id);

-- bookings: own rows
create policy "bookings_select" on public.bookings
  for select using (auth.uid() = user_id);
create policy "bookings_insert" on public.bookings
  for insert with check (auth.uid() = user_id);

-- booking_passengers: accessible if the booking belongs to user
create policy "booking_passengers_select" on public.booking_passengers
  for select using (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );
create policy "booking_passengers_insert" on public.booking_passengers
  for insert with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.user_id = auth.uid()
    )
  );

-- price_history: read-only for any authenticated user; service role writes via Edge Functions
create policy "price_history_select" on public.price_history
  for select using (auth.role() = 'authenticated');

-- price_alerts: own rows
create policy "price_alerts_select" on public.price_alerts
  for select using (auth.uid() = user_id);
create policy "price_alerts_insert" on public.price_alerts
  for insert with check (auth.uid() = user_id);
create policy "price_alerts_update" on public.price_alerts
  for update using (auth.uid() = user_id);
create policy "price_alerts_delete" on public.price_alerts
  for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Apply migrations to your Supabase project**

Option A — Supabase CLI (preferred):
```bash
# Install CLI if not already installed
npm install -g supabase

# Link to your project (get project ref from Supabase dashboard URL)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

Option B — Supabase Dashboard SQL editor:
Paste contents of `001_schema.sql` first, run it. Then paste `002_rls.sql`, run it.

Expected: No errors. Tables appear in the Supabase dashboard under Table Editor.

- [ ] **Step 4: Verify RLS is active**

In the Supabase dashboard → Authentication → Policies, confirm all 6 tables show policies. `price_history` should have 1 policy; all others should have 2–4.

- [ ] **Step 5: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema with 6 tables and RLS policies"
```

---

### Task 5: TypeScript Types

**Files:**
- Create: `types/booking.ts`
- Create: `types/duffel.ts`
- Create: `types/zara.ts`

**Interfaces:**
- Produces: `UserProfile`, `SavedTraveler`, `Booking`, `BookingPassenger`, `PriceHistory`, `PriceAlert`, `SERVICE_FEE_USD` from `types/booking.ts`; Duffel API shape types from `types/duffel.ts`; Z@r@ observation types from `types/zara.ts`

- [ ] **Step 1: Create `types/booking.ts`**

```typescript
export type DietaryPreference = 'vegetarian' | 'halal' | 'kosher' | 'vegan' | 'none';
export type SeatPreference    = 'window' | 'aisle' | 'none';
export type BookingStatus     = 'confirmed' | 'cancelled' | 'refunded';
export type CabinClass        = 'economy' | 'premium_economy' | 'business' | 'first';

export interface UserProfile {
  id:                  string;
  email:               string;
  full_name:           string | null;
  phone:               string | null;
  home_origin:         string | null;
  home_destination:    string | null;
  preferred_airlines:  string[];
  avoided_airports:    string[];
  default_bag_count:   number;
  dietary_preference:  DietaryPreference | null;
  dietary_confirmed:   boolean;
  created_at:          string;
}

export interface SavedTraveler {
  id:                 string;
  user_id:            string;
  full_name:          string;
  date_of_birth:      string | null;
  passport_number:    string | null;
  passport_expiry:    string | null;
  passport_country:   string | null;
  dietary_preference: DietaryPreference | null;
  seat_preference:    SeatPreference | null;
  is_primary:         boolean;
  created_at:         string;
}

export interface Booking {
  id:               string;
  user_id:          string;
  duffel_order_id:  string;
  pnr:              string | null;
  status:           BookingStatus;
  origin:           string | null;
  destination:      string | null;
  departure_at:     string | null;
  arrival_at:       string | null;
  airline:          string | null;
  cabin_class:      string | null;
  passenger_count:  number | null;
  base_fare_usd:    number | null;
  service_fee_usd:  number;
  baggage_fee_usd:  number;
  total_usd:        number | null;
  e_ticket_url:     string | null;
  created_at:       string;
}

export interface BookingPassenger {
  id:                 string;
  booking_id:         string;
  saved_traveler_id:  string | null;
  full_name:          string;
  dietary_preference: DietaryPreference | null;
  seat_number:        string | null;
}

export interface PriceHistory {
  id:             string;
  origin:         string;
  destination:    string;
  cabin_class:    string;
  departure_date: string;
  airline:        string | null;
  price_usd:      number | null;
  bags_included:  boolean | null;
  snapshot_at:    string;
}

export interface PriceAlert {
  id:               string;
  user_id:          string;
  origin:           string;
  destination:      string;
  target_price_usd: number;
  cabin_class:      string;
  is_active:        boolean;
  triggered_at:     string | null;
  created_at:       string;
}

export const SERVICE_FEE_USD = 9.99 as const;
```

- [ ] **Step 2: Create `types/duffel.ts`**

```typescript
export interface DuffelPlace {
  iata_code: string;
  name:      string;
  city_name: string;
  time_zone: string;
}

export interface DuffelAirline {
  iata_code:        string;
  name:             string;
  logo_symbol_url:  string | null;
  logo_lockup_url:  string | null;
}

export interface DuffelSegmentPassenger {
  passenger_id: string;
  cabin_class:  string;
  baggages: Array<{
    type:     'checked' | 'carry_on';
    quantity: number;
  }>;
}

export interface DuffelSegment {
  id:                string;
  origin:            DuffelPlace;
  destination:       DuffelPlace;
  departing_at:      string;
  arriving_at:       string;
  duration:          string;
  operating_carrier: DuffelAirline;
  marketing_carrier: DuffelAirline;
  flight_number:     string;
  passengers:        DuffelSegmentPassenger[];
}

export interface DuffelSlice {
  id:          string;
  origin:      DuffelPlace;
  destination: DuffelPlace;
  duration:    string;
  segments:    DuffelSegment[];
}

export interface DuffelOffer {
  id:              string;
  total_amount:    string;
  total_currency:  string;
  base_amount:     string;
  tax_amount:      string;
  expires_at:      string;
  conditions: {
    change_before_departure: { allowed: boolean; penalty_amount: string | null } | null;
    refund_before_departure: { allowed: boolean; penalty_amount: string | null } | null;
  };
  slices:      DuffelSlice[];
  passengers:  DuffelOfferPassenger[];
}

export interface DuffelOfferPassenger {
  id:   string;
  type: 'adult' | 'child' | 'infant_without_seat';
}

export interface DuffelOrderPassenger {
  id:                    string;
  title:                 string;
  given_name:            string;
  family_name:           string;
  born_on:               string;
  passport_number:       string;
  passport_country_code: string;
  passport_expiry_date:  string;
  gender:                'm' | 'f';
  email:                 string;
  phone_number:          string;
}

export interface DuffelOrder {
  id:                string;
  booking_reference: string;
  passengers:        DuffelOrderPassenger[];
  slices:            DuffelSlice[];
  documents: Array<{
    type:               string;
    unique_identifier:  string;
  }>;
}
```

- [ ] **Step 3: Create `types/zara.ts`**

```typescript
export type ZaraObservationType =
  | 'corridor_opportunity'
  | 'day_of_week_saving'
  | 'baggage_comparison'
  | 'seasonal_demand'
  | 'hidden_passenger_saving'
  | 'fastest_route'
  | 'booking_validation'
  | 'post_booking_tip';

export type ZaraScreen = 'home' | 'results' | 'review' | 'confirm' | 'post_booking';

export interface ZaraObservation {
  id:        string;
  type:      ZaraObservationType;
  headline:  string;
  body:      string;
  screen:    ZaraScreen;
  priority:  number;
  dismissed: boolean;
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add types/
git commit -m "feat: add TypeScript types for booking, Duffel, and Z@r@"
```

---

### Task 6: Supabase Client

**Files:**
- Create: `lib/supabase.ts`

**Interfaces:**
- Consumes: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` env vars
- Produces: `supabase` — typed Supabase client used by all stores and hooks

- [ ] **Step 1: Create `lib/supabase.ts`**

```typescript
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl      = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:             AsyncStorage,
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  false,
  },
});
```

- [ ] **Step 2: Create a Supabase project** (if not already done)

1. Go to https://supabase.com → New project
2. Copy the Project URL and anon (public) key from Project Settings → API
3. Paste into your `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

- [ ] **Step 3: Verify TypeScript check still passes**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client with AsyncStorage session persistence"
```

---

### Task 7: Auth Store

**Files:**
- Create: `store/auth.store.ts`
- Create: `__tests__/store/auth.store.test.ts`

**Interfaces:**
- Consumes: `supabase` from `@/lib/supabase`, `UserProfile` from `@/types/booking`
- Produces: `useAuthStore()` with `.session`, `.profile`, `.isLoading`, `.error`, `.setSession()`, `.loadProfile()`, `.signIn()`, `.signUp()`, `.signOut()`, `.updateProfile()`, `.clearError()`

- [ ] **Step 1: Write failing tests for auth store**

Create `__tests__/store/auth.store.test.ts`:

```typescript
import { useAuthStore } from '@/store/auth.store';

const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockSingle = jest.fn().mockResolvedValue({ data: null, error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: any[]) => mockSignInWithPassword(...args),
      signUp: (...args: any[]) => mockSignUp(...args),
      signOut: (...args: any[]) => mockSignOut(...args),
    },
    from: (...args: any[]) => {
      mockFrom(...args);
      return { insert: mockInsert, select: mockSelect, update: mockUpdate, eq: mockEq, single: mockSingle };
    },
  },
}));

const mockUpdate = jest.fn().mockReturnThis();

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ session: null, profile: null, isLoading: false, error: null });
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    it('sets error on Supabase auth failure', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        error: { message: 'Invalid login credentials' },
      });
      await useAuthStore.getState().signIn('test@example.com', 'wrong');
      expect(useAuthStore.getState().error).toBe('Invalid login credentials');
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('clears error and sets isLoading=false on success', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({ error: null });
      useAuthStore.setState({ error: 'old error' });
      await useAuthStore.getState().signIn('test@example.com', 'correct');
      expect(useAuthStore.getState().error).toBeNull();
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('sets error to null', () => {
      useAuthStore.setState({ error: 'Something went wrong' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('setSession', () => {
    it('updates session in store', () => {
      const mockSession = { user: { id: 'uid-1' } } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });
  });

  describe('signOut', () => {
    it('clears session and profile', async () => {
      mockSignOut.mockResolvedValueOnce({});
      useAuthStore.setState({
        session: { user: { id: 'uid-1' } } as any,
        profile: { id: 'uid-1', email: 'a@b.com' } as any,
      });
      await useAuthStore.getState().signOut();
      expect(useAuthStore.getState().session).toBeNull();
      expect(useAuthStore.getState().profile).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Run auth store tests — expect FAIL**

```bash
npx jest __tests__/store/auth.store.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '@/store/auth.store'"

- [ ] **Step 3: Create `store/auth.store.ts`**

```typescript
import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types/booking';

interface AuthState {
  session:     Session | null;
  profile:     UserProfile | null;
  isLoading:   boolean;
  error:       string | null;
  setSession:  (session: Session | null) => void;
  loadProfile: () => Promise<void>;
  signIn:      (email: string, password: string) => Promise<void>;
  signUp:      (email: string, password: string, fullName: string) => Promise<void>;
  signOut:     () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearError:  () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session:   null,
  profile:   null,
  isLoading: false,
  error:     null,

  setSession: (session) => set({ session }),

  loadProfile: async () => {
    const { session } = get();
    if (!session?.user) return;
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (data) set({ profile: data as UserProfile });
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    set({ isLoading: false });
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }
    if (data.user) {
      await supabase.from('users').insert({
        id:        data.user.id,
        email,
        full_name: fullName,
      });
    }
    set({ isLoading: false });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (!error && data) set({ profile: data as UserProfile });
  },

  clearError: () => set({ error: null }),
}));
```

- [ ] **Step 4: Run auth store tests — expect PASS**

```bash
npx jest __tests__/store/auth.store.test.ts --no-coverage
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add store/ __tests__/store/
git commit -m "feat: add auth Zustand store with signIn, signUp, signOut, profile loading"
```

---

### Task 8: Auth Screens

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/signup.tsx`

**Interfaces:**
- Consumes: `useAuthStore` from `@/store/auth.store`, `Button` from `@/components/ui/Button`, `Input` from `@/components/ui/Input`
- Produces: `/login` and `/signup` screens navigable via `Link`

- [ ] **Step 1: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create `app/(auth)/login.tsx`**

```tsx
import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing } from '@/constants/design';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const { signIn, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    await signIn(email.trim().toLowerCase(), password);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.pagePadding }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.accent, marginBottom: 4 }}>
            Voya360
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginBottom: 40 }}>
            Sign in to your account
          </Text>

          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            error={error ?? undefined}
          />

          <View style={{ marginTop: 8 }}>
            <Button label="Sign in" onPress={handleLogin} loading={isLoading} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>
              No account?
            </Text>
            <Link href="/(auth)/signup">
              <Text style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: '600' }}>
                Create one
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Create `app/(auth)/signup.tsx`**

```tsx
import { useState } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors, fontSize, spacing } from '@/constants/design';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const { signUp, isLoading, error, clearError } = useAuthStore();

  const canSubmit = fullName.trim().length > 0
    && email.trim().length > 0
    && password.length >= 8;

  const handleSignup = async () => {
    clearError();
    if (!canSubmit) return;
    await signUp(email.trim().toLowerCase(), password, fullName.trim());
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.pagePadding }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 36, fontWeight: '800', color: colors.accent, marginBottom: 4 }}>
            Voya360
          </Text>
          <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginBottom: 40 }}>
            Create your account
          </Text>

          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
          />
          <Input
            label="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={handleSignup}
            error={error ?? undefined}
          />
          {password.length > 0 && password.length < 8 && (
            <Text style={{ fontSize: fontSize.label, color: colors.textMuted, marginTop: -8, marginBottom: 12 }}>
              At least 8 characters
            </Text>
          )}

          <View style={{ marginTop: 8 }}>
            <Button
              label="Create account"
              onPress={handleSignup}
              loading={isLoading}
              disabled={!canSubmit}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              marginTop: 24,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: fontSize.body, color: colors.textMuted }}>
              Already have an account?
            </Text>
            <Link href="/(auth)/login">
              <Text style={{ fontSize: fontSize.body, color: colors.accent, fontWeight: '600' }}>
                Sign in
              </Text>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: add login and signup screens"
```

---

### Task 9: Root Layout + Tab Navigation + Screen Skeletons

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/bookings.tsx`
- Create: `app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: `useAuthStore` for session, `supabase` for auth state listener
- Produces: Complete navigation shell. Unauthenticated users land on `/(auth)/login`. Authenticated users land on `/(tabs)`.

- [ ] **Step 1: Create `app/_layout.tsx`**

```tsx
import './global.css';
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth.store';

export default function RootLayout() {
  const { setSession, loadProfile } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadProfile();
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProfile();
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 2: Create `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/design';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:            false,
        tabBarActiveTintColor:  colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle:            { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create `app/(tabs)/index.tsx`** (search form comes in Phase 2)

```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { colors, fontSize, spacing } from '@/constants/design';

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const firstName = profile?.full_name?.split(' ')[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text }}>
          {firstName ? `Welcome back, ${firstName}` : 'Where to next?'}
        </Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginTop: 8 }}>
          Flight search coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Create `app/(tabs)/bookings.tsx`** (booking list comes in Phase 3)

```tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '@/constants/design';

export default function BookingsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ padding: spacing.pagePadding }}>
        <Text style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text }}>
          Bookings
        </Text>
        <Text style={{ fontSize: fontSize.body, color: colors.textMuted, marginTop: 8 }}>
          Your confirmed tickets will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Create `app/(tabs)/profile.tsx`**

```tsx
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { colors, fontSize, spacing } from '@/constants/design';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.pagePadding }}>
        <Text
          style={{ fontSize: fontSize.header, fontWeight: '700', color: colors.text, marginBottom: 24 }}
        >
          Profile
        </Text>

        {profile && (
          <View style={{ marginBottom: 32 }}>
            <ProfileRow label="Name"        value={profile.full_name ?? '—'} />
            <ProfileRow label="Email"       value={profile.email} />
            <ProfileRow
              label="Home route"
              value={
                profile.home_origin && profile.home_destination
                  ? `${profile.home_origin} ↔ ${profile.home_destination}`
                  : 'Not set'
              }
            />
            <ProfileRow label="Default bags" value={`${profile.default_bag_count} checked bag${profile.default_bag_count !== 1 ? 's' : ''}`} />
            <ProfileRow label="Meal preference" value={profile.dietary_preference ?? 'Not set'} />
          </View>
        )}

        <Button label="Sign out" onPress={handleSignOut} variant="secondary" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: fontSize.label, color: colors.textMuted }}>{label}</Text>
      <Text style={{ fontSize: fontSize.body, color: colors.text, marginTop: 2 }}>{value}</Text>
    </View>
  );
}
```

- [ ] **Step 6: Run full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass (Button: 5, Input: 4, auth store: 4).

- [ ] **Step 7: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Start dev server and test on device/simulator**

```bash
npx expo start --clear
```

Manual test checklist:
- [ ] Cold start shows login screen within 2 seconds
- [ ] Signing up with a new email creates a user in Supabase dashboard → Authentication → Users
- [ ] After signup, app navigates to Home tab showing the user's first name
- [ ] Profile tab shows name, email, and defaults
- [ ] Sign out returns to login screen
- [ ] Signing in again returns to Home tab

- [ ] **Step 9: Final commit**

```bash
git add app/
git commit -m "feat: add root layout with auth gate, tab navigation, and profile screen"
```

---

## Phase 1 Deliverable Checklist

- [ ] `npx expo start --clear` runs without errors
- [ ] Login and signup screens work end-to-end with Supabase
- [ ] Authenticated users see Home / Bookings / Profile tabs
- [ ] Profile screen displays user data from Supabase `users` table
- [ ] Sign out clears session and returns to login
- [ ] All 13 unit tests pass (`npx jest --no-coverage`)
- [ ] `npx tsc --noEmit` exits clean
- [ ] `.env.local` is in `.gitignore` (never committed)
- [ ] 6 Supabase tables created with RLS active

**Next phase:** `docs/superpowers/plans/2026-06-28-phase-2-duffel-search-results.md`
