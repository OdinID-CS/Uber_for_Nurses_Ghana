import React, { useState } from 'react';
import { Link } from 'expo-router';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';

export default function Home() {
  const [activeBooking] = useState<{
    id: string;
    nurseName: string;
    cadre: string;
    status: string;
    pin: string;
    landmark: string;
  } | null>({
    id: 'bk-cantonments-01',
    nurseName: 'Florence Mensah',
    cadre: 'Registered General Nurse (N&MC)',
    status: 'ASSIGNED',
    pin: '4829',
    landmark: 'Cantonments, Near Post Office',
  });

  return (
    <ScrollView contentContainerStyle={s.page}>
      {/* Emergency Guidance Alert */}
      <View style={s.emergencyBanner}>
        <Text style={s.emergencyKicker}>NON-EMERGENCY SERVICE</Text>
        <Text style={s.emergencyBody}>
          For chest pain, severe bleeding, or acute distress, call Ghana Emergency Services (112 / 193) immediately.
        </Text>
      </View>

      <Text style={s.kicker}>NURSE HOME CARE • GHANA</Text>
      <Text style={s.title}>Licensed nursing care at your doorstep.</Text>
      <Text style={s.body}>
        Book vetted, N&MC-licensed nurses for scheduled wound care, post-hospital discharge support, and elder monitoring in Greater Accra.
      </Text>

      {/* Active Booking Card */}
      {activeBooking && (
        <View style={s.activeCard}>
          <View style={s.rowBetween}>
            <Text style={s.activeStatus}>VISIT CONFIRMED</Text>
            <View style={s.pinBadge}>
              <Text style={s.pinLabel}>VISIT PIN</Text>
              <Text style={s.pinValue}>{activeBooking.pin}</Text>
            </View>
          </View>
          <Text style={s.nurseName}>{activeBooking.nurseName}</Text>
          <Text style={s.nurseCadre}>{activeBooking.cadre}</Text>
          <Text style={s.activeLandmark}>📍 {activeBooking.landmark}</Text>
          <Text style={s.pinInstruction}>
            Give this 4-digit PIN to your nurse when they arrive to verify identity and start care.
          </Text>
        </View>
      )}

      {/* Primary CTA */}
      <Link href="/request" asChild>
        <Pressable style={s.button}>
          <Text style={s.buttonText}>Book Home Nursing Visit</Text>
        </Pressable>
      </Link>

      {/* Services List Preview */}
      <View style={s.catalogSection}>
        <Text style={s.sectionHeader}>Supported Home Visits</Text>
        <View style={s.serviceCard}>
          <Text style={s.serviceTitle}>🩹 Home Wound Care</Text>
          <Text style={s.serviceDesc}>Surgical and chronic wound dressing, sterile cleansing, and healing assessment.</Text>
          <Text style={s.servicePrice}>From GH₵ 180.00 • 60 mins</Text>
        </View>
        <View style={s.serviceCard}>
          <Text style={s.serviceTitle}>🩺 Post-Discharge Monitoring</Text>
          <Text style={s.serviceDesc}>Vital signs check, medication administration review, and family recovery education.</Text>
          <Text style={s.servicePrice}>From GH₵ 150.00 • 60 mins</Text>
        </View>
        <View style={s.serviceCard}>
          <Text style={s.serviceTitle}>👵 Older Adult Care & Support</Text>
          <Text style={s.serviceDesc}>Mobility assistance, hygiene, routine chronic condition check-in, and companionship.</Text>
          <Text style={s.servicePrice}>From GH₵ 140.00 • 90 mins</Text>
        </View>
      </View>

      <Text style={s.note}>
        All visits are performed by active Nursing and Midwifery Council (N&MC) licensed professionals.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { padding: 22, paddingTop: 54, backgroundColor: '#F6F8F7' },
  emergencyBanner: {
    backgroundColor: '#FDF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  emergencyKicker: { fontSize: 11, fontWeight: '700', color: '#B91C1C', letterSpacing: 0.5 },
  emergencyBody: { fontSize: 13, color: '#7F1D1D', marginTop: 4, lineHeight: 18 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 1, color: '#18745B', marginBottom: 10 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', color: '#17312A' },
  body: { fontSize: 15, lineHeight: 22, color: '#52625C', marginTop: 12 },
  button: { backgroundColor: '#147A5B', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  activeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#147A5B',
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeStatus: { fontSize: 12, fontWeight: '700', color: '#147A5B', letterSpacing: 0.5 },
  pinBadge: { backgroundColor: '#E8F5EE', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
  pinLabel: { fontSize: 9, fontWeight: '700', color: '#0E6449' },
  pinValue: { fontSize: 18, fontWeight: '800', color: '#0E6449', letterSpacing: 2 },
  nurseName: { fontSize: 18, fontWeight: '700', color: '#17312A', marginTop: 10 },
  nurseCadre: { fontSize: 13, color: '#52625C', marginTop: 2 },
  activeLandmark: { fontSize: 13, color: '#273B34', marginTop: 8 },
  pinInstruction: { fontSize: 12, color: '#52625C', marginTop: 10, lineHeight: 16, fontStyle: 'italic' },
  catalogSection: { marginTop: 28 },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#17312A', marginBottom: 14 },
  serviceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E1E8E4' },
  serviceTitle: { fontSize: 16, fontWeight: '700', color: '#17312A' },
  serviceDesc: { fontSize: 13, color: '#52625C', marginTop: 4, lineHeight: 18 },
  servicePrice: { fontSize: 13, fontWeight: '600', color: '#147A5B', marginTop: 8 },
  note: { fontSize: 12, lineHeight: 18, color: '#697770', marginTop: 20, textAlign: 'center', paddingBottom: 24 },
});
