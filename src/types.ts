export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'Normal' | 'Urgent' | 'Critical';

export type AvailabilityStatus = 'Available' | 'Unavailable' | 'Recently Donated';

export type Language = 'en' | 'bn';

export type InventoryStatus = 'Available' | 'High Demand' | 'Low' | 'Critical';

export interface Donor {
  travelKm?: number;
  id: string;
  name: string;
  bloodGroup: BloodGroup;
  location: string;
  city: string;
  distanceKm: number;
  availability: AvailabilityStatus;
  matchPercentage: number;
  lastDonationDate: string;
  totalDonations: number;
  phone: string;
  email: string;
  verified: boolean;
  eligibleUntil?: string;
  bio?: string;
}

export interface BloodRequest {
  id: string;
  patientName: string;
  bloodGroup: BloodGroup;
  unitsNeeded: number;
  hospitalName: string;
  city: string;
  urgency: UrgencyLevel;
  deadline: string;
  reason: string;
  status: 'Pending' | 'In Progress' | 'Fulfilled' | 'Cancelled' | 'Expired';
  userId?: string;
  displayStatus?: string;
  contactPerson: string;
  contactPhone: string;
  createdAt: string;
  responsesCount: number;
}

export interface BloodCenter {
  id: string;
  name: string;
  address: string;
  city: string;
  distanceKm: number;
  phone: string;
  openHours: string;
  emergency24x7: boolean;
  totalUnits: number;
  availableGroups: BloodGroup[];
  coordinates?: { x?: number; y?: number; lat?: number | null; lng?: number | null }; // lat/lng are real map coordinates; null = no pin saved yet
  bloodGroupsAvailable?: BloodGroup[];
  category?: string;
  emergencyPhone?: string;
  type?: string;
  verified?: boolean;
}

export interface InventoryItem {
  bloodGroup: BloodGroup;
  availableUnits: number;
  reservedUnits: number;
  status: InventoryStatus;
  lastUpdated: string;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  bloodGroup: BloodGroup;
  centerName: string;
  date: string;
  units: number;
  status: 'Completed' | 'Scheduled' | 'Verified';
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'pending' | 'donor' | 'requester' | 'admin';
  bloodGroup?: BloodGroup;
  age?: number;
  radiusKm?: number;
  emailVerified?: boolean;
  profileCompleted?: boolean;
  city?: string;
  location?: string;
  phone?: string;
  totalDonations?: number;
  lastDonation?: string;
  availability?: AvailabilityStatus;
}

export type NavView = 
  | 'home' 
  | 'find-blood' 
  | 'donate' 
  | 'onboarding' 
  | 'requester-dashboard' 
  | 'requests' 
  | 'centers' 
  | 'about' 
  | 'donor-dashboard' 
  | 'admin-dashboard'
  | 'shared-request';

export type Theme = 'light' | 'dark';

export interface BloodCompatibilityInfo {
  group: BloodGroup;
  canGiveTo: BloodGroup[];
  canReceiveFrom: BloodGroup[];
  description: string;
  populationPercentage: string;
  universalNote?: string;
}

export interface BloodRequestResponse {
  id: string;
  requestId: string;
  donorId: string;
  requesterId?: string;
  status: 'pending' | 'accepted' | 'booked' | 'claimed' | 'completed' | 'declined' | 'cancelled';
  message: string;
  createdAt: string;
  updatedAt?: string;
  donorClaimedAt?: string | null;
  donor?: Donor;
  request?: Partial<BloodRequest>;
}

export interface AppNotification {
  id: string;
  userId: string;
  requestId?: string;
  responseId?: string;
  type: 'request_match' | 'donor_responded' | 'response_status' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  request?: Partial<BloodRequest>;
  response?: Partial<BloodRequestResponse>;
}

