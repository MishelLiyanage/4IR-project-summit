import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import CameraComponent from '@/components/CameraComponent';
import UploadComponent from '@/components/UploadComponent';
import ResultsDisplay from '@/components/ResultsDisplay';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import type { UploadResponse } from '@/types/api';

type AppState = 'camera' | 'upload' | 'results';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('camera');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);

  const handlePhotoTaken = (uri: string) => {
    setSelectedImage(uri);
    setCurrentState('upload');
  };

  const handleUploadComplete = (result: UploadResponse) => {
    setUploadResult(result);
    setCurrentState('results');
  };

  const handleBackToCamera = () => {
    setSelectedImage(null);
    setUploadResult(null);
    setCurrentState('camera');
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setUploadResult(null);
    setCurrentState('camera');
  };

  const handleRetry = () => {
    if (selectedImage) {
      setCurrentState('upload');
    } else {
      setCurrentState('camera');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      
      {currentState === 'camera' && (
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="camera" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Label Photo Scanner</Text>
            <Text style={styles.subtitle}>
              Take a photo of a label to scan and upload
            </Text>
          </View>
          
          <CameraComponent onPhotoTaken={handlePhotoTaken} />
          
          <View style={styles.footer}>
            <View style={styles.instructionCard}>
              <Ionicons name="bulb" size={20} color={Colors.secondary} />
              <Text style={styles.instructionText}>
                Position the label clearly in the camera frame for best results
              </Text>
            </View>
          </View>
        </View>
      )}

      {currentState === 'upload' && selectedImage && (
        <UploadComponent
          imageUri={selectedImage}
          onUploadComplete={handleUploadComplete}
          onCancel={handleCancel}
        />
      )}

      {currentState === 'results' && uploadResult && (
        <ResultsDisplay
          uploadResult={uploadResult}
          onBackToCamera={handleBackToCamera}
          onRetry={handleRetry}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    marginBottom: Spacing.lg,
  },
  headerIcon: {
    backgroundColor: Colors.gray,
    padding: Spacing.md,
    borderRadius: BorderRadius.xlarge,
    marginBottom: Spacing.md,
    ...Shadows.small,
  },
  title: {
    fontSize: Typography.sizes.xlarge,
    fontWeight: Typography.weights.bold,
    color: Colors.darkGray,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.medium,
    color: Colors.secondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    ...Shadows.small,
  },
  instructionText: {
    marginLeft: Spacing.sm,
    fontSize: Typography.sizes.small,
    color: Colors.secondary,
    flex: 1,
  },
});
