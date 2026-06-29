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

export const VOYA_SCREEN_MAP: Record<VoyaObservationType, VoyaScreen> = {
  corridor_opportunity:    'home',
  day_of_week_saving:      'results',
  seasonal_demand:         'results',
  fastest_route:           'results',
  baggage_comparison:      'review',
  hidden_passenger_saving: 'passengers',
  booking_validation:      'confirm',
  post_booking_tip:        'post_booking',
};

export interface VoyaObservation {
  id:        string;
  type:      VoyaObservationType;
  headline:  string;
  body:      string;
  screen:    VoyaScreen;
  priority:  number;
  dismissed: boolean;
}
