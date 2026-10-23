import { BloodGroup, BloodCompatibilityInfo } from '../types';

// Standard red-cell compatibility chart (reference information, not sample data).
export const BLOOD_COMPATIBILITY_DATA: Record<BloodGroup, BloodCompatibilityInfo> = {
  'O-': {
    group: 'O-',
    canGiveTo: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    canReceiveFrom: ['O-'],
    description: 'Commonly known as the universal red-cell donor type. Crucial in trauma emergencies when the recipient’s blood type is unknown.',
    populationPercentage: 'Approx. 7% of population',
    universalNote: 'Universal Red Cell Donor'
  },
  'O+': {
    group: 'O+',
    canGiveTo: ['A+', 'B+', 'AB+', 'O+'],
    canReceiveFrom: ['O+', 'O-'],
    description: 'The most commonly transfused red blood cell type, playing a vital role in routine operations and emergency response.',
    populationPercentage: 'Approx. 37% of population'
  },
  'A-': {
    group: 'A-',
    canGiveTo: ['A+', 'A-', 'AB+', 'AB-'],
    canReceiveFrom: ['A-', 'O-'],
    description: 'Can donate red blood cells to individuals with types A and AB (both positive and negative).',
    populationPercentage: 'Approx. 6% of population'
  },
  'A+': {
    group: 'A+',
    canGiveTo: ['A+', 'AB+'],
    canReceiveFrom: ['A+', 'A-', 'O+', 'O-'],
    description: 'One of the most widely requested blood types. Platelets from A+ donors can help treat oncology patients.',
    populationPercentage: 'Approx. 34% of population'
  },
  'B-': {
    group: 'B-',
    canGiveTo: ['B+', 'B-', 'AB+', 'AB-'],
    canReceiveFrom: ['B-', 'O-'],
    description: 'A rarer blood type that is critically needed for sickle cell and chronic transfusion patients.',
    populationPercentage: 'Approx. 2% of population'
  },
  'B+': {
    group: 'B+',
    canGiveTo: ['B+', 'AB+'],
    canReceiveFrom: ['B+', 'B-', 'O+', 'O-'],
    description: 'Highly valuable in hospital surgery banks and regional emergency blood inventories.',
    populationPercentage: 'Approx. 10% of population'
  },
  'AB-': {
    group: 'AB-',
    canGiveTo: ['AB+', 'AB-'],
    canReceiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    description: 'The rarest blood type among the general population. Universal plasma donor candidate.',
    populationPercentage: 'Approx. 1% of population'
  },
  'AB+': {
    group: 'AB+',
    canGiveTo: ['AB+'],
    canReceiveFrom: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    description: 'Commonly known as the universal red-cell recipient. AB+ patients can receive red blood cells of any type safely.',
    populationPercentage: 'Approx. 3% of population',
    universalNote: 'Universal Red Cell Recipient'
  }
};
