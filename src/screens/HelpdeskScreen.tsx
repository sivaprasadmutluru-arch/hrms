import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import Card from '../components/Card';
import Icon from '../components/Icon';
import PrimaryButton from '../components/PrimaryButton';
import {api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {dateText} from '../utils/format';

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function statusTone(status?: string) {
  const text = String(status || '').toLowerCase();
  if (text.includes('resolved') || text.includes('closed')) return {bg: colors.successLight, fg: colors.success};
  if (text.includes('progress') || text.includes('pending')) return {bg: colors.warningLight, fg: colors.warning};
  return {bg: colors.primaryLight, fg: colors.primary};
}

function priorityTone(priority?: string) {
  const text = String(priority || '').toLowerCase();
  if (text.includes('urgent') || text.includes('high')) return {bg: colors.dangerLight, fg: colors.danger};
  if (text.includes('low')) return {bg: colors.infoLight, fg: colors.info};
  return {bg: colors.warningLight, fg: colors.warning};
}

function Pill({text, type = 'status'}: {text?: string; type?: 'status' | 'priority'}) {
  const tone = type === 'priority' ? priorityTone(text) : statusTone(text);
  return (
    <View style={[styles.pill, {backgroundColor: tone.bg}]}>
      <Text style={[styles.pillText, {color: tone.fg}]}>{text || 'OPEN'}</Text>
    </View>
  );
}

function PriorityButton({value, active, onPress}: {value: string; active: boolean; onPress: () => void}) {
  const tone = priorityTone(value);
  return (
    <Pressable onPress={onPress} style={[styles.priorityButton, active && {backgroundColor: tone.bg, borderColor: tone.fg}]}>
      <Text style={[styles.priorityText, active && {color: tone.fg}]}>{value}</Text>
    </Pressable>
  );
}

function TicketCard({item}: {item: any}) {
  const title = item?.subject || item?.title || `Ticket #${item?.id}`;
  return (
    <Card style={styles.ticketCard}>
      <View style={styles.ticketTop}>
        <View style={styles.ticketIcon}>
          <Icon name="help-buoy-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.ticketText}>
          <Text style={styles.ticketTitle}>{title}</Text>
          {!!item?.description && <Text style={styles.ticketDescription} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.ticketDate}>#{item?.ticketNumber || item?.id || '-'} | {dateText(item?.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.ticketMeta}>
        <Pill text={item?.status || 'OPEN'} />
        <Pill text={item?.priority || 'MEDIUM'} type="priority" />
      </View>
    </Card>
  );
}

export default function HelpdeskScreen({onBack}: {onBack: () => void}) {
  const {user} = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.helpdeskTickets({page: 0, size: 50});
      setTickets(asArray(data));
    } catch (err: any) {
      Alert.alert('Helpdesk', err.message || 'Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const open = tickets.filter(t => String(t?.status || 'OPEN').toLowerCase().includes('open')).length;
    const resolved = tickets.filter(t => /resolved|closed/i.test(String(t?.status || ''))).length;
    return {open, resolved};
  }, [tickets]);

  async function submitTicket() {
    if (!subject.trim()) {
      Alert.alert('Helpdesk', 'Please enter a subject.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createHelpdeskTicket({
        subject: subject.trim(),
        title: subject.trim(),
        description: description.trim(),
        priority,
        company: user?.companyId ? {id: user.companyId} : undefined,
      });
      setSubject('');
      setDescription('');
      setPriority('MEDIUM');
      setShowForm(false);
      await load();
      Alert.alert('Helpdesk', 'Ticket created successfully.');
    } catch (err: any) {
      Alert.alert('Helpdesk', err.message || 'Unable to create ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.pageHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-back-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Helpdesk</Text>
          <Text style={styles.subtitle}>Support tickets and request status</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryMetric}>
          <Text style={styles.statLabel}>Open</Text>
          <Text style={styles.statValue}>{counts.open}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryMetric}>
          <Text style={styles.statLabel}>Resolved</Text>
          <Text style={styles.statValue}>{counts.resolved}</Text>
        </View>
        <Pressable onPress={() => setShowForm(value => !value)} style={styles.newTicketButton}>
          <Icon name={showForm ? 'close-outline' : 'add-outline'} size={16} color={colors.white} />
          <Text style={styles.newTicketText}>{showForm ? 'Close' : 'New'}</Text>
        </Pressable>
      </Card>

      {showForm && (
        <Card style={styles.formCard}>
          <View style={styles.formTitleRow}>
            <View style={styles.formIcon}>
              <Icon name="create-outline" size={17} color={colors.primary} />
            </View>
            <Text style={styles.formTitle}>New Support Ticket</Text>
          </View>
          <Text style={styles.inputLabel}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="What do you need help with?"
            placeholderTextColor={colors.subtle}
            style={styles.input}
          />
          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.priorityRow}>
            {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map(item => (
              <PriorityButton key={item} value={item} active={priority === item} onPress={() => setPriority(item)} />
            ))}
          </View>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add details for HR/support"
            placeholderTextColor={colors.subtle}
            multiline
            style={[styles.input, styles.descriptionInput]}
          />
          <PrimaryButton title="Submit Ticket" loading={submitting} onPress={submitTicket} />
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Tickets</Text>
        <Text style={styles.sectionSub}>{tickets.length} total</Text>
      </View>

      {tickets.length ? (
        tickets.map(item => <TicketCard key={String(item?.id || item?.ticketNumber)} item={item} />)
      ) : (
        <Card style={styles.emptyCard}>
          <Icon name="help-buoy-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyTitle}>No tickets</Text>
          <Text style={styles.emptyText}>Create a support ticket when you need help.</Text>
        </Card>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  scroller: {flex: 1},
  content: {padding: 16, paddingTop: 14, paddingBottom: 30},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  titleWrap: {flex: 1},
  title: {color: colors.text, fontSize: 22, fontWeight: '900'},
  subtitle: {color: colors.muted, fontSize: 13, fontWeight: '700', marginTop: 2},
  summaryCard: {
    minHeight: 92,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.04,
  },
  summaryMetric: {flex: 1},
  summaryDivider: {width: 1, height: 44, backgroundColor: colors.border, marginHorizontal: 12},
  statLabel: {color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase'},
  statValue: {color: colors.text, fontSize: 25, fontWeight: '900', marginTop: 4},
  newTicketButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  newTicketText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  formCard: {marginBottom: 14, padding: 14, borderRadius: 12, shadowOpacity: 0.04},
  formTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12},
  formIcon: {width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  formTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  inputLabel: {color: colors.textMid, fontSize: 13, fontWeight: '900', marginBottom: 7},
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.text,
    fontWeight: '700',
    backgroundColor: colors.surfaceAlt,
    marginBottom: 12,
  },
  descriptionInput: {minHeight: 88, paddingTop: 12, textAlignVertical: 'top'},
  priorityRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  priorityButton: {borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 11, paddingVertical: 7},
  priorityText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  sectionHeader: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14, marginBottom: 10},
  sectionTitle: {color: colors.text, fontSize: 18, fontWeight: '900'},
  sectionSub: {color: colors.muted, fontSize: 13, fontWeight: '800'},
  ticketCard: {marginBottom: 10, padding: 12, borderRadius: 12, shadowOpacity: 0.04},
  ticketTop: {flexDirection: 'row', gap: 10},
  ticketIcon: {width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center'},
  ticketText: {flex: 1},
  ticketTitle: {color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '900'},
  ticketDescription: {color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 4},
  ticketDate: {color: colors.subtle, fontSize: 12, fontWeight: '700', marginTop: 7},
  ticketMeta: {flexDirection: 'row', gap: 8, marginTop: 10},
  pill: {borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5},
  pillText: {fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  emptyCard: {alignItems: 'center', padding: 24},
  emptyTitle: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10},
  emptyText: {color: colors.muted, fontWeight: '700', marginTop: 4},
});
