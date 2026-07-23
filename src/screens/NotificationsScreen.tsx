import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import Card from '../components/Card';
import Icon from '../components/Icon';
import {api} from '../api/client';
import {colors} from '../theme/colors';
import {dateText} from '../utils/format';

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  return [];
}

function NotificationCard({
  item,
  onRead,
  onDelete,
}: {
  item: any;
  onRead: (id: number | string) => void;
  onDelete: (id: number | string) => void;
}) {
  const unread = !item?.isRead;
  return (
    <Card style={[styles.notificationCard, unread && styles.unreadCard]}>
      <View style={styles.notificationTop}>
        <View style={[styles.notificationIcon, unread ? styles.unreadIcon : styles.readIcon]}>
          <Icon name={unread ? 'notifications' : 'notifications-outline'} size={18} color={unread ? colors.primary : colors.muted} />
        </View>
        <View style={styles.notificationText}>
          <View style={styles.notificationTitleRow}>
            <Text style={[styles.notificationTitle, unread && styles.unreadTitle]}>{item?.title || 'Notification'}</Text>
            {unread && <View style={styles.unreadDot} />}
          </View>
          {!!item?.message && <Text style={styles.notificationMessage}>{item.message}</Text>}
          <Text style={styles.notificationDate}>{dateText(item?.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.notificationActions}>
        {unread ? (
          <Pressable onPress={() => onRead(item.id)} style={styles.smallAction}>
            <Icon name="checkmark-outline" size={14} color={colors.primary} />
            <Text style={styles.smallActionText}>Read</Text>
          </Pressable>
        ) : (
          <View style={styles.readPill}>
            <Text style={styles.readPillText}>Read</Text>
          </View>
        )}
        <Pressable onPress={() => onDelete(item.id)} style={[styles.smallAction, styles.deleteAction]}>
          <Icon name="trash-outline" size={14} color={colors.danger} />
          <Text style={[styles.smallActionText, styles.deleteText]}>Clear</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function NotificationsScreen({onBack}: {onBack: () => void}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.notifications({page: 0, size: 50});
      setItems(asArray(data));
    } catch (err: any) {
      Alert.alert('Notifications', err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter(item => !item?.isRead).length;
  const visible = useMemo(() => {
    if (filter === 'unread') return items.filter(item => !item?.isRead);
    if (filter === 'read') return items.filter(item => item?.isRead);
    return items;
  }, [filter, items]);

  async function markRead(id: number | string) {
    try {
      await api.markNotificationRead(id);
      setItems(current => current.map(item => (item.id === id ? {...item, isRead: true} : item)));
    } catch (err: any) {
      Alert.alert('Notifications', err.message || 'Unable to mark notification as read.');
    }
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead();
      setItems(current => current.map(item => ({...item, isRead: true})));
    } catch (err: any) {
      Alert.alert('Notifications', err.message || 'Unable to mark all as read.');
    }
  }

  async function deleteOne(id: number | string) {
    try {
      await api.deleteNotification(id);
      setItems(current => current.filter(item => item.id !== id));
    } catch (err: any) {
      Alert.alert('Notifications', err.message || 'Unable to clear notification.');
    }
  }

  function clearAll() {
    Alert.alert('Clear Notifications', 'Clear all notifications?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.clearNotifications();
            setItems([]);
          } catch (err: any) {
            Alert.alert('Notifications', err.message || 'Unable to clear notifications.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.pageHeader}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-back-outline" size={22} color={colors.primary} />
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>Recent alerts and HR updates</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroller}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Card style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Unread</Text>
          <Text style={styles.summaryValue}>{unreadCount}</Text>
        </View>
        <View style={styles.summaryActions}>
          <Pressable disabled={!unreadCount} onPress={markAllRead} style={[styles.summaryButton, !unreadCount && styles.disabledAction]}>
            <Text style={styles.summaryButtonText}>Mark all read</Text>
          </Pressable>
          <Pressable disabled={!items.length} onPress={clearAll} style={[styles.summaryButtonDanger, !items.length && styles.disabledAction]}>
            <Text style={styles.summaryButtonDangerText}>Clear all</Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.toolbar}>
        <View style={styles.filters}>
          {(['all', 'unread', 'read'] as const).map(item => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {visible.length ? (
        visible.map(item => <NotificationCard key={String(item.id)} item={item} onRead={markRead} onDelete={deleteOne} />)
      ) : (
        <Card style={styles.emptyCard}>
          <Icon name="notifications-off-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>You are all caught up.</Text>
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
    minHeight: 88,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOpacity: 0.04,
  },
  summaryLabel: {color: colors.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase'},
  summaryValue: {color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 3},
  summaryActions: {alignItems: 'flex-end', gap: 8},
  summaryButton: {borderRadius: 999, backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 7},
  summaryButtonText: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  summaryButtonDanger: {borderRadius: 999, backgroundColor: colors.dangerLight, paddingHorizontal: 12, paddingVertical: 7},
  summaryButtonDangerText: {color: colors.danger, fontSize: 12, fontWeight: '900'},
  disabledAction: {opacity: 0.45},
  toolbar: {marginBottom: 12},
  filters: {height: 38, flexDirection: 'row', backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 3},
  filter: {flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center'},
  filterActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  filterText: {color: colors.textMid, fontSize: 12, fontWeight: '900', textTransform: 'capitalize'},
  filterTextActive: {color: colors.white},
  notificationCard: {marginBottom: 10, padding: 12, borderRadius: 12, shadowOpacity: 0.04},
  unreadCard: {backgroundColor: colors.white, borderColor: colors.primaryLight},
  notificationTop: {flexDirection: 'row', gap: 10},
  notificationIcon: {width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  unreadIcon: {backgroundColor: colors.primaryLight},
  readIcon: {backgroundColor: colors.surfaceAlt},
  notificationText: {flex: 1},
  notificationTitleRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  notificationTitle: {color: colors.textMid, fontSize: 14, fontWeight: '800', flex: 1, lineHeight: 19},
  unreadTitle: {color: colors.text, fontWeight: '900'},
  unreadDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary},
  notificationMessage: {color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 4},
  notificationDate: {color: colors.subtle, fontSize: 12, fontWeight: '700', marginTop: 7},
  notificationActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10},
  smallAction: {flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.primaryLight},
  smallActionText: {color: colors.primary, fontSize: 12, fontWeight: '900'},
  deleteAction: {backgroundColor: colors.dangerLight},
  deleteText: {color: colors.danger},
  readPill: {borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.successLight},
  readPillText: {color: colors.success, fontSize: 12, fontWeight: '900'},
  emptyCard: {alignItems: 'center', padding: 24},
  emptyTitle: {color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 10},
  emptyText: {color: colors.muted, fontWeight: '700', marginTop: 4},
});
