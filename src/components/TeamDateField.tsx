import React, {useState} from 'react';
import {Modal, Pressable, StyleSheet, Text, View} from 'react-native';
import {colors} from '../theme/colors';
import Icon from './Icon';

export default function TeamDateField({label, value, onChange}: {label: string; value: string; onChange: (date: string) => void}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(`${value}T12:00:00`));
  const first = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const shift = (offset: number) => setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  return <View style={{flex: 1, gap: 6}}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityLabel={label} onPress={() => {setMonth(new Date(`${value}T12:00:00`)); setOpen(true);}} style={styles.field}>
      <Text style={styles.label}>{new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric'})}</Text>
      <Icon name="calendar-outline" size={18} color={colors.primary} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.calendar}>
        <Text style={styles.heading}>{label}</Text>
        <View style={styles.month}>
          <Pressable accessibilityLabel={`Previous month ${label}`} onPress={() => shift(-1)} style={styles.nav}><Icon name="chevron-back-outline" size={24} color={colors.primary} /></Pressable>
          <Text style={styles.label}>{month.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</Text>
          <Pressable accessibilityLabel={`Next month ${label}`} onPress={() => shift(1)} style={styles.nav}><Icon name="chevron-forward-outline" size={24} color={colors.primary} /></Pressable>
        </View>
        <View style={styles.grid}>{['Su','Mo','Tu','We','Th','Fr','Sa'].map(day => <Text key={day} style={styles.week}>{day}</Text>)}</View>
        <View style={styles.grid}>{Array.from({length: first + days}, (_, index) => {
          const day = index - first + 1;
          const date = `${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          return <Pressable key={index} accessibilityLabel={day > 0 ? `Select ${date}` : undefined} disabled={day <= 0}
            onPress={() => {onChange(date); setOpen(false);}} style={[styles.day, date === value && {backgroundColor:colors.primary}]}>
            <Text style={[styles.label, date === value && {color:'white'}]}>{day > 0 ? day : ''}</Text>
          </Pressable>;
        })}</View>
        <Pressable accessibilityLabel={`Close calendar ${label}`} onPress={() => setOpen(false)} style={styles.close}><Text style={[styles.label,{color:colors.primary}]}>Close</Text></Pressable>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  label:{fontSize:13,color:colors.text,fontWeight:'600'}, heading:{fontSize:17,color:colors.text,fontWeight:'700'},
  field:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:6,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:12,minHeight:46},
  overlay:{flex:1,justifyContent:'center',padding:24,backgroundColor:'rgba(0,0,0,.45)'}, calendar:{backgroundColor:'white',borderRadius:20,padding:18,gap:12},
  month:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},nav:{padding:10},grid:{flexDirection:'row',flexWrap:'wrap'},
  week:{width:'14.28%',textAlign:'center',color:colors.muted,fontSize:12},day:{width:'14.28%',height:42,justifyContent:'center',alignItems:'center',borderRadius:10},
  close:{padding:12,alignItems:'center'},
});
