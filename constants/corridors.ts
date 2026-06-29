export interface Corridor {
  origin:      string;
  destination: string;
  label:       string;
}

export const TOP_CORRIDORS: Corridor[] = [
  // US ↔ India
  { origin: 'JFK', destination: 'DEL', label: 'New York → Delhi' },
  { origin: 'JFK', destination: 'BOM', label: 'New York → Mumbai' },
  { origin: 'JFK', destination: 'HYD', label: 'New York → Hyderabad' },
  { origin: 'JFK', destination: 'MAA', label: 'New York → Chennai' },
  { origin: 'JFK', destination: 'BLR', label: 'New York → Bangalore' },
  { origin: 'ORD', destination: 'DEL', label: 'Chicago → Delhi' },
  { origin: 'ORD', destination: 'BOM', label: 'Chicago → Mumbai' },
  { origin: 'SFO', destination: 'DEL', label: 'San Francisco → Delhi' },
  { origin: 'SFO', destination: 'BOM', label: 'San Francisco → Mumbai' },
  { origin: 'SFO', destination: 'BLR', label: 'San Francisco → Bangalore' },
  { origin: 'LAX', destination: 'DEL', label: 'Los Angeles → Delhi' },
  { origin: 'LAX', destination: 'BOM', label: 'Los Angeles → Mumbai' },
  // US ↔ Pakistan
  { origin: 'JFK', destination: 'KHI', label: 'New York → Karachi' },
  { origin: 'JFK', destination: 'LHE', label: 'New York → Lahore' },
  { origin: 'JFK', destination: 'ISB', label: 'New York → Islamabad' },
  { origin: 'ORD', destination: 'ISB', label: 'Chicago → Islamabad' },
  // US ↔ Bangladesh
  { origin: 'JFK', destination: 'DAC', label: 'New York → Dhaka' },
  // US ↔ Philippines
  { origin: 'LAX', destination: 'MNL', label: 'Los Angeles → Manila' },
  { origin: 'SFO', destination: 'MNL', label: 'San Francisco → Manila' },
  // US ↔ Sri Lanka
  { origin: 'JFK', destination: 'CMB', label: 'New York → Colombo' },
  // US ↔ Nepal
  { origin: 'JFK', destination: 'KTM', label: 'New York → Kathmandu' },
  // UK ↔ India
  { origin: 'LHR', destination: 'DEL', label: 'London → Delhi' },
  { origin: 'LHR', destination: 'BOM', label: 'London → Mumbai' },
  { origin: 'LHR', destination: 'HYD', label: 'London → Hyderabad' },
  { origin: 'LHR', destination: 'MAA', label: 'London → Chennai' },
  { origin: 'LHR', destination: 'BLR', label: 'London → Bangalore' },
  { origin: 'LHR', destination: 'CCU', label: 'London → Kolkata' },
  // UK ↔ Pakistan
  { origin: 'LHR', destination: 'KHI', label: 'London → Karachi' },
  { origin: 'LHR', destination: 'LHE', label: 'London → Lahore' },
  { origin: 'LHR', destination: 'ISB', label: 'London → Islamabad' },
  // Canada ↔ India
  { origin: 'YYZ', destination: 'DEL', label: 'Toronto → Delhi' },
  { origin: 'YYZ', destination: 'BOM', label: 'Toronto → Mumbai' },
  { origin: 'YVR', destination: 'DEL', label: 'Vancouver → Delhi' },
  // US/UK ↔ UAE
  { origin: 'JFK', destination: 'DXB', label: 'New York → Dubai' },
  { origin: 'LHR', destination: 'DXB', label: 'London → Dubai' },
  { origin: 'JFK', destination: 'AUH', label: 'New York → Abu Dhabi' },
  // US/UK ↔ Singapore
  { origin: 'JFK', destination: 'SIN', label: 'New York → Singapore' },
  { origin: 'LHR', destination: 'SIN', label: 'London → Singapore' },
  { origin: 'LAX', destination: 'SIN', label: 'Los Angeles → Singapore' },
  // US/UK ↔ Malaysia
  { origin: 'JFK', destination: 'KUL', label: 'New York → Kuala Lumpur' },
  { origin: 'LHR', destination: 'KUL', label: 'London → Kuala Lumpur' },
];

export const PREFERRED_TRANSIT_HUBS = ['DXB', 'DOH', 'IST'];
export const AVOIDED_TRANSIT_HUBS   = ['CDG', 'FCO', 'MXP'];
