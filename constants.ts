
import { Hospital } from './types';

const now = new Date();

export const INITIAL_HOSPITALS: Hospital[] = [
  {
    id: 'h1',
    name: 'Sanjay Gandhi Postgraduate Institute (SGPGI)',
    address: 'Raebareli Rd, Lucknow, Uttar Pradesh',
    lat: 26.7431,
    lng: 80.9385,
    contact: '0522 266 8700',
    lastUpdated: new Date(now.getTime() - 1000 * 60 * 5),
    establishmentYear: 1983,
    achievements: [
      "Ranked among the top medical institutes in India by NIRF.",
      "Pioneer in Organ Transplant and Tertiary Care in North India.",
      "First public hospital to implement a comprehensive HIS (Hospital Information System)."
    ],
    generalBeds: { total: 200, available: 15 },
    icuBeds: { total: 50, available: 4 },
    distance: 0
  },
  {
    id: 'h2',
    name: 'King George\'s Medical University (KGMU)',
    address: 'Shah Mina Rd, Chowk, Lucknow',
    lat: 26.8687,
    lng: 80.9168,
    contact: '0522 225 7450',
    lastUpdated: new Date(now.getTime() - 1000 * 60 * 12),
    establishmentYear: 1905,
    achievements: [
      "One of the oldest and most prestigious medical universities in India.",
      "Heritage campus with over 100 years of medical excellence.",
      "Largest public sector medical infrastructure in Uttar Pradesh."
    ],
    generalBeds: { total: 500, available: 0 },
    icuBeds: { total: 100, available: 2 },
    distance: 0
  },
  {
    id: 'h3',
    name: 'Medanta Hospital Lucknow',
    address: 'Sector A, Pocket 1, Sushant Golf City',
    lat: 26.7725,
    lng: 81.0028,
    contact: '0522 450 5050',
    lastUpdated: new Date(now.getTime() - 1000 * 60 * 2),
    establishmentYear: 2019,
    achievements: [
      "State-of-the-art super specialty facility with 1000+ beds capacity.",
      "World-class Robotic Surgery and Cardiac Science center.",
      "JCI and NABH accredited international healthcare standards."
    ],
    generalBeds: { total: 300, available: 85 },
    icuBeds: { total: 80, available: 12 },
    distance: 0
  },
  {
    id: 'h4',
    name: 'Apollomedics Super Speciality Hospital',
    address: 'Kanpur - Lucknow Rd, Sector B, Bargawan',
    lat: 26.7891, // Refined: Move from residential Hind Nagar (26.7871) to exact hospital gate
    lng: 80.8943, // Refined: Direct entrance on Kanpur Road
    contact: '0522 678 8888',
    lastUpdated: new Date(now.getTime() - 1000 * 60 * 30),
    establishmentYear: 2019,
    achievements: [
      "Advanced Trauma and emergency care hub in Lucknow.",
      "Multi-disciplinary approach for complex oncology and neurology cases.",
      "Digital healthcare integration with Apollo's global network."
    ],
    generalBeds: { total: 150, available: 8 },
    icuBeds: { total: 35, available: 1 },
    distance: 0
  },
  {
    id: 'h5',
    name: 'Ram Manohar Lohia Institute (RMLIMS)',
    address: 'Vibhuti Khand, Gomti Nagar, Lucknow',
    lat: 26.8624,
    lng: 81.0020,
    contact: '0522 669 2000',
    lastUpdated: new Date(now.getTime() - 1000 * 60 * 8),
    establishmentYear: 2006,
    achievements: [
      "Premier autonomous institute of the Government of Uttar Pradesh.",
      "Leader in specialized Neurosciences and Cardiology in Gomti Nagar.",
      "Rapidly expanding research wing and postgraduate teaching facility."
    ],
    generalBeds: { total: 250, available: 5 },
    icuBeds: { total: 40, available: 0 },
    distance: 0
  }
];

export const COLORS = {
  high: 'bg-emerald-500',
  medium: 'bg-amber-500',
  low: 'bg-rose-500',
  none: 'bg-slate-400'
};
