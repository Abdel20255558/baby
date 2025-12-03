import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Clock, Droplet, Edit2, Trash2, TrendingUp } from 'lucide-react-native';
import { useFeeding } from '@/context/FeedingContext';
import { filterFeedingsByDate, calculateTotalFeedingTime, formatDateTime, formatDurationSeconds } from '@/utils/calculations';
import { Feeding } from '@/types/feeding';
import { EditFeedingModal } from '@/components/EditFeedingModal';

type FilterType = 'today' | 'yesterday' | 'week';

export default function HistoryScreen() {
  const { feedings, updateFeeding, deleteFeeding } = useFeeding();
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);

  const filteredFeedings = filterFeedingsByDate(feedings, activeFilter);
  const totalSeconds = calculateTotalFeedingTime(filteredFeedings) * 60;

  const getFeedingTypeLabel = (type: 'left' | 'right' | 'bottle'): string => {
    if (type === 'left') return 'Left';
    if (type === 'right') return 'Right';
    return 'Bottle';
  };

  const getFeedingTypeColor = (type: 'left' | 'right' | 'bottle'): string => {
    if (type === 'left') return '#BEE3F8';
    if (type === 'right') return '#FED7E2';
    return '#FAF089';
  };

  const getFilterLabel = (filter: FilterType): string => {
    if (filter === 'today') return 'Today';
    if (filter === 'yesterday') return 'Yesterday';
    return 'Last 7 days';
  };

  const handleEdit = (feeding: Feeding) => {
    setEditingFeeding(feeding);
  };

  const handleDelete = (feeding: Feeding) => {
    Alert.alert(
      'Delete Feeding',
      'Are you sure you want to delete this feeding record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteFeeding(feeding.id);
          },
        },
      ]
    );
  };

  const handleEditConfirm = async (updates: Partial<Feeding>) => {
    if (editingFeeding) {
      await updateFeeding(editingFeeding.id, updates);
      setEditingFeeding(null);
    }
  };

  const getDurationDisplay = (feeding: Feeding): string => {
    const totalSeconds = feeding.durationSeconds || feeding.durationMinutes * 60;
    return formatDurationSeconds(totalSeconds);
  };

  const calculateAverageFeeding = (): number => {
    if (filteredFeedings.length === 0) return 0;
    const total = filteredFeedings.reduce((sum, f) => sum + (f.durationSeconds || f.durationMinutes * 60), 0);
    return Math.round(total / filteredFeedings.length);
  };

  const calculateAverageInterval = (): number => {
    if (filteredFeedings.length < 2) return 0;
    const sorted = [...filteredFeedings].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let totalInterval = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].startTime).getTime();
      const curr = new Date(sorted[i].startTime).getTime();
      totalInterval += curr - prev;
    }
    return Math.round(totalInterval / (sorted.length - 1) / 1000 / 60);
  };

  const getLeftBreastCount = (): number => filteredFeedings.filter(f => f.type === 'left').length;
  const getRightBreastCount = (): number => filteredFeedings.filter(f => f.type === 'right').length;
  const getBottleCount = (): number => filteredFeedings.filter(f => f.type === 'bottle').length;

  const getTotalBottleQuantity = (): number => {
    return filteredFeedings
      .filter(f => f.type === 'bottle' && f.quantityMl)
      .reduce((sum, f) => sum + (f.quantityMl || 0), 0);
  };

  const renderFeedingItem = (feeding: Feeding) => (
    <View key={feeding.id} style={styles.feedingItem}>
      <View style={[styles.feedingIndicator, { backgroundColor: getFeedingTypeColor(feeding.type) }]} />

      <View style={styles.feedingContent}>
        <View style={styles.feedingHeader}>
          <Text style={styles.feedingType}>{getFeedingTypeLabel(feeding.type)}</Text>
          <View style={styles.durationBadge}>
            <Clock size={16} color="#718096" />
            <Text style={styles.durationText}>{getDurationDisplay(feeding)}</Text>
          </View>
        </View>

        <Text style={styles.feedingTime}>{formatDateTime(new Date(feeding.endTime))}</Text>

        {feeding.quantityMl && (
          <View style={styles.quantityContainer}>
            <Droplet size={16} color="#4299E1" />
            <Text style={styles.quantityText}>{feeding.quantityMl} ml</Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(feeding)}
          >
            <Edit2 size={16} color="#4299E1" strokeWidth={2.5} />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteActionButton]}
            onPress={() => handleDelete(feeding)}
          >
            <Trash2 size={16} color="#FC8181" strokeWidth={2.5} />
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const averageFeedingSeconds = calculateAverageFeeding();
  const averageIntervalMinutes = calculateAverageInterval();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Feeding History</Text>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'today' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('today')}
        >
          <Text style={[styles.filterText, activeFilter === 'today' && styles.filterTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'yesterday' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('yesterday')}
        >
          <Text style={[styles.filterText, activeFilter === 'yesterday' && styles.filterTextActive]}>
            Yesterday
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, activeFilter === 'week' && styles.filterButtonActive]}
          onPress={() => setActiveFilter('week')}
        >
          <Text style={[styles.filterText, activeFilter === 'week' && styles.filterTextActive]}>
            Last 7 days
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <TrendingUp size={24} color="#A0D8B3" strokeWidth={2.5} />
          <Text style={styles.summaryTitle}>Analytics</Text>
        </View>

        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Total Feedings</Text>
            <Text style={styles.analyticsValue}>{filteredFeedings.length}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Total Time</Text>
            <Text style={styles.analyticsValue}>{formatDurationSeconds(totalSeconds)}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Avg Duration</Text>
            <Text style={styles.analyticsValue}>{formatDurationSeconds(averageFeedingSeconds)}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Avg Interval</Text>
            <Text style={styles.analyticsValue}>{averageIntervalMinutes}m</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Left Breast</Text>
            <Text style={styles.analyticsValue}>{getLeftBreastCount()}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Right Breast</Text>
            <Text style={styles.analyticsValue}>{getRightBreastCount()}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Bottles</Text>
            <Text style={styles.analyticsValue}>{getBottleCount()}</Text>
          </View>

          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsLabel}>Total Bottle</Text>
            <Text style={styles.analyticsValue}>{getTotalBottleQuantity()} ml</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredFeedings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No feedings recorded {getFilterLabel(activeFilter).toLowerCase()}</Text>
          </View>
        ) : (
          filteredFeedings.map(renderFeedingItem)
        )}
      </ScrollView>

      <EditFeedingModal
        visible={editingFeeding !== null}
        feeding={editingFeeding}
        onConfirm={handleEditConfirm}
        onCancel={() => setEditingFeeding(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3748',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#A0D8B3',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  filterTextActive: {
    color: '#22543D',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  analyticsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analyticsItem: {
    width: '48%',
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 4,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  feedingItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  feedingIndicator: {
    width: 6,
  },
  feedingContent: {
    flex: 1,
    padding: 16,
  },
  feedingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedingType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F7FAFC',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  feedingTime: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
  },
  deleteActionButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4299E1',
  },
  deleteText: {
    color: '#FC8181',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
