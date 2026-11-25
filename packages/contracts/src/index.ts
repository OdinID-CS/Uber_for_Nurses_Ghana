// Core domain statuses & availability
export type NurseAvailability = 'OFFLINE' | 'ONLINE_NOW' | 'SCHEDULED' | 'BUSY';
export type CareRequestStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'SEARCHING'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'NO_NURSE_FOUND'
  | 'CANCELLED'
  | 'DISPUTED';
export type OfferStatus = 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CLOSED';

// Nurse Credential & Verification
export type CredentialStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface NurseVerificationProfile {
  nurseId: string;
  fullName: string;
  cadre: string;
  nmcLicenseNumber: string;
  licenseExpiry: string;
  status: CredentialStatus;
  documentUrls: string[];
  skills: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// Client Booking & Request
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CreateCareRequest {
  quoteId: string;
  serviceId: string;
  scheduledStart: string;
  durationMinutes: number;
  location: Coordinates;
  addressPrivate: string;
  landmark?: string;
  accessInstructions?: string;
  careSummaryPrivate?: string;
  recipientDisplayName: string;
  recipientPhone: string;
}

export interface CareQuote {
  quoteId: string;
  serviceId: string;
  serviceDescription: string;
  currency: 'GHS';
  serviceAmountMinor: number;
  travelFeeMinor: number;
  totalAmountMinor: number;
  quoteExpiresAt: string;
  cancellationTermsVersion: string;
}

// Dispatch & Offers
export interface NurseOffer {
  offerId: string;
  bookingId: string;
  roundId: string;
  nurseId: string;
  status: OfferStatus;
  serviceLabel: string;
  generalArea: string;
  scheduledStart: string;
  durationMinutes: number;
  estimatedTravelMinutes: number;
  nurseEarningMinor: number;
  currency: 'GHS';
  requiredSkillLabels: string[];
  expiresAt: string;
  createdAt: string;
}

export interface AcceptOfferResult {
  accepted: boolean;
  bookingId?: string;
  assignedNurseId?: string;
  visitPin?: string;
  reason?: 'OFFER_EXPIRED' | 'ALREADY_ASSIGNED' | 'NO_LONGER_ELIGIBLE' | 'OFFER_CLOSED';
}

// In-Visit Protocol & Clinical Safety
export interface VitalsReading {
  bloodPressure?: string;
  heartRateBpm?: number;
  temperatureCelsius?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodGlucoseMmol?: number;
}

export interface ClinicalVisitChecklist {
  bookingId: string;
  nurseId: string;
  vitals: VitalsReading;
  procedureSummary: string;
  woundDressingType?: string;
  patientObservations: string;
  adverseEventsNotes?: string;
  escalationRequired: boolean;
  completedAt: string;
}

export interface IncidentReport {
  incidentId: string;
  bookingId: string;
  reportedByUserId: string;
  category: 'CLINICAL_DETERIORATION' | 'SAFETY_CONCERN' | 'LATE_ARRIVAL' | 'BILLING' | 'DISPUTE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  actionTaken?: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  reportedAt: string;
}

// Payments & Ledger
export type PaymentProvider = 'PAYSTACK' | 'HUBTEL';
export type MobileMoneyNetwork = 'MTN' | 'TELECEL' | 'AIRTELTIGO';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'CAPTURED' | 'REFUNDED' | 'FAILED';

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  provider: PaymentProvider;
  providerReference: string;
  amountMinor: number;
  currency: 'GHS';
  status: PaymentStatus;
  nursePayoutMinor: number;
  platformFeeMinor: number;
  customerMomoNumber?: string;
  network?: MobileMoneyNetwork;
  createdAt: string;
  capturedAt?: string;
}
