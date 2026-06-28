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
