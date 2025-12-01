import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Clock, Droplet } from 'lucide-react-native';
import { useFeeding } from '@/context/FeedingContext';
import {
  filterFeedingsByDate,
  calculateTotalFeedingTime,
  formatDateTime,
  formatDuration,
} from '@/utils/calculations';
import { Feeding, FeedingType } from '@/types/feeding';

type FilterType = 'today' | 'yesterday' | 'week';

interface EditFeedingModalProps {
  visible: boolean;
  feeding: Feeding | null;
  onClose: () => void;
  onSave: (feeding: Feeding) => void;
}

// ✅ Modale de modification + possibilité de CONTINUER la tétée
function EditFeedingModal({ visible, feeding, onClose, onSave }: EditFeedingModalProps) {
  const [type, setType] = useState<FeedingType>('left');
  const [quantity, setQuantity] = useState('');
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueStart, setContinueStart] = useState<Date | null>(null);
  const [continueElapsed, setContinueElapsed] = useState(0); // en secondes

  useEffect(() => {
    if (feeding) {
      setType(feeding.type);
      setQuantity(
        feeding.type === 'bottle' && feeding.quantityMl ? feeding.quantityMl.toString() : ''
      );
      setIsContinuing(false);
      setContinueStart(null);
      setContinueElapsed(0);
    }
  }, [feeding]);

  // Timer pour la continuation
  useEffect(() => {
    let interval: NodeJS.Timer | undefined;
    if (isContinuing && continueStart) {
      interval = setInterval(() => {
        const now = Date.now();
        const diffSec = Math.floor((now - continueStart.getTime()) / 1000);
        setContinueElapsed(diffSec);
      }, 1000);
    } else {
      setContinueElapsed(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isContinuing, continueStart]);

  if (!feeding) return null;

  const handleSaveMeta = () => {
    let quantityNumber: number | undefined = undefined;

    if (type === 'bottle') {
      const parsed = parseInt(quantity, 10);
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Erreur', 'Veuillez entrer une quantité (ml) valide.');
        return;
      }
      quantityNumber = parsed;
    }

    const updated: Feeding = {
      ...feeding,
      type,
      quantityMl: type === 'bottle' ? quantityNumber : undefined,
    };

    onSave(updated);
    onClose();
  };

  const handleStartContinue = () => {
    setContinueStart(new Date());
    setIsContinuing(true);
  };

  const handleStopContinue = () => {
    if (!continueStart || !feeding) {
      setIsContinuing(false);
      return;
    }

    const end = new Date();
    const extraMs = end.getTime() - continueStart.getTime();
    const extraMinutes = Math.round(extraMs / 60000);

    const newDuration = (feeding.durationMinutes || 0) + extraMinutes;

    const updated: Feeding = {
      ...feeding,
      // on considère la nouvelle fin comme maintenant
      endTime: end.toISOString(),
      durationMinutes: newDuration,
      type,
      quantityMl: type === 'bottle' && quantity ? parseInt(quantity, 10) || undefined : feeding.quantityMl,
    };

    onSave(updated);
    setIsContinuing(false);
    setContinueStart(null);
    setContinueElapsed(0);
    onClose();
  };

  const formatSecondsToMinSec = (sec: number): string => {
    const total = Math.max(0, sec);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Modifier la tétée</Text>

          {/* Infos de base : début / fin / durée actuelle */}
          <Text style={styles.modalInfo}>
            Début : {formatDateTime(new Date(feeding.startTime))}
          </Text>
          <Text style={styles.modalInfo}>
            Fin : {formatDateTime(new Date(feeding.endTime))}
          </Text>
          <Text style={styles.modalInfo}>
            Durée actuelle : {feeding.durationMinutes} min
          </Text>

          <View style={styles.modalSeparator} />

          <Text style={styles.modalLabel}>Type</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'left' && styles.typeButtonActive]}
              onPress={() => setType('left')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  type === 'left' && styles.typeButtonTextActive,
                ]}
              >
                Sein gauche
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'right' && styles.typeButtonActive]}
              onPress={() => setType('right')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  type === 'right' && styles.typeButtonTextActive,
                ]}
              >
                Sein droit
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'bottle' && styles.typeButtonActive]}
              onPress={() => setType('bottle')}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  type === 'bottle' && styles.typeButtonTextActive,
                ]}
              >
                Biberon
              </Text>
            </TouchableOpacity>
          </View>

          {type === 'bottle' && (
            <>
              <Text style={styles.modalLabel}>Quantité (ml)</Text>
              <TextInput
                style={styles.modalInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholder="120"
              />
            </>
          )}

          <View style={styles.modalSeparator} />

          {/* Bloc continuation */}
          <Text style={styles.modalLabel}>Continuer cette tétée</Text>
          {!isContinuing ? (
            <TouchableOpacity
              style={[styles.modalButton, styles.modalContinueButton]}
              onPress={handleStartContinue}
            >
              <Text style={styles.modalContinueText}>Démarrer la continuation</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.continueContainer}>
              <Text style={styles.modalInfo}>
                Temps continuation : {formatSecondsToMinSec(continueElapsed)}
              </Text>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalSave]}
                onPress={handleStopContinue}
              >
                <Text style={styles.modalSaveText}>Arrêter et ajouter au temps</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.modalButtonsRow}>
            <TouchableOpacity style={[styles.modalButton, styles.modalCancel]} onPress={onClose}>
              <Text style={styles.modalCancelText}>Fermer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalSave]}
              onPress={handleSaveMeta}
            >
              <Text style={styles.modalSaveText}>Sauvegarder les infos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HistoryScreen() {
  const { feedings, deleteFeeding, updateFeeding } = useFeeding();
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [editingFeeding, setEditingFeeding] = useState<Feeding | null>(null);
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  const filteredFeedings = filterFeedingsByDate(feedings, activeFilter);
  const totalMinutes = calculateTotalFeedingTime(filteredFeedings);

  const getFeedingTypeLabel = (type: FeedingType): string => {
    if (type === 'left') return 'Left';
    if (type === 'right') return 'Right';
    return 'Bottle';
  };

  const getFeedingTypeColor = (type: FeedingType): string => {
    if (type === 'left') return '#BEE3F8';
    if (type === 'right') return '#FED7E2';
    return '#FAF089';
  };

  const getFilterLabel = (filter: FilterType): string => {
    if (filter === 'today') return 'Today';
    if (filter === 'yesterday') return 'Yesterday';
    return 'Last 7 days';
  };

  // Moyenne de l’intervalle entre tétées (en secondes)
  const computeAverageIntervalSeconds = (list: Feeding[]): number => {
    if (list.length < 2) return 0;
    const sorted = [...list].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let sum = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].startTime).getTime();
      const curr = new Date(sorted[i].startTime).getTime();
      sum += (curr - prev) / 1000; // secondes
    }
    return sum / (sorted.length - 1);
  };

  const formatSecondsToMinSec = (sec: number): string => {
    if (!sec || sec <= 0) return '–';
    const total = Math.round(sec);
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes} min ${seconds.toString().padStart(2, '0')} s`;
  };

  const avgIntervalSec = computeAverageIntervalSeconds(filteredFeedings);
  const avgIntervalLabel = formatSecondsToMinSec(avgIntervalSec);

  const handleEditPress = (feeding: Feeding) => {
    setEditingFeeding(feeding);
    setEditModalVisible(true);
  };

  const handleDeletePress = (id: string) => {
    Alert.alert(
      'Supprimer cette tétée ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteFeeding(id);
          },
        },
      ],
      { cancelable: true },
    );
  };

  const handleSaveEdit = async (feeding: Feeding) => {
    await updateFeeding(feeding);
  };

  const renderFeedingItem = (feeding: Feeding) => (
    <View key={feeding.id} style={styles.feedingItem}>
      <View
        style={[
          styles.feedingIndicator,
          { backgroundColor: getFeedingTypeColor(feeding.type) },
        ]}
      />
      <View style={styles.feedingContent}>
        <View style={styles.feedingHeader}>
          <Text style={styles.feedingType}>{getFeedingTypeLabel(feeding.type)}</Text>
          <View style={styles.durationBadge}>
            <Clock size={16} color="#718096" />
            <Text style={styles.durationText}>{feeding.durationMinutes} min</Text>
          </View>
        </View>

        {/* Début + fin */}
        <Text style={styles.feedingTime}>
          Début : {formatDateTime(new Date(feeding.startTime))}
        </Text>
        <Text style={styles.feedingTime}>
          Fin : {formatDateTime(new Date(feeding.endTime))}
        </Text>

        {feeding.quantityMl && (
          <View style={styles.quantityContainer}>
            <Droplet size={16} color="#4299E1" />
            <Text style={styles.quantityText}>{feeding.quantityMl} ml</Text>
          </View>
        )}
      </View>

      {/* Boutons Edit / Delete */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditPress(feeding)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeletePress(feeding.id)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
          <Text
            style={[
              styles.filterText,
              activeFilter === 'yesterday' && styles.filterTextActive,
            ]}
          >
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

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>
          Total feeding time {getFilterLabel(activeFilter).toLowerCase()}
        </Text>
        <Text style={styles.totalValue}>{formatDuration(totalMinutes)}</Text>
        <Text style={styles.totalCount}>
          {filteredFeedings.length} feeding
          {filteredFeedings.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.totalAverage}>
          Average interval between feedings: {avgIntervalLabel}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filteredFeedings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No feedings recorded {getFilterLabel(activeFilter).toLowerCase()}
            </Text>
          </View>
        ) : (
          filteredFeedings.map(renderFeedingItem)
        )}
      </ScrollView>

      <EditFeedingModal
        visible={isEditModalVisible}
        feeding={editingFeeding}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEdit}
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
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    marginRight: 8,
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
  totalCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#2D3748',
  },
  totalCount: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 8,
  },
  totalAverage: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
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
    alignItems: 'center',
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
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
    marginLeft: 4,
  },
  feedingTime: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
    marginLeft: 4,
  },
  actionContainer: {
    paddingRight: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginVertical: 2,
  },
  editButton: {
    backgroundColor: '#EDF2F7',
  },
  deleteButton: {
    backgroundColor: '#FED7D7',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D3748',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalInfo: {
    fontSize: 13,
    color: '#4A5568',
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 6,
  },
  typeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    marginRight: 6,
  },
  typeButtonActive: {
    backgroundColor: '#A0D8B3',
  },
  typeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  typeButtonTextActive: {
    color: '#22543D',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 8,
  },
  modalCancel: {
    backgroundColor: '#E2E8F0',
  },
  modalSave: {
    backgroundColor: '#A0D8B3',
  },
  modalCancelText: {
    fontWeight: '600',
    color: '#4A5568',
  },
  modalSaveText: {
    fontWeight: '600',
    color: '#2D3748',
  },
  modalContinueButton: {
    backgroundColor: '#EDF2F7',
    marginTop: 4,
  },
  modalContinueText: {
    fontWeight: '600',
    color: '#2D3748',
  },
  continueContainer: {
    marginTop: 4,
  },
});
