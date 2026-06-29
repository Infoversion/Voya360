import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { VoyaCard } from '@/components/voya/VoyaCard';
import type { VoyaObservation } from '@/types/voya';

const obs: VoyaObservation = {
  id: 'test-1',
  type: 'corridor_opportunity',
  headline: 'Prices dropping on JFK → DEL',
  body: 'We noticed fares on your home corridor have dropped 18% this week.',
  screen: 'home',
  priority: 1,
  dismissed: false,
};

describe('VoyaCard', () => {
  it('renders the headline and body', async () => {
    const { getByText } = await render(<VoyaCard observation={obs} onDismiss={() => {}} />);
    expect(getByText('Prices dropping on JFK → DEL')).toBeTruthy();
    expect(getByText(/dropped 18%/)).toBeTruthy();
  });

  it('calls onDismiss when the dismiss button is tapped', async () => {
    const onDismiss = jest.fn();
    const { getByText } = await render(<VoyaCard observation={obs} onDismiss={onDismiss} />);
    fireEvent.press(getByText('×'));
    await waitFor(() => expect(onDismiss).toHaveBeenCalledWith('test-1'));
  });
});
