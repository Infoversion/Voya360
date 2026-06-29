export type VoyaObservationType =
  | 'corridor_opportunity'
  | 'day_of_week_saving'
  | 'baggage_comparison'
  | 'seasonal_demand'
  | 'hidden_passenger_saving'
  | 'fastest_route'
  | 'booking_validation'
  | 'post_booking_tip';

export type VoyaScreen = 'home' | 'results' | 'review' | 'passengers' | 'confirm' | 'post_booking';

export interface VoyaObservation {
  id:        string;
  type:      VoyaObservationType;
  headline:  string;
  body:      string;
  screen:    VoyaScreen;
  priority:  number;
  dismissed: boolean;
}

export const VOYA_SCREEN_MAP: Record<VoyaObservationType, VoyaScreen> = {
  corridor_opportunity:    'home',
  day_of_week_saving:      'results',
  baggage_comparison:      'review',
  seasonal_demand:         'results',
  hidden_passenger_saving: 'passengers',
  fastest_route:           'results',
  booking_validation:      'confirm',
  post_booking_tip:        'post_booking',
};
