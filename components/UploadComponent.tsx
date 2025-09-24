import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

interface UploadComponentProps {
  imageUri: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

export default function UploadComponent({ 
  imageUri, 
  onUploadComplete, 
  onCancel 
}: UploadComponentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Simulated upload function - replace with your actual upload logic
  const simulateUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setUploadProgress(i);
      }

      // Here you would implement your actual upload logic
      // Example: upload to Firebase, AWS S3, or your backend server
      
      Alert.alert(
        'Upload Successful!',
        'Your label photo has been uploaded successfully.',
        [{ text: 'OK', onPress: onUploadComplete }]
      );
    } catch (error) {
      Alert.alert(
        'Upload Failed',
        'Failed to upload the image. Please try again.',
        [{ text: 'OK' }]
      );
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!description.trim()) {
      Alert.alert(
        'Description Required',
        'Please add a description for your label photo.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Upload Photo',
      'Are you sure you want to upload this label photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload', onPress: simulateUpload },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <Ionicons name="arrow-back" size={24} color={Colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Label Photo</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image source={{ uri: imageUri }} style={styles.image} />
        <View style={styles.imageOverlay}>
          <Ionicons name="image" size={24} color={Colors.white} />
        </View>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Describe what's on this label..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          placeholderTextColor={Colors.lightGray}
          editable={!isUploading}
        />

        {isUploading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              Uploading... {uploadProgress}%
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            <ActivityIndicator 
              size="large" 
              color={Colors.primary} 
              style={styles.loadingIndicator}
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.cancelButton, isUploading && styles.disabledButton]}
            onPress={onCancel}
            disabled={isUploading}
          >
            <Ionicons name="close" size={20} color={Colors.secondary} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadButton, isUploading && styles.disabledButton]}
            onPress={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="cloud-upload" size={20} color={Colors.white} />
            )}
            <Text style={styles.uploadButtonText}>
              {isUploading ? 'Uploading...' : 'Upload'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.infoItem}>
          <Ionicons name="information-circle" size={20} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Make sure the label text is clearly visible in the photo
          </Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
          <Text style={styles.infoText}>
            Your photos are processed securely and safely
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.sizes.large,
    fontWeight: Typography.weights.semibold,
    color: Colors.darkGray,
  },
  imageContainer: {
    position: 'relative',
    margin: Spacing.md,
    borderRadius: BorderRadius.medium,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray,
  },
  imageOverlay: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: Spacing.xs,
  },
  formContainer: {
    paddingHorizontal: Spacing.md,
  },
  label: {
    fontSize: Typography.sizes.medium,
    fontWeight: Typography.weights.semibold,
    color: Colors.darkGray,
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    fontSize: Typography.sizes.medium,
    color: Colors.darkGray,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  progressContainer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  progressText: {
    fontSize: Typography.sizes.medium,
    color: Colors.secondary,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  loadingIndicator: {
    marginTop: Spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.secondary,
    borderRadius: BorderRadius.medium,
    backgroundColor: Colors.white,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  disabledButton: {
    opacity: 0.6,
  },
  cancelButtonText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.sizes.medium,
    color: Colors.secondary,
    fontWeight: Typography.weights.semibold,
  },
  uploadButtonText: {
    marginLeft: Spacing.xs,
    fontSize: Typography.sizes.medium,
    color: Colors.white,
    fontWeight: Typography.weights.semibold,
  },
  infoContainer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.small,
    color: Colors.secondary,
    flex: 1,
  },
});
