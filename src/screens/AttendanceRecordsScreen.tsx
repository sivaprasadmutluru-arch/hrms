import React, {useMemo, useState} from 'react';
import {ActivityIndicator, FlatList, Modal, Pressable, StatusBar, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import {colors} from '../theme/colors';
import {fonts} from '../theme/typography';
import {dateText, timeText} from '../utils/format';
import {AttendanceCategory, attendanceCategories, attendanceCounts, attendanceRecords, attendancePunch, canRegulariseAttendance} from '../utils/attendanceRecords';

type Props = {
  category: AttendanceCategory;
  month: string;
  records: any[];
  loading: boolean;
  error: string;
  onCategoryChange: (category: AttendanceCategory) => void;
  onBack: () => void;
  onRefresh: () => void;
  onRegularise?: (record: any) => void;
  monthCursor?: Date;
  onMonthChange?: (month: Date) => void;
};

const tones = {present: colors.success, absent: colors.danger, late: colors.warning};

export default function AttendanceRecordsScreen({category, month, records, loading, error, onCategoryChange, onBack, onRefresh, onRegularise, monthCursor, onMonthChange}: Props) {
  const insets = useSafeAreaInsets();
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const now = new Date();
  const filtered = useMemo(() => attendanceRecords(records, category), [records, category]);
  const counts = useMemo(() => attendanceCounts(records), [records]);
  const label = attendanceCategories.find(item => item.key === category)!.label;
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={colors.sidebar} />
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Check In" onPress={onBack} style={styles.back}>
          <Icon name="chevron-back" size={22} color={colors.white} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{label} Records</Text>
          <Text style={styles.subtitle}>{month}</Text>
        </View>
        {!!onMonthChange && <Pressable accessibilityRole="button" accessibilityLabel="Change attendance month" onPress={() => {setPickerYear((monthCursor || now).getFullYear()); setMonthPickerOpen(true);}} style={styles.back}>
          <Icon name="calendar-outline" size={21} color={colors.white} />
        </Pressable>}
      </View>
      <View style={styles.tabs}>
        {attendanceCategories.map(item => (
          <Pressable key={item.key} accessibilityRole="tab" accessibilityState={{selected: category === item.key}} onPress={() => onCategoryChange(item.key)} style={[styles.tab, category === item.key && styles.selectedTab]}>
            <Text style={[styles.count, {color: tones[item.key]}]}>{counts[item.key]}</Text>
            <Text style={styles.tabLabel}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <FlatList
        data={error ? [] : filtered}
        keyExtractor={(item, index) => String(item.id || item.attendanceDate || item.date || index)}
        contentContainerStyle={[styles.list, {paddingBottom: insets.bottom + 24}]}
        refreshing={loading}
        onRefresh={onRefresh}
        ListHeaderComponent={<Text style={styles.summary}>{category === 'late' ? 'Attendance marked irregular by HRMS' : `${filtered.length} ${label.toLowerCase()} record${filtered.length === 1 ? '' : 's'}`}</Text>}
        ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary} style={styles.empty} /> : (
          <View style={styles.empty}>
            <Icon name={error ? 'alert-circle-outline' : 'calendar-outline'} size={30} color={colors.muted} />
            <Text style={styles.emptyTitle}>{error ? 'Unable to load records' : `No ${label.toLowerCase()} records`}</Text>
            <Text style={styles.emptyText}>{error || `There are no ${label.toLowerCase()} records for ${month}.`}</Text>
            {!!error && <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable>}
          </View>
        )}
        renderItem={({item}) => (
          <View style={[styles.record, {borderLeftColor: tones[category]}]}>
            <Text style={styles.recordDate}>{dateText(`${String(item.attendanceDate || item.date || '').slice(0, 10)}T00:00:00`)}</Text>
            <Text style={styles.recordStatus}>{String(item.displayStatus || item.attendanceStatus || item.status || '').replace(/_/g, ' ')}</Text>
            <View style={styles.punches}>
              <View style={styles.punch}><Text style={styles.punchLabel}>CHECK IN</Text><Text style={styles.punchTime}>{timeText(attendancePunch(item, 'in'))}</Text></View>
              <View style={styles.punch}><Text style={styles.punchLabel}>CHECK OUT</Text><Text style={styles.punchTime}>{attendancePunch(item, 'out') ? timeText(attendancePunch(item, 'out')) : item.checkoutUnavailable ? 'Unavailable' : 'Not recorded'}</Text></View>
            </View>
            {!!item.regularisationStatus && item.regularisationStatus !== 'NONE' && <Text style={styles.requestStatus}>Regularisation: {String(item.regularisationStatus).replace(/_/g, ' ')}</Text>}
            {!!onRegularise && canRegulariseAttendance(item) && <Pressable accessibilityRole="button" accessibilityLabel={`Regularise attendance for ${item.attendanceDate || item.date}`} onPress={() => onRegularise(item)} style={styles.regularise}><Icon name="create-outline" size={15} color={colors.primary} /><Text style={styles.regulariseText}>Regularise</Text></Pressable>}
          </View>
        )}
      />
      <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeading}>
              <Text style={styles.pickerTitle}>Select month</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close month picker" onPress={() => setMonthPickerOpen(false)} style={styles.pickerButton}><Icon name="close-outline" size={22} color={colors.textMid} /></Pressable>
            </View>
            <View style={styles.yearRow}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => setPickerYear(year => year - 1)} style={styles.pickerButton}><Icon name="chevron-back" size={20} color={colors.primary} /></Pressable>
              <Text style={styles.pickerTitle}>{pickerYear}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Next year" disabled={pickerYear >= now.getFullYear()} onPress={() => setPickerYear(year => year + 1)} style={styles.pickerButton}><Icon name="chevron-forward" size={20} color={pickerYear >= now.getFullYear() ? colors.subtle : colors.primary} /></Pressable>
            </View>
            <View style={styles.monthGrid}>
              {Array.from({length: 12}, (_, index) => {
                const date = new Date(pickerYear, index, 1);
                const disabled = pickerYear > now.getFullYear() || (pickerYear === now.getFullYear() && index > now.getMonth());
                const selected = monthCursor?.getFullYear() === pickerYear && monthCursor?.getMonth() === index;
                return <Pressable key={index} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})} accessibilityState={{selected, disabled}} disabled={disabled} onPress={() => {onMonthChange?.(date); setMonthPickerOpen(false);}} style={[styles.monthOption, selected && styles.selectedTab, disabled && styles.disabledMonth]}>
                  <Text style={styles.tabLabel}>{date.toLocaleDateString(undefined, {month: 'short'})}</Text>
                </Pressable>;
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  header: {backgroundColor: colors.sidebar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 12},
  back: {width: 44, height: 44, borderRadius: 14, backgroundColor: '#37316A', alignItems: 'center', justifyContent: 'center'},
  headerCopy: {flex: 1},
  title: {color: colors.white, fontFamily: fonts.semibold, fontSize: 21},
  subtitle: {color: '#C7D2FE', fontSize: 13, marginTop: 3},
  tabs: {flexDirection: 'row', gap: 10, padding: 16},
  tab: {flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border},
  selectedTab: {borderColor: colors.primary, backgroundColor: colors.primaryLight},
  count: {fontSize: 24, fontFamily: fonts.semibold},
  tabLabel: {fontSize: 12, fontFamily: fonts.medium, color: colors.textMid, marginTop: 3},
  list: {paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1},
  summary: {fontSize: 12, color: colors.muted, marginBottom: 12},
  record: {backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderLeftWidth: 4, padding: 16, marginBottom: 12},
  recordDate: {fontSize: 16, fontFamily: fonts.semibold, color: colors.text},
  recordStatus: {fontSize: 10, fontFamily: fonts.medium, color: colors.muted, marginTop: 4},
  punches: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12, gap: 12},
  punch: {flex: 1},
  punchLabel: {fontSize: 10, color: colors.muted, fontFamily: fonts.medium},
  punchTime: {fontSize: 15, color: colors.text, fontFamily: fonts.semibold, marginTop: 4},
  regularise: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, borderRadius: 12, backgroundColor: colors.primaryLight, marginTop: 14},
  regulariseText: {color: colors.primary, fontFamily: fonts.semibold, fontSize: 13},
  requestStatus: {color: colors.muted, fontSize: 12, marginTop: 12},
  empty: {alignItems: 'center', paddingVertical: 48, paddingHorizontal: 16},
  emptyTitle: {fontSize: 17, fontFamily: fonts.semibold, color: colors.text, marginTop: 12, textAlign: 'center'},
  emptyText: {fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6},
  retry: {paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 12, marginTop: 18},
  retryText: {color: colors.white, fontFamily: fonts.semibold},
  pickerOverlay: {flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'center', padding: 22},
  pickerCard: {backgroundColor: colors.white, borderRadius: 20, padding: 16},
  pickerHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  pickerTitle: {color: colors.text, fontFamily: fonts.semibold, fontSize: 18},
  pickerButton: {width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center'},
  yearRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16},
  monthGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10},
  monthOption: {width: '31%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt},
  disabledMonth: {opacity: 0.35},
});
