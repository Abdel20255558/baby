import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feeding } from '@/types/feeding';

interface EditFeedingModalProps {
  visible: boolean;
  feeding: Feeding | null;
  onConfirm: (updates: Partial<Feeding>) => void;
  onCancel: () => void;
}

export function EditFeedingModal({ visible, feeding, onConfirm, onCancel }: EditFeedingModalProps) {
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [quantityMl, setQuantityMl] = useState('');

  useEffect(() => {
    if (feeding) {
      const durationSeconds = feeding.durationSeconds || feeding.durationMinutes * 60;
      const mins = Math.floor(durationSeconds / 60);
      const secs = durationSeconds % 60;
      setMinutes(mins.toString());
      setSeconds(secs.toString());
      setQuantityMl(feeding.quantityMl ? feeding.quantityMl.toString() : '');
    }
  }, [feeding, visible]);

  const handleConfirm = () => {
    if (!feeding) return;

    const mins = parseInt(minutes, 10) || 0;
    const secs = parseInt(seconds, 10) || 0;
    const totalSeconds = mins * 60 + secs;
    const totalMinutes = Math.round(totalSeconds / 60);

    const updates: Partial<Feeding> = {
      durationSeconds: totalSeconds,
      durationMinutes: totalMinutes,
    };

    if (feeding.type === 'bottle') {
      const qty = parseInt(quantityMl, 10);
      if (!isNaN(qty)) {
        updates.quantityMl = qty;
      }
    }

    onConfirm(updates);
    setMinutes('');
    setSeconds('');
    setQuantityMl('');
  };

  if (!feeding) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.modalContainer}>
            <Text style={styles.title}>Edit Feeding</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationContainer}>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="00"
                    keyboardType="numeric"
                    value={minutes}
                    onChangeText={setMinutes}
                    maxLength={2}
                  />
                  <Text style={styles.durationLabel}>min</Text>
                </View>

                <Text style={styles.separator}>:</Text>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.durationInput}
                    placeholder="00"
                    keyboardType="numeric"
                    value={seconds}
                    onChangeText={setSeconds}
                    maxLength={2}
                  />
                  <Text style={styles.durationLabel}>sec</Text>
                </View>
              </View>
            </View>

            {feeding.type === 'bottle' && (
              <View style={styles.section}>
                <Text style={styles.label}>Quantity (ml)</Text>
                <View style={styles.quantityInputContainer}>
                  <TextInput
                    style={styles.quantityInput}
                    placeholder="120"
                    keyboardType="numeric"
                    value={quantityMl}
                    onChangeText={setQuantityMl}
                  />
                  <Text style={styles.quantityUnit}>ml</Text>
                </View>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  inputGroup: {
    alignItems: 'center',
    gap: 4,
  },
  durationInput: {
    fontSize: 32,
    fontWeight: '600',
    color: '#2D3748',
    borderBottomWidth: 2,
    borderBottomColor: '#A0D8B3',
    minWidth: 60,
    textAlign: 'center',
    paddingVertical: 8,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  separator: {
    fontSize: 28,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  quantityUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#718096',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
  confirmButton: {
    backgroundColor: '#A0D8B3',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22543D',
  },
});
