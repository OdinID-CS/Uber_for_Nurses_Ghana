import { Injectable, Inject, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DispatchGateway } from '../modules/gateway/dispatch.gateway';
import {
  Booking,
  CareQuoteRequest,
  CareQuoteResponse,
  CareRequestInput,
  ClinicalChecklistInput,
  DispatchRound,
  IncidentReport,
  NurseAvailability,
  NursePresence,
  NurseProfile,
  OfferPayload,
  OutboxEvent,
  PaymentProvider,
  PaymentTransaction,
} from '../common/types';
import {
  BookingNotCancellableException,
  BookingNotFoundException,
  InvalidPinException,
  InvalidServiceException,
  NoLongerEligibleException,
  OfferClosedException,
  OfferNotFoundException,
  QuoteExpiredException,
} from '../common/errors';

export interface ServiceDefinition {
  id: string;
  name: string;
  description: string;
  baseAmountMinor: number;
  durationMinutes: number;
  requiredSkill: string;
}

export const KNOWN_SERVICES: Record<string, ServiceDefinition> = {
  home_wound_care: {
    id: 'home_wound_care',
    name: 'Home Wound Care',
    description: 'Post-surgical and chronic wound dressing, assessment and infection monitoring',
    baseAmountMinor: 18000,
    durationMinutes: 60,
    requiredSkill: 'wound_care',
  },
  post_discharge_support: {
    id: 'post_discharge_support',
    name: 'Post-Discharge Support',
    description: 'Vital signs check, medication administration review and patient education after hospital discharge',
    baseAmountMinor: 15000,
    durationMinutes: 60,
    requiredSkill: 'general_nursing',
  },
  older_adult_support: {
    id: 'older_adult_support',
    name: 'Older Adult Care & Monitoring',
    description: 'Routine mobility assistance, vitals check, and chronic condition check-in',
    baseAmountMinor: 14000,
    durationMinutes: 90,
    requiredSkill: 'geriatric_care',
  },
};

@Injectable()
export class MemoryStore {
  private nurses: Map<string, NurseProfile> = new Map();
  private quotes: Map<string, CareQuoteResponse> = new Map();
  private bookings: Map<string, Booking> = new Map();
  private rounds: Map<string, DispatchRound> = new Map();
  private offers: Map<string, OfferPayload> = new Map();
  private payments: Map<string, PaymentTransaction> = new Map();
  private incidents: Map<string, IncidentReport> = new Map();
  private idempotencyCache: Map<string, any> = new Map();
  private outbox: OutboxEvent[] = [];

  constructor(
    @Optional() @Inject(DispatchGateway) private readonly gateway?: DispatchGateway,
  ) {
    this.seed();
  }

  private seed() {
    const nurse1: NurseProfile = {
      id: 'nurse-florence-01',
      displayName: 'Florence Mensah',
      cadre: 'Registered General Nurse (N&MC)',
      credentialNumber: 'NMC-GH-84920',
      credentialStatus: 'APPROVED',
      documentUrls: ['https://storage.local/nurses/florence-nmc.pdf'],
      skills: ['wound_care', 'general_nursing', 'geriatric_care'],
      rating: 4.95,
      phone: '+233244111222',
      momoNumber: '0244111222',
      availability: {
        nurseId: 'nurse-florence-01',
        mode: 'ONLINE_NOW',
        serviceZoneIds: ['accra_metro', 'cantonments', 'osu'],
        maxTravelKm: 15,
        acceptedServiceIds: ['home_wound_care', 'post_discharge_support', 'older_adult_support'],
        locationConsent: true,
        updatedAt: new Date().toISOString(),
      },
      presence: {
        nurseId: 'nurse-florence-01',
        coordinates: { latitude: 5.5801, longitude: -0.1712 }, // Cantonments, Accra
        capturedAt: new Date().toISOString(),
        accuracyMeters: 15,
      },
    };

    const nurse2: NurseProfile = {
      id: 'nurse-kwame-02',
      displayName: 'Kwame Asante',
      cadre: 'Senior Staff Nurse (N&MC)',
      credentialNumber: 'NMC-GH-67219',
      credentialStatus: 'APPROVED',
      documentUrls: ['https://storage.local/nurses/kwame-nmc.pdf'],
      skills: ['wound_care', 'general_nursing'],
      rating: 4.88,
      phone: '+233201333444',
      momoNumber: '0201333444',
      availability: {
        nurseId: 'nurse-kwame-02',
        mode: 'ONLINE_NOW',
        serviceZoneIds: ['accra_metro', 'airport_residential', 'east_legon'],
        maxTravelKm: 12,
        acceptedServiceIds: ['home_wound_care', 'post_discharge_support'],
        locationConsent: true,
        updatedAt: new Date().toISOString(),
      },
      presence: {
        nurseId: 'nurse-kwame-02',
        coordinates: { latitude: 5.6037, longitude: -0.187 }, // Airport Residential, Accra
        capturedAt: new Date().toISOString(),
        accuracyMeters: 20,
      },
    };

    const pendingNurse: NurseProfile = {
      id: 'nurse-ama-03',
      displayName: 'Ama Boateng',
      cadre: 'Community Health Nurse',
      credentialNumber: 'NMC-GH-99182',
      credentialStatus: 'PENDING_REVIEW',
      documentUrls: ['https://storage.local/nurses/ama-license.pdf'],
      skills: ['geriatric_care'],
      rating: 5.0,
      phone: '+233277889900',
      availability: {
        nurseId: 'nurse-ama-03',
        mode: 'OFFLINE',
        serviceZoneIds: ['accra_metro'],
        maxTravelKm: 10,
        acceptedServiceIds: ['older_adult_support'],
        locationConsent: false,
        updatedAt: new Date().toISOString(),
      },
    };

    this.nurses.set(nurse1.id, nurse1);
    this.nurses.set(nurse2.id, nurse2);
    this.nurses.set(pendingNurse.id, pendingNurse);
  }

  // Idempotency
  getIdempotent<T>(key?: string): T | undefined {
    if (!key) return undefined;
    return this.idempotencyCache.get(key);
  }

  setIdempotent(key: string, result: any) {
    this.idempotencyCache.set(key, result);
  }

  // Nurses Management
  getNurse(id: string): NurseProfile | undefined {
    return this.nurses.get(id);
  }

  getAllNurses(): NurseProfile[] {
    return Array.from(this.nurses.values());
  }

  getPendingNurses(): NurseProfile[] {
    return Array.from(this.nurses.values()).filter((n) => n.credentialStatus === 'PENDING_REVIEW');
  }

  registerNurse(profile: Partial<NurseProfile> & { displayName: string; phone: string; credentialNumber: string }): NurseProfile {
    const id = profile.id || `nurse-${Date.now()}`;
    const newNurse: NurseProfile = {
      id,
      displayName: profile.displayName,
      cadre: profile.cadre || 'Registered Nurse',
      credentialNumber: profile.credentialNumber,
      credentialStatus: 'PENDING_REVIEW',
      documentUrls: profile.documentUrls || [],
      skills: profile.skills || ['general_nursing'],
      rating: 5.0,
      phone: profile.phone,
      momoNumber: profile.momoNumber || profile.phone,
      availability: {
        nurseId: id,
        mode: 'OFFLINE',
        serviceZoneIds: ['accra_metro'],
        maxTravelKm: 12,
        acceptedServiceIds: ['home_wound_care', 'post_discharge_support'],
        locationConsent: false,
        updatedAt: new Date().toISOString(),
      },
    };
    this.nurses.set(id, newNurse);
    this.recordOutboxEvent('nurse.registered', id, 1, { credentialNumber: newNurse.credentialNumber });
    return newNurse;
  }

  approveNurseCredential(nurseId: string, reviewer = 'Ops Clinical Lead'): NurseProfile {
    const nurse = this.nurses.get(nurseId);
    if (!nurse) throw new Error(`Nurse ${nurseId} not found`);
    nurse.credentialStatus = 'APPROVED';
    nurse.reviewedBy = reviewer;
    nurse.reviewedAt = new Date().toISOString();
    this.recordOutboxEvent('nurse.credential.approved', nurseId, 1, { reviewer });
    return nurse;
  }

  rejectNurseCredential(nurseId: string, reviewer = 'Ops Clinical Lead', reason: string): NurseProfile {
    const nurse = this.nurses.get(nurseId);
    if (!nurse) throw new Error(`Nurse ${nurseId} not found`);
    nurse.credentialStatus = 'REJECTED';
    nurse.reviewedBy = reviewer;
    nurse.reviewedAt = new Date().toISOString();
    nurse.rejectionReason = reason;
    this.recordOutboxEvent('nurse.credential.rejected', nurseId, 1, { reviewer, reason });
    return nurse;
  }

  updateNurseAvailability(nurseId: string, update: Partial<NurseAvailability>): NurseAvailability {
    let nurse = this.nurses.get(nurseId);
    if (!nurse) {
      nurse = this.registerNurse({
        id: nurseId,
        displayName: 'Registered Nurse',
        phone: '+233000000000',
        credentialNumber: `NMC-${Date.now()}`,
      });
    }

    nurse.availability = {
      ...nurse.availability,
      ...update,
      nurseId,
      updatedAt: new Date().toISOString(),
    };

    return nurse.availability;
  }

  recordPresence(nurseId: string, presence: Omit<NursePresence, 'nurseId'>): NursePresence {
    const nurse = this.nurses.get(nurseId);
    if (!nurse) {
      this.updateNurseAvailability(nurseId, { mode: 'ONLINE_NOW', locationConsent: true });
    }
    const currentNurse = this.nurses.get(nurseId)!;
    const record: NursePresence = {
      nurseId,
      coordinates: presence.coordinates,
      capturedAt: presence.capturedAt || new Date().toISOString(),
      accuracyMeters: presence.accuracyMeters || 20,
    };
    currentNurse.presence = record;
    return record;
  }

  // Quotes
  createQuote(input: CareQuoteRequest): CareQuoteResponse {
    const service = KNOWN_SERVICES[input.serviceId];
    if (!service) {
      throw new InvalidServiceException(`Service ${input.serviceId} is not in the service catalog`);
    }

    const travelFeeMinor = 2500; // GHS 25.00
    const quoteId = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const quote: CareQuoteResponse = {
      quoteId,
      serviceId: service.id,
      serviceDescription: service.description,
      currency: 'GHS',
      serviceAmountMinor: service.baseAmountMinor,
      travelFeeMinor,
      totalAmountMinor: service.baseAmountMinor + travelFeeMinor,
      quoteExpiresAt: expiresAt,
      cancellationTermsVersion: '2026-v1',
    };

    this.quotes.set(quoteId, quote);
    return quote;
  }

  // Care Requests & Dispatch
  createCareRequest(input: CareRequestInput, idempotencyKey?: string): { booking: Booking; round?: DispatchRound } {
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      return this.idempotencyCache.get(idempotencyKey);
    }

    const quote = this.quotes.get(input.quoteId);
    if (!quote || new Date(quote.quoteExpiresAt).getTime() < Date.now()) {
      throw new QuoteExpiredException();
    }

    const bookingId = uuidv4();
    const now = new Date().toISOString();

    const booking: Booking = {
      id: bookingId,
      quoteId: input.quoteId,
      serviceId: input.serviceId,
      status: 'SEARCHING',
      version: 1,
      scheduledStart: input.scheduledStart,
      durationMinutes: input.durationMinutes || 60,
      location: input.location,
      landmark: input.landmark,
      recipientDisplayName: input.recipientDisplayName,
      recipientPhone: input.recipientPhone,
      addressPrivate: input.addressPrivate,
      accessInstructions: input.accessInstructions,
      careSummaryPrivate: input.careSummaryPrivate,
      totalAmountMinor: quote.totalAmountMinor,
      currency: 'GHS',
      createdAt: now,
      updatedAt: now,
    };

    this.bookings.set(bookingId, booking);

    // Initialize pre-authorized payment
    this.createPaymentAuthorization(bookingId, quote.totalAmountMinor, input.recipientPhone);

    this.recordOutboxEvent('booking.status.changed', booking.id, booking.version, {
      status: booking.status,
      serviceId: booking.serviceId,
    });

    const round = this.createDispatchRound(booking);
    const result = { booking, round };
    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, result);
    }
    return result;
  }

  private createDispatchRound(booking: Booking): DispatchRound {
    const roundId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 1000).toISOString();

    const serviceDef = KNOWN_SERVICES[booking.serviceId];
    const requiredSkill = serviceDef ? serviceDef.requiredSkill : 'general_nursing';

    const candidates = Array.from(this.nurses.values()).filter((nurse) => {
      if (nurse.credentialStatus !== 'APPROVED') return false;
      if (nurse.availability.mode !== 'ONLINE_NOW') return false;
      if (!nurse.skills.includes(requiredSkill)) return false;
      if (!nurse.availability.acceptedServiceIds.includes(booking.serviceId)) return false;

      if (nurse.presence) {
        const distKm = calculateDistanceKm(
          nurse.presence.coordinates.latitude,
          nurse.presence.coordinates.longitude,
          booking.location.latitude,
          booking.location.longitude,
        );
        if (distKm > nurse.availability.maxTravelKm) return false;
      }
      return true;
    });

    const nurseEarning = Math.round(booking.totalAmountMinor * 0.85);

    const offers: OfferPayload[] = candidates.map((nurse) => {
      const offerId = uuidv4();
      const distKm = nurse.presence
        ? calculateDistanceKm(
            nurse.presence.coordinates.latitude,
            nurse.presence.coordinates.longitude,
            booking.location.latitude,
            booking.location.longitude,
          )
        : 5;
      const travelMins = Math.max(10, Math.round(distKm * 3.5));

      const offer: OfferPayload = {
        offerId,
        bookingId: booking.id,
        roundId,
        nurseId: nurse.id,
        status: 'OPEN',
        serviceLabel: serviceDef ? serviceDef.name : 'Home Nursing Visit',
        generalArea: booking.landmark || 'Accra Metro',
        scheduledStart: booking.scheduledStart,
        durationMinutes: booking.durationMinutes,
        estimatedTravelMinutes: travelMins,
        nurseEarningMinor: nurseEarning,
        currency: 'GHS',
        requiredSkillLabels: [serviceDef ? serviceDef.name : 'General Nursing'],
        expiresAt,
        createdAt: now.toISOString(),
      };
      this.offers.set(offerId, offer);

      this.recordOutboxEvent('dispatch.offer.created', offer.offerId, 1, {
        offer,
        nurseId: nurse.id,
      });

      this.gateway?.emitOfferCreated(nurse.id, offer);

      return offer;
    });

    const round: DispatchRound = {
      id: roundId,
      bookingId: booking.id,
      sequence: 1,
      radiusKm: 15,
      offers,
      status: 'ACTIVE',
      expiresAt,
      createdAt: now.toISOString(),
    };

    this.rounds.set(roundId, round);
    return round;
  }

  // Atomic Winner Arbitration
  acceptOffer(offerId: string, nurseId: string, idempotencyKey?: string) {
    if (idempotencyKey && this.idempotencyCache.has(idempotencyKey)) {
      return this.idempotencyCache.get(idempotencyKey);
    }

    const offer = this.offers.get(offerId);
    if (!offer) throw new OfferNotFoundException(offerId);

    if (offer.nurseId !== nurseId) {
      throw new OfferClosedException('Offer belongs to a different nurse.');
    }

    if (new Date(offer.expiresAt).getTime() < Date.now()) {
      offer.status = 'EXPIRED';
      throw new OfferClosedException('Offer has expired.');
    }

    if (offer.status !== 'OPEN') {
      throw new OfferClosedException(`Offer is already ${offer.status.toLowerCase()}.`);
    }

    const booking = this.bookings.get(offer.bookingId);
    if (!booking) throw new BookingNotFoundException(offer.bookingId);

    if (booking.status !== 'SEARCHING' || booking.assignedNurseId) {
      offer.status = 'CLOSED';
      throw new OfferClosedException('Another nurse has already accepted this booking.');
    }

    const nurse = this.nurses.get(nurseId);
    if (!nurse || nurse.credentialStatus !== 'APPROVED' || nurse.availability.mode !== 'ONLINE_NOW') {
      offer.status = 'CLOSED';
      throw new NoLongerEligibleException();
    }

    // Atomic assignment
    offer.status = 'ACCEPTED';
    offer.respondedAt = new Date().toISOString();

    // Generate secure 4-digit Visit PIN
    const visitPin = Math.floor(1000 + Math.random() * 9000).toString();

    booking.status = 'ASSIGNED';
    booking.assignedNurseId = nurse.id;
    booking.assignedNurse = {
      nurseId: nurse.id,
      displayName: nurse.displayName,
      cadre: nurse.cadre,
      rating: nurse.rating,
      phone: nurse.phone,
    };
    booking.visitPin = visitPin;
    booking.acceptedAt = offer.respondedAt;
    booking.version += 1;
    booking.updatedAt = offer.respondedAt;

    // Close sibling offers
    const round = this.rounds.get(offer.roundId);
    if (round) {
      round.status = 'RESOLVED';
      for (const sib of round.offers) {
        if (sib.offerId !== offer.offerId && sib.status === 'OPEN') {
          sib.status = 'CLOSED';
          sib.respondedAt = offer.respondedAt;
          this.recordOutboxEvent('dispatch.offer.closed', sib.offerId, 1, {
            bookingId: booking.id,
            reason: 'ANOTHER_NURSE_ACCEPTED',
          });
          this.gateway?.emitOfferClosed(sib.nurseId, sib.offerId, 'ANOTHER_NURSE_ACCEPTED');
        }
      }
    }

    this.recordOutboxEvent('booking.status.changed', booking.id, booking.version, {
      status: 'ASSIGNED',
      assignedNurseId: nurse.id,
      estimatedArrival: new Date(Date.now() + offer.estimatedTravelMinutes * 60000).toISOString(),
    });

    this.gateway?.emitBookingStatusChanged(booking.id, {
      bookingId: booking.id,
      status: 'ASSIGNED',
      assignedNurse: booking.assignedNurse,
      visitPin: booking.visitPin,
      version: booking.version,
    });

    const result = {
      bookingId: booking.id,
      status: booking.status,
      version: booking.version,
      assignedNurseId: nurse.id,
      acceptedAt: booking.acceptedAt,
      visitPin: booking.visitPin,
      visit: {
        recipientDisplayName: booking.recipientDisplayName,
        addressPrivate: booking.addressPrivate,
        landmark: booking.landmark,
        accessInstructions: booking.accessInstructions,
        careSummaryPrivate: booking.careSummaryPrivate,
        scheduledStart: booking.scheduledStart,
        durationMinutes: booking.durationMinutes,
      },
    };

    if (idempotencyKey) {
      this.idempotencyCache.set(idempotencyKey, result);
    }
    return result;
  }

  declineOffer(offerId: string, nurseId: string, reasonCode?: string) {
    const offer = this.offers.get(offerId);
    if (!offer) throw new OfferNotFoundException(offerId);
    if (offer.nurseId !== nurseId) throw new OfferClosedException('Offer belongs to a different nurse.');
    if (offer.status !== 'OPEN') return { status: offer.status };

    offer.status = 'DECLINED';
    offer.respondedAt = new Date().toISOString();

    this.recordOutboxEvent('dispatch.offer.declined', offer.offerId, 1, {
      bookingId: offer.bookingId,
      nurseId,
      reasonCode: reasonCode || 'UNSPECIFIED',
    });

    return { status: 'DECLINED', offerId };
  }

  getNurseOffers(nurseId: string): OfferPayload[] {
    return Array.from(this.offers.values()).filter((o) => o.nurseId === nurseId);
  }

  getBooking(id: string): Booking {
    const booking = this.bookings.get(id);
    if (!booking) throw new BookingNotFoundException(id);
    return booking;
  }

  getAllBookings(): Booking[] {
    return Array.from(this.bookings.values());
  }

  cancelBooking(id: string, reason = 'Client request'): Booking {
    const booking = this.getBooking(id);
    if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
      throw new BookingNotCancellableException();
    }
    booking.status = 'CANCELLED';
    booking.version += 1;
    booking.cancelledAt = new Date().toISOString();
    booking.updatedAt = booking.cancelledAt;

    // Void payment pre-authorization
    this.voidPayment(booking.id);

    this.recordOutboxEvent('booking.status.changed', booking.id, booking.version, {
      status: 'CANCELLED',
      reason,
    });
    this.gateway?.emitBookingStatusChanged(booking.id, {
      bookingId: booking.id,
      status: 'CANCELLED',
      reason,
      version: booking.version,
    });
    return booking;
  }

  // Visit PIN Verification Check-in
  checkInBooking(id: string, enteredPin?: string): Booking {
    const booking = this.getBooking(id);
    if (!['ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(booking.status)) {
      throw new BookingNotCancellableException('Booking must be assigned before checking in');
    }

    if (booking.visitPin && enteredPin && enteredPin !== booking.visitPin) {
      throw new InvalidPinException();
    }

    booking.status = 'IN_PROGRESS';
    booking.version += 1;
    booking.checkedInAt = new Date().toISOString();
    booking.updatedAt = booking.checkedInAt;

    this.recordOutboxEvent('booking.status.changed', booking.id, booking.version, {
      status: 'IN_PROGRESS',
    });
    this.gateway?.emitBookingStatusChanged(booking.id, {
      bookingId: booking.id,
      status: 'IN_PROGRESS',
      version: booking.version,
    });
    return booking;
  }

  // Clinical Summary & Scope Check-out
  checkOutBooking(id: string, checklist?: ClinicalChecklistInput): Booking {
    const booking = this.getBooking(id);
    if (booking.status !== 'IN_PROGRESS') {
      throw new BookingNotCancellableException('Booking must be in progress to complete');
    }

    const now = new Date().toISOString();
    booking.status = 'COMPLETED';
    booking.version += 1;
    booking.checkedOutAt = now;
    booking.updatedAt = now;

    if (checklist) {
      booking.clinicalRecord = {
        ...checklist,
        completedAt: now,
      };

      if (checklist.escalationRequired) {
        this.reportIncident({
          bookingId: booking.id,
          category: 'CLINICAL_DETERIORATION',
          severity: 'HIGH',
          description: `Clinician triggered escalation during visit completion: ${checklist.adverseEventsNotes || 'Patient deterioration observed.'}`,
          reportedBy: booking.assignedNurseId || 'nurse',
        });
      }
    }

    // Capture payment and settle nurse MoMo payout
    this.capturePayment(booking.id);

    this.recordOutboxEvent('booking.status.changed', booking.id, booking.version, {
      status: 'COMPLETED',
    });
    this.gateway?.emitBookingStatusChanged(booking.id, {
      bookingId: booking.id,
      status: 'COMPLETED',
      version: booking.version,
      clinicalRecord: booking.clinicalRecord,
    });
    return booking;
  }

  // Payments & Ledger
  private createPaymentAuthorization(bookingId: string, amountMinor: number, phone?: string): PaymentTransaction {
    const txId = uuidv4();
    const nursePayout = Math.round(amountMinor * 0.85);
    const platformFee = amountMinor - nursePayout;

    const tx: PaymentTransaction = {
      id: txId,
      bookingId,
      provider: 'PAYSTACK',
      providerReference: `pstk_ref_${Date.now()}`,
      amountMinor,
      currency: 'GHS',
      status: 'AUTHORIZED',
      nursePayoutMinor: nursePayout,
      platformFeeMinor: platformFee,
      customerMomoNumber: phone,
      network: 'MTN',
      createdAt: new Date().toISOString(),
    };
    this.payments.set(bookingId, tx);
    return tx;
  }

  capturePayment(bookingId: string): PaymentTransaction | undefined {
    const tx = this.payments.get(bookingId);
    if (tx) {
      tx.status = 'CAPTURED';
      tx.capturedAt = new Date().toISOString();
      this.recordOutboxEvent('payment.captured', tx.id, 1, {
        bookingId,
        amountMinor: tx.amountMinor,
        nursePayoutMinor: tx.nursePayoutMinor,
      });
    }
    return tx;
  }

  voidPayment(bookingId: string): PaymentTransaction | undefined {
    const tx = this.payments.get(bookingId);
    if (tx && tx.status === 'AUTHORIZED') {
      tx.status = 'REFUNDED';
    }
    return tx;
  }

  getPaymentTransactions(): PaymentTransaction[] {
    return Array.from(this.payments.values());
  }

  // Clinical Incidents
  reportIncident(input: {
    bookingId: string;
    category: IncidentReport['category'];
    severity: IncidentReport['severity'];
    description: string;
    reportedBy: string;
  }): IncidentReport {
    const incident: IncidentReport = {
      id: uuidv4(),
      bookingId: input.bookingId,
      category: input.category,
      severity: input.severity,
      description: input.description,
      reportedBy: input.reportedBy,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };
    this.incidents.set(incident.id, incident);
    this.recordOutboxEvent('incident.reported', incident.id, 1, incident);
    return incident;
  }

  getIncidents(): IncidentReport[] {
    return Array.from(this.incidents.values());
  }

  // Outbox
  private recordOutboxEvent(type: string, aggregateId: string, version: number, data: Record<string, any>) {
    this.outbox.push({
      eventId: uuidv4(),
      type,
      aggregateId,
      version,
      occurredAt: new Date().toISOString(),
      data,
    });
  }

  getOutboxEvents(): OutboxEvent[] {
    return [...this.outbox];
  }
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
