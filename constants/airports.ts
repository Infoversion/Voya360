import { AirportOption } from '@/store/search.store';

interface AirportEntry extends AirportOption {
  lat: number;
  lng: number;
}

const AIRPORTS: AirportEntry[] = [
  // US
  { iata: 'JFK', name: 'John F. Kennedy International',    city: 'New York',       country: 'US', lat: 40.6413,  lng: -73.7781  },
  { iata: 'EWR', name: 'Newark Liberty International',     city: 'Newark',         country: 'US', lat: 40.6895,  lng: -74.1745  },
  { iata: 'ORD', name: "O'Hare International",             city: 'Chicago',        country: 'US', lat: 41.9742,  lng: -87.9073  },
  { iata: 'SFO', name: 'San Francisco International',      city: 'San Francisco',  country: 'US', lat: 37.6213,  lng: -122.3790 },
  { iata: 'LAX', name: 'Los Angeles International',        city: 'Los Angeles',    country: 'US', lat: 33.9416,  lng: -118.4085 },
  { iata: 'IAD', name: 'Dulles International',             city: 'Washington DC',  country: 'US', lat: 38.9531,  lng: -77.4565  },
  { iata: 'IAH', name: 'George Bush Intercontinental',     city: 'Houston',        country: 'US', lat: 29.9902,  lng: -95.3368  },
  { iata: 'DFW', name: 'Dallas/Fort Worth International',  city: 'Dallas',         country: 'US', lat: 32.8998,  lng: -97.0403  },
  { iata: 'ATL', name: 'Hartsfield-Jackson Atlanta',       city: 'Atlanta',        country: 'US', lat: 33.6407,  lng: -84.4277  },
  { iata: 'BOS', name: 'Logan International',              city: 'Boston',         country: 'US', lat: 42.3656,  lng: -71.0096  },
  { iata: 'SEA', name: 'Seattle-Tacoma International',     city: 'Seattle',        country: 'US', lat: 47.4502,  lng: -122.3088 },
  { iata: 'MIA', name: 'Miami International',              city: 'Miami',          country: 'US', lat: 25.7959,  lng: -80.2870  },
  // UK
  { iata: 'LHR', name: 'Heathrow',                         city: 'London',         country: 'GB', lat: 51.4700,  lng: -0.4543   },
  { iata: 'LGW', name: 'Gatwick',                          city: 'London',         country: 'GB', lat: 51.1537,  lng: -0.1821   },
  { iata: 'MAN', name: 'Manchester',                       city: 'Manchester',     country: 'GB', lat: 53.3537,  lng: -2.2750   },
  { iata: 'BHX', name: 'Birmingham',                       city: 'Birmingham',     country: 'GB', lat: 52.4539,  lng: -1.7480   },
  // Canada
  { iata: 'YYZ', name: 'Toronto Pearson',                  city: 'Toronto',        country: 'CA', lat: 43.6777,  lng: -79.6248  },
  { iata: 'YVR', name: 'Vancouver International',          city: 'Vancouver',      country: 'CA', lat: 49.1967,  lng: -123.1815 },
  { iata: 'YUL', name: 'Montréal-Trudeau',                 city: 'Montreal',       country: 'CA', lat: 45.4706,  lng: -73.7408  },
  // India
  { iata: 'DEL', name: 'Indira Gandhi International',      city: 'Delhi',          country: 'IN', lat: 28.5562,  lng: 77.1000   },
  { iata: 'BOM', name: 'Chhatrapati Shivaji Maharaj',      city: 'Mumbai',         country: 'IN', lat: 19.0896,  lng: 72.8656   },
  { iata: 'HYD', name: 'Rajiv Gandhi International',       city: 'Hyderabad',      country: 'IN', lat: 17.2403,  lng: 78.4294   },
  { iata: 'MAA', name: 'Chennai International',            city: 'Chennai',        country: 'IN', lat: 12.9941,  lng: 80.1709   },
  { iata: 'BLR', name: 'Kempegowda International',         city: 'Bangalore',      country: 'IN', lat: 13.1979,  lng: 77.7063   },
  { iata: 'CCU', name: 'Netaji Subhas Chandra Bose',       city: 'Kolkata',        country: 'IN', lat: 22.6520,  lng: 88.4463   },
  { iata: 'COK', name: 'Cochin International',             city: 'Kochi',          country: 'IN', lat: 10.1520,  lng: 76.4019   },
  { iata: 'AMD', name: 'Sardar Vallabhbhai Patel',         city: 'Ahmedabad',      country: 'IN', lat: 23.0771,  lng: 72.6347   },
  // Pakistan
  { iata: 'KHI', name: 'Jinnah International',             city: 'Karachi',        country: 'PK', lat: 24.9065,  lng: 67.1608   },
  { iata: 'LHE', name: 'Allama Iqbal International',       city: 'Lahore',         country: 'PK', lat: 31.5216,  lng: 74.4036   },
  { iata: 'ISB', name: 'Islamabad International',          city: 'Islamabad',      country: 'PK', lat: 33.6167,  lng: 73.0994   },
  { iata: 'PEW', name: 'Peshawar International',           city: 'Peshawar',       country: 'PK', lat: 33.9939,  lng: 71.5146   },
  // Bangladesh
  { iata: 'DAC', name: 'Hazrat Shahjalal International',   city: 'Dhaka',          country: 'BD', lat: 23.8433,  lng: 90.3978   },
  // Sri Lanka
  { iata: 'CMB', name: 'Bandaranaike International',       city: 'Colombo',        country: 'LK', lat: 7.1807,   lng: 79.8841   },
  // Nepal
  { iata: 'KTM', name: 'Tribhuvan International',          city: 'Kathmandu',      country: 'NP', lat: 27.6966,  lng: 85.3591   },
  // Philippines
  { iata: 'MNL', name: 'Ninoy Aquino International',       city: 'Manila',         country: 'PH', lat: 14.5086,  lng: 121.0198  },
  { iata: 'CEB', name: 'Mactan-Cebu International',        city: 'Cebu',           country: 'PH', lat: 10.3075,  lng: 123.9795  },
  // UAE
  { iata: 'DXB', name: 'Dubai International',              city: 'Dubai',          country: 'AE', lat: 25.2532,  lng: 55.3657   },
  { iata: 'AUH', name: 'Abu Dhabi International',          city: 'Abu Dhabi',      country: 'AE', lat: 24.4330,  lng: 54.6511   },
  { iata: 'SHJ', name: 'Sharjah International',            city: 'Sharjah',        country: 'AE', lat: 25.3286,  lng: 55.5136   },
  // Singapore
  { iata: 'SIN', name: 'Changi',                           city: 'Singapore',      country: 'SG', lat: 1.3644,   lng: 103.9915  },
  // Malaysia
  { iata: 'KUL', name: 'Kuala Lumpur International',       city: 'Kuala Lumpur',   country: 'MY', lat: 2.7456,   lng: 101.7099  },
  // Qatar (hub)
  { iata: 'DOH', name: 'Hamad International',              city: 'Doha',           country: 'QA', lat: 25.2732,  lng: 51.6082   },
  // Turkey (hub)
  { iata: 'IST', name: 'Istanbul Airport',                 city: 'Istanbul',       country: 'TR', lat: 41.2608,  lng: 28.7418   },
  // Other key hubs
  { iata: 'CDG', name: 'Charles de Gaulle',                city: 'Paris',          country: 'FR', lat: 49.0097,  lng: 2.5479    },
  { iata: 'AMS', name: 'Amsterdam Schiphol',               city: 'Amsterdam',      country: 'NL', lat: 52.3086,  lng: 4.7639    },
  { iata: 'FRA', name: 'Frankfurt',                        city: 'Frankfurt',      country: 'DE', lat: 50.0379,  lng: 8.5622    },
  { iata: 'HKG', name: 'Hong Kong International',          city: 'Hong Kong',      country: 'HK', lat: 22.3080,  lng: 113.9185  },
  { iata: 'BKK', name: 'Suvarnabhumi',                     city: 'Bangkok',        country: 'TH', lat: 13.6900,  lng: 100.7501  },
];

export function searchAirports(query: string): AirportOption[] {
  if (query.length < 2) return [];
  const q = query.toLowerCase();
  return AIRPORTS.filter(a =>
    a.iata.toLowerCase().startsWith(q) ||
    a.city.toLowerCase().includes(q) ||
    a.name.toLowerCase().includes(q) ||
    a.country.toLowerCase() === q,
  ).slice(0, 8);
}

// Haversine distance in km
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371;
  const dL = (lat2 - lat1) * Math.PI / 180;
  const dG = (lng2 - lng1) * Math.PI / 180;
  const a  = Math.sin(dL / 2) ** 2 +
             Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getNearestAirport(lat: number, lng: number): AirportOption | null {
  let nearest: AirportEntry | null = null;
  let minDist = Infinity;
  for (const airport of AIRPORTS) {
    const d = distanceKm(lat, lng, airport.lat, airport.lng);
    if (d < minDist) { minDist = d; nearest = airport; }
  }
  if (!nearest) return null;
  // Return without the lat/lng fields (AirportOption shape)
  const { lat: _lat, lng: _lng, ...option } = nearest;
  return option;
}
