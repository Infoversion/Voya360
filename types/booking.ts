export type DietaryPreference = 'vegetarian' | 'halal' | 'kosher' | 'vegan' | 'none';
export type SeatPreference    = 'window' | 'aisle' | 'none';
export type BookingStatus     = 'confirmed' | 'cancelled' | 'refunded' | 'return_cancelled';
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
  push_token:          string | null;
  avatar_url:          string | null;
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
  gender:             'm' | 'f' | null;
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
  e_ticket_url:               string | null;
  stripe_payment_intent_id:   string | null;
  created_at:                 string;
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
