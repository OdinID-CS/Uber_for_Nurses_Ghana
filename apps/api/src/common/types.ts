export type AvailabilityMode = 'ONLINE_NOW' | 'OFFLINE';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface NurseAvailability {
  nurseId: string;
  mode: AvailabilityMode;
  serviceZoneIds: string[];
  maxTravelKm: number;
  acceptedServiceIds: string[];
  locationConsent: boolean;
  updatedAt: string;
}

export interface NursePresence {
  nurseId: string;
  coordinates: Coordinates;
  capturedAt: string;
  accuracyMeters: number;
}

export type CredentialStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface NurseProfile {
  id: string;
  displayName: string;
  cadre: string;
  credentialNumber: string;
  credentialStatus: CredentialStatus;
  documentUrls?: string[];
  skills: string[];
  rating: number;
  phone: string;
  momoNumber?: string;
  availability: NurseAvailability;
  presence?: NursePresence;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface CareQuoteRequest {
  serviceId: string;
  scheduledStart: string;
  location: Coordinates;
  landmark?: string;
  durationMinutes: number;
}

export interface CareQuoteResponse {
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

export interface CareRequestInput {
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
  recipientPhone?: string;
}

export type BookingStatus =
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

export type OfferStatus = 'OPEN' | 'ACCEPTED' | 'DECLINED' | 'CLOSED' | 'EXPIRED';

export interface OfferPayload {
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
  respondedAt?: string;
}

export interface ClinicalVitals {
  bloodPressure?: string;
  heartRateBpm?: number;
  temperatureCelsius?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodGlucoseMmol?: number;
}

export interface ClinicalChecklistInput {
  vitals?: ClinicalVitals;
  procedureSummary: string;
  woundDressingType?: string;
  patientObservations: string;
  adverseEventsNotes?: string;
  escalationRequired?: boolean;
}

export interface Booking {
  id: string;
  quoteId: string;
  serviceId: string;
  status: BookingStatus;
  version: number;
  scheduledStart: string;
  durationMinutes: number;
  location: Coordinates;
  landmark?: string;
  recipientDisplayName: string;
  recipientPhone?: string;
  addressPrivate: string;
  accessInstructions?: string;
  careSummaryPrivate?: string;
  totalAmountMinor: number;
  currency: 'GHS';
  visitPin?: string;
  assignedNurseId?: string;
  assignedNurse?: {
    nurseId: string;
    displayName: string;
    cadre: string;
    rating: number;
    phone?: string;
  };
  acceptedAt?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  cancelledAt?: string;
  clinicalRecord?: ClinicalChecklistInput & { completedAt: string };
  createdAt: string;
  updatedAt: string;
}

export interface DispatchRound {
  id: string;
  bookingId: string;
  sequence: number;
  radiusKm: number;
  offers: OfferPayload[];
  status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export interface OutboxEvent {
  eventId: string;
  type: string;
  aggregateId: string;
  version: number;
  occurredAt: string;
  data: Record<string, any>;
}

export type PaymentProvider = 'PAYSTACK' | 'HUBTEL';
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
  network?: string;
  createdAt: string;
  capturedAt?: string;
}

export interface IncidentReport {
  id: string;
  bookingId: string;
  category: 'CLINICAL_DETERIORATION' | 'SAFETY_CONCERN' | 'LATE_ARRIVAL' | 'BILLING' | 'DISPUTE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reportedBy: string;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  createdAt: string;
}
