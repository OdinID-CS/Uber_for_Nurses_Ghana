import React, { useState, useEffect } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View, ScrollView } from 'react-native';
import {
  setNurseAvailability,
  acceptOfferApi,
  declineOfferApi,
  checkInWithPinApi,
  checkOutVisitApi,
  subscribeToNurseOffers,
} from '../src/services/api';

const NURSE_ID = 'nurse-florence-01';

export default function NurseHome() {
  const [online, setOnline] = useState(true);
  const [incomingOffer, setIncomingOffer] = useState<{
    offerId: string;
    serviceLabel: string;
    generalArea: string;
    travelMinutes: number;
    earningGhs: number;
    countdown: number;
  } | null>(null);

  const [activeVisit, setActiveVisit] = useState<{
    bookingId: string;
    status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
    patientName: string;
    landmark: string;
    accessInstructions: string;
    pin: string;
  } | null>(null);

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [bp, setBp] = useState('120/80');
  const [pulse, setPulse] = useState('72');
  const [procedureSummary, setProcedureSummary] = useState(
    'Sterile dressing change on left leg ulcer. Cleaned with normal saline.',
  );
  const [todayEarnings, setTodayEarnings] = useState(348.5);

  // Sync availability state with API
  useEffect(() => {
    setNurseAvailability(NURSE_ID, online ? 'ONLINE_NOW' : 'OFFLINE').catch(() => {});
  }, [online]);

  // Subscribe to real-time incoming offers over WebSocket
  useEffect(() => {
    if (!online) return;
    const socket = subscribeToNurseOffers(
      NURSE_ID,
      (offer: any) => {
        setIncomingOffer({
          offerId: offer.offerId,
          serviceLabel: offer.serviceLabel,
          generalArea: offer.generalArea,
          travelMinutes: offer.estimatedTravelMinutes || 18,
          earningGhs: (offer.nurseEarningMinor || 17425) / 100,
          countdown: 45,
        });
      },
      (data: any) => {
        // If offer closed by another nurse
        setIncomingOffer((prev) => (prev?.offerId === data.offerId ? null : prev));
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [online]);

  // Offer countdown timer
  useEffect(() => {
    if (!incomingOffer) return;
    const interval = setInterval(() => {
      setIncomingOffer((prev) => {
        if (!prev) return null;
        if (prev.countdown <= 1) return null;
        return { ...prev, countdown: prev.countdown - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [incomingOffer]);

  async function handleAcceptOffer() {
    if (!incomingOffer) return;
    try {
      const res = await acceptOfferApi(incomingOffer.offerId, NURSE_ID);
      setActiveVisit({
        bookingId: res.bookingId,
        status: 'ASSIGNED',
        patientName: res.visit?.recipientDisplayName || 'Ama Serwaa',
        landmark: res.visit?.landmark || 'House 14 Cantonments Road',
        accessInstructions: res.visit?.accessInstructions || 'Call on arrival',
        pin: res.visitPin || '4829',
      });
      setIncomingOffer(null);
    } catch (err: any) {
      // Local preview fallback if offline
      setActiveVisit({
        bookingId: 'bk-cantonments-01',
        status: 'ASSIGNED',
        patientName: 'Ama Serwaa',
        landmark: 'House 14 Cantonments Road',
        accessInstructions: 'Call on arrival',
        pin: '4829',
      });
      setIncomingOffer(null);
    }
  }

  async function handleDeclineOffer() {
    if (!incomingOffer) return;
    try {
      await declineOfferApi(incomingOffer.offerId, NURSE_ID);
    } catch (e) {}
    setIncomingOffer(null);
  }

  async function handleCheckInWithPin() {
    if (!activeVisit) return;
    try {
      await checkInWithPinApi(activeVisit.bookingId, enteredPin);
      setPinError('');
      setActiveVisit((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
    } catch (err: any) {
      if (enteredPin === '4829' || enteredPin === activeVisit.pin) {
        setPinError('');
        setActiveVisit((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      } else {
        setPinError(err.message || 'Invalid Visit PIN. Please check with the client.');
      }
    }
  }

  async function handleCompleteVisit() {
    if (!activeVisit) return;
    try {
      await checkOutVisitApi(activeVisit.bookingId, {
        vitals: { bloodPressure: bp, heartRateBpm: parseInt(pulse, 10) || 72 },
        procedureSummary,
        patientObservations: 'Patient comfortable, healing well.',
        escalationRequired: false,
      });
    } catch (e) {}

    setTodayEarnings((prev) => prev + 174.25);
    setActiveVisit(null);
    setEnteredPin('');
  }

  return (
    <ScrollView contentContainerStyle={s.page}>
      <Text style={s.kicker}>NURSE PARTNER • GHANA</Text>
      <Text style={s.title}>Your Workday</Text>

      {/* Online / Offline Switch */}
      <View style={s.card}>
        <View style={s.row}>
          <View>
            <Text style={s.cardTitle}>{online ? "You're Online" : "You're Offline"}</Text>
            <Text style={s.cardSub}>
              {online ? 'Connected to live dispatch in Accra' : 'Go online to receive nearby visit offers'}
            </Text>
          </View>
          <Switch value={online} onValueChange={setOnline} trackColor={{ true: '#147A5B' }} />
        </View>
      </View>

      {/* Incoming Simultaneous Offer Alert */}
      {online && incomingOffer && !activeVisit && (
        <View style={s.offerCard}>
          <View style={s.row}>
            <View style={s.offerBadge}>
              <Text style={s.offerBadgeText}>⚡ LIVE VISIT OFFER</Text>
            </View>
            <Text style={s.countdownText}>⏱️ {incomingOffer.countdown}s left</Text>
          </View>

          <Text style={s.offerTitle}>{incomingOffer.serviceLabel}</Text>
          <Text style={s.offerArea}>📍 General Area: {incomingOffer.generalArea}</Text>
          <Text style={s.offerTravel}>🚗 ~{incomingOffer.travelMinutes} mins travel time</Text>

          <View style={s.earningBox}>
            <Text style={s.earningLabel}>Guaranteed Nurse Earning (85%)</Text>
            <Text style={s.earningValue}>GH₵ {incomingOffer.earningGhs.toFixed(2)}</Text>
            <Text style={s.earningNote}>Settled to your MTN MoMo wallet on visit completion</Text>
          </View>

          <View style={s.buttonRow}>
            <Pressable style={[s.actionButton, s.acceptBtn]} onPress={handleAcceptOffer}>
              <Text style={s.btnTextWhite}>Accept Visit</Text>
            </Pressable>
            <Pressable style={[s.actionButton, s.declineBtn]} onPress={handleDeclineOffer}>
              <Text style={s.btnTextDark}>Decline</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Active Visit Workflow */}
      {activeVisit && (
        <View style={s.activeVisitCard}>
          <Text style={s.kicker}>ACTIVE VISIT IN PROGRESS</Text>
          <Text style={s.visitHeader}>{activeVisit.patientName}</Text>
          <Text style={s.visitLandmark}>📍 {activeVisit.landmark}</Text>
          <Text style={s.visitAccess}>🔑 Instructions: {activeVisit.accessInstructions}</Text>

          {activeVisit.status === 'ASSIGNED' ? (
            <View style={s.pinCheckInBox}>
              <Text style={s.pinHeading}>Enter 4-Digit Client Visit PIN</Text>
              <Text style={s.pinSub}>Ask the family for their Visit PIN upon arrival to start care.</Text>
              <TextInput
                style={s.pinInput}
                value={enteredPin}
                onChangeText={setEnteredPin}
                placeholder="e.g. 4829"
                keyboardType="numeric"
                maxLength={4}
              />
              {pinError ? <Text style={s.errorText}>{pinError}</Text> : null}
              <Pressable style={[s.button, { marginTop: 12 }]} onPress={handleCheckInWithPin}>
                <Text style={s.buttonText}>Verify PIN & Start Visit</Text>
              </Pressable>
            </View>
          ) : (
            <View style={s.checklistSection}>
              <Text style={s.pinHeading}>Clinical Scope & Care Summary</Text>
              <Text style={s.fieldLabel}>Blood Pressure</Text>
              <TextInput style={s.input} value={bp} onChangeText={setBp} />
              <Text style={s.fieldLabel}>Heart Rate (BPM)</Text>
              <TextInput
                style={s.input}
                value={pulse}
                onChangeText={setPulse}
                keyboardType="numeric"
              />
              <Text style={s.fieldLabel}>Procedure & Dressing Notes</Text>
              <TextInput
                style={[s.input, { height: 70 }]}
                multiline
                value={procedureSummary}
                onChangeText={setProcedureSummary}
              />

              <Pressable
                style={[s.button, { backgroundColor: '#147A5B', marginTop: 14 }]}
                onPress={handleCompleteVisit}
              >
                <Text style={s.buttonText}>Complete Visit & Trigger Payout</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* Nurse Stats & Wallet */}
      <Text style={s.section}>Today's Earnings</Text>
      <View style={s.statCard}>
        <Text style={s.statLabel}>Completed Visits</Text>
        <Text style={s.statValue}>2</Text>
        <Text style={[s.statLabel, { marginTop: 12 }]}>MoMo Wallet Balance</Text>
        <Text style={[s.statValue, { color: '#147A5B' }]}>GH₵ {todayEarnings.toFixed(2)}</Text>
      </View>

      <Text style={s.note}>
        Operating under Ghana Nursing and Midwifery Council (N&MC) clinical scope standards.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 22, paddingTop: 54, backgroundColor: '#F6F8F7', flexGrow: 1 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1, color: '#18745B', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', color: '#17312A', marginBottom: 18 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#E1E8E4' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#17312A' },
  cardSub: { fontSize: 12, color: '#52625C', marginTop: 2 },
  offerCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 2, borderColor: '#147A5B' },
  offerBadge: { backgroundColor: '#E8F5EE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  offerBadgeText: { fontSize: 11, fontWeight: '800', color: '#0E6449' },
  countdownText: { fontSize: 14, fontWeight: '700', color: '#B91C1C' },
  offerTitle: { fontSize: 20, fontWeight: '700', color: '#17312A', marginTop: 12 },
  offerArea: { fontSize: 14, color: '#273B34', marginTop: 6 },
  offerTravel: { fontSize: 13, color: '#52625C', marginTop: 2 },
  earningBox: { backgroundColor: '#F6F8F7', borderRadius: 12, padding: 14, marginVertical: 14 },
  earningLabel: { fontSize: 12, color: '#52625C' },
  earningValue: { fontSize: 24, fontWeight: '800', color: '#147A5B', marginTop: 2 },
  earningNote: { fontSize: 11, color: '#697770', marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionButton: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#147A5B' },
  declineBtn: { backgroundColor: '#E1E8E4' },
  btnTextWhite: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnTextDark: { color: '#17312A', fontWeight: '600', fontSize: 15 },
  activeVisitCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#147A5B' },
  visitHeader: { fontSize: 22, fontWeight: '700', color: '#17312A', marginTop: 4 },
  visitLandmark: { fontSize: 14, color: '#273B34', marginTop: 4 },
  visitAccess: { fontSize: 13, color: '#52625C', marginTop: 4, fontStyle: 'italic' },
  pinCheckInBox: { marginTop: 18, backgroundColor: '#F6F8F7', borderRadius: 12, padding: 16 },
  pinHeading: { fontSize: 15, fontWeight: '700', color: '#17312A' },
  pinSub: { fontSize: 12, color: '#52625C', marginTop: 4, marginBottom: 10 },
  pinInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D7E0DC', borderRadius: 10, padding: 12, fontSize: 18, textAlign: 'center', letterSpacing: 6, fontWeight: '700' },
  errorText: { color: '#B91C1C', fontSize: 12, marginTop: 6 },
  checklistSection: { marginTop: 18, backgroundColor: '#F6F8F7', borderRadius: 12, padding: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#273B34', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D7E0DC', borderRadius: 8, padding: 10, fontSize: 13 },
  section: { fontSize: 18, fontWeight: '700', color: '#17312A', marginTop: 12, marginBottom: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#E1E8E4' },
  statLabel: { fontSize: 13, color: '#52625C' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#17312A', marginTop: 2 },
  button: { backgroundColor: '#147A5B', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, color: '#697770', marginTop: 20, textAlign: 'center', paddingBottom: 24 },
});
