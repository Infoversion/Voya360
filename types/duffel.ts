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

export interface DuffelCabinAmenities {
  seat?:  { pitch: string | null; legroom: string | null; type: string | null } | null;
  wifi?:  { available: boolean; cost: string | null } | null;
  power?: { available: boolean } | null;
}

export interface DuffelSegmentPassenger {
  passenger_id: string;
  cabin_class:  string;
  cabin?: {
    marketing_name?: string | null;
    name?:           string | null;
    amenities?:      DuffelCabinAmenities | null;
  } | null;
  baggages: Array<{
    type:               'checked' | 'carry_on';
    quantity:           number;
    maximum_weight_kg?: number | null;
  }>;
}

export interface DuffelSegment {
  id:                               string;
  origin:                           DuffelPlace;
  destination:                      DuffelPlace;
  departing_at:                     string;
  arriving_at:                      string;
  duration:                         string;
  operating_carrier:                DuffelAirline;
  marketing_carrier:                DuffelAirline;
  marketing_carrier_flight_number:  string;
  origin_terminal?:                 string | null;
  destination_terminal?:            string | null;
  passengers:                       DuffelSegmentPassenger[];
  aircraft?:                        { iata_code: string; name: string } | null;
}

export interface DuffelSliceConditions {
  change_before_departure?: { allowed: boolean; penalty_amount: string | null } | null;
  priority_check_in?:       boolean | null;
  priority_boarding?:       boolean | null;
  advance_seat_selection?:  boolean | null;
}

export interface DuffelSlice {
  id:               string;
  origin:           DuffelPlace;
  destination:      DuffelPlace;
  duration:         string;
  fare_brand_name?: string | null;
  conditions?:      DuffelSliceConditions | null;
  segments:         DuffelSegment[];
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
  id:                          string;
  type:                        'adult' | 'child' | 'infant_without_seat';
  cabin_class_marketing_name?: string | null;
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
