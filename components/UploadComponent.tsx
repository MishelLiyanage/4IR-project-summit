import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_CONFIG } from '../constants/config';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { ErrorHandler } from '../services/errorHandler';
import { uploadService } from '../services/uploadService';
import type { UploadProgress } from '../types/api';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<UploadProgress['stage']>('preparing');

  // Real upload function using the upload service
  const performUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStage('preparing');

    try {
      const uploadResult = await uploadService.uploadImageWithRetry(
        imageUri,
        {
          tags: [], // You can add tag input later if needed
          metadata: {
            uploadSource: 'mobile_app',
            timestamp: new Date().toISOString(),
          },
        },
        {
          onProgress: (progress: UploadProgress) => {
            setUploadProgress(progress.percentage);
            setUploadStage(progress.stage);
          },
          maxRetries: 3,
          validateFile: true,
        }
      );

      Alert.alert(
        'Upload Successful!',
        `Your label photo has been uploaded successfully.${
          uploadResult.processing?.extractedText 
            ? `\n\nExtracted text: "${uploadResult.processing.extractedText}"` 
            : ''
        }`,
        [{ text: 'OK', onPress: onUploadComplete }]
      );
    } catch (error) {
      ErrorHandler.handleUploadError(error as Error, performUpload);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('preparing');
    }
  };

  const handleUpload = () => {
    Alert.alert(
      'Upload Photo',
      'Are you sure you want to upload this label photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload', onPress: performUpload },
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
        {isUploading && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
              {uploadStage === 'preparing' && 'Preparing upload...'}
              {uploadStage === 'uploading' && `Uploading... ${Math.round(uploadProgress)}%`}
              {uploadStage === 'processing' && 'Processing image...'}
              {uploadStage === 'completed' && 'Upload completed!'}
              {uploadStage === 'error' && 'Upload failed'}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${uploadProgress}%` }
                ]} 
              />
            </View>
            {uploadStage !== 'completed' && uploadStage !== 'error' && (
              <ActivityIndicator 
                size="large" 
                color={Colors.primary} 
                style={styles.loadingIndicator}
              />
            )}
            {uploadStage === 'completed' && (
              <Ionicons 
                name="checkmark-circle" 
                size={32} 
                color={Colors.primary} 
                style={styles.loadingIndicator}
              />
            )}
            {uploadStage === 'error' && (
              <Ionicons 
                name="close-circle" 
                size={32} 
                color={Colors.error} 
                style={styles.loadingIndicator}
              />
            )}
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
        {API_CONFIG.MOCK_MODE && (
          <View style={[styles.infoItem, styles.mockModeInfo]}>
            <Ionicons name="construct" size={20} color={Colors.warning} />
            <Text style={[styles.infoText, styles.mockModeText]}>
              Demo Mode: Using simulated upload (no real backend)
            </Text>
          </View>
        )}
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
  mockModeInfo: {
    backgroundColor: Colors.warning + '20', // 20% opacity
    borderRadius: BorderRadius.small,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  mockModeText: {
    color: Colors.warning,
    fontWeight: Typography.weights.semibold,
  },
});
