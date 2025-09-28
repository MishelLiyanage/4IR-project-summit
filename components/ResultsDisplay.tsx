import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { pdfService } from '../services';
import type { UploadResponse } from '../types/api';

interface ResultsDisplayProps {
  uploadResult: UploadResponse;
  onBackToCamera: () => void;
  onRetry?: () => void;
}

export default function ResultsDisplay({ 
  uploadResult, 
  onBackToCamera,
  onRetry 
}: ResultsDisplayProps) {
  
  const handleDownloadPDF = async () => {
    if (!uploadResult.pdfReport) {
      Alert.alert('No PDF Available', 'PDF report is not available for this result.');
      return;
    }

    try {
      const result = await pdfService.downloadPDF(uploadResult.pdfReport, {
        showSuccessMessage: true,
        shareAfterDownload: true,
      });

      if (!result.success) {
        Alert.alert('Download Failed', result.error || 'Failed to download PDF');
      }
    } catch (error) {
      Alert.alert('Download Error', `Failed to download PDF: ${error}`);
    }
  };

  const hasComplianceResult = !!uploadResult.complianceResult;
  const hasPdfReport = !!uploadResult.pdfReport;
  const isCompliant = uploadResult.complianceResult?.is_compliant;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBackToCamera}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analysis Results</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Processing Status */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons 
            name={uploadResult.workflowComplete ? "checkmark-circle" : "time"} 
            size={24} 
            color={uploadResult.workflowComplete ? Colors.success : Colors.warning} 
          />
          <Text style={styles.cardTitle}>Processing Status</Text>
        </View>
        
        <View style={styles.statusGrid}>
          <StatusItem 
            label="Text Extraction" 
            status={uploadResult.processingStages?.textExtraction || 'completed'} 
          />
          <StatusItem 
            label="Regulations Query" 
            status={uploadResult.processingStages?.ragQuery || 'skipped'} 
          />
          <StatusItem 
            label="Compliance Check" 
            status={uploadResult.processingStages?.validation || 'skipped'} 
          />
          <StatusItem 
            label="PDF Generation" 
            status={uploadResult.processingStages?.pdfGeneration || 'skipped'} 
          />
        </View>
      </View>

      {/* Extracted Text */}
      {uploadResult.extractedText && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Extracted Text</Text>
            {uploadResult.confidence && (
              <Text style={styles.confidenceText}>
                {Math.round(uploadResult.confidence * 100)}% confidence
              </Text>
            )}
          </View>
          <Text style={styles.extractedText}>{uploadResult.extractedText}</Text>
        </View>
      )}

      {/* Compliance Status */}
      {hasComplianceResult && (
        <View style={[
          styles.card, 
          isCompliant ? styles.compliantCard : styles.nonCompliantCard
        ]}>
          <View style={styles.cardHeader}>
            <Ionicons 
              name={isCompliant ? "shield-checkmark" : "shield-checkmark-outline"} 
              size={24} 
              color={isCompliant ? Colors.success : Colors.error} 
            />
            <Text style={styles.cardTitle}>Compliance Status</Text>
          </View>
          
          <View style={styles.complianceStatus}>
            <Text style={[
              styles.complianceStatusText,
              { color: isCompliant ? Colors.success : Colors.error }
            ]}>
              {isCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
            </Text>
            
            {uploadResult.complianceResult?.final_score && (
              <Text style={styles.scoreText}>
                Score: {uploadResult.complianceResult.final_score}/100
              </Text>
            )}
          </View>

          {uploadResult.validationResult?.compliance && (
            <View style={styles.complianceDetails}>
              <Text style={styles.detailText}>
                Coverage: {uploadResult.validationResult.compliance.coverage_percent}%
              </Text>
              <Text style={styles.detailText}>
                Requirements Met: {uploadResult.validationResult.compliance.matched_count}/
                {uploadResult.validationResult.compliance.total_required}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* RAG Results */}
      {uploadResult.ragResult && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="library" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Regulations Found</Text>
          </View>
          
          <Text style={styles.ragText} numberOfLines={3}>
            {uploadResult.ragResult.regulations}
          </Text>
          
          {uploadResult.ragResult.sources.length > 0 && (
            <View style={styles.sourcesContainer}>
              <Text style={styles.sourcesTitle}>Sources:</Text>
              {uploadResult.ragResult.sources.slice(0, 3).map((source, index) => (
                <Text key={index} style={styles.sourceText}>• {source}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* PDF Download */}
      {hasPdfReport && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document" size={24} color={Colors.primary} />
            <Text style={styles.cardTitle}>Compliance Report</Text>
          </View>
          
          <Text style={styles.pdfDescription}>
            A detailed compliance report has been generated with all analysis results.
          </Text>
          
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadPDF}>
            <Ionicons name="download" size={20} color={Colors.white} />
            <Text style={styles.downloadButtonText}>Download PDF Report</Text>
          </TouchableOpacity>
          
          <Text style={styles.pdfInfo}>
            {uploadResult.pdfReport?.filename} • {Math.round((uploadResult.pdfReport?.size || 0) / 1024)} KB
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.primaryButton} onPress={onBackToCamera}>
          <Ionicons name="camera" size={20} color={Colors.white} />
          <Text style={styles.primaryButtonText}>Scan Another Label</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function StatusItem({ 
  label, 
  status 
}: { 
  label: string; 
  status: 'pending' | 'completed' | 'failed' | 'skipped' 
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={16} color={Colors.success} />;
      case 'failed':
        return <Ionicons name="close-circle" size={16} color={Colors.error} />;
      case 'pending':
        return <Ionicons name="time" size={16} color={Colors.warning} />;
      case 'skipped':
        return <Ionicons name="remove-circle" size={16} color={Colors.gray} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'completed':
        return Colors.success;
      case 'failed':
        return Colors.error;
      case 'pending':
        return Colors.warning;
      case 'skipped':
        return Colors.gray;
    }
  };

  return (
    <View style={styles.statusItem}>
      {getStatusIcon()}
      <Text style={[styles.statusLabel, { color: getStatusColor() }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.large,
    fontWeight: Typography.weights.semibold,
    color: Colors.darkGray,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.md,
  },
  retryButton: {
    padding: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    ...Shadows.medium,
  },
  compliantCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  nonCompliantCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: Typography.sizes.medium,
    fontWeight: Typography.weights.semibold,
    color: Colors.darkGray,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  confidenceText: {
    fontSize: Typography.sizes.small,
    color: Colors.gray,
    fontWeight: Typography.weights.medium,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginVertical: Spacing.xs,
  },
  statusLabel: {
    fontSize: Typography.sizes.small,
    marginLeft: Spacing.xs,
    fontWeight: Typography.weights.medium,
  },
  extractedText: {
    fontSize: Typography.sizes.medium,
    color: Colors.darkGray,
    lineHeight: 22,
  },
  complianceStatus: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  complianceStatusText: {
    fontSize: Typography.sizes.large,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  scoreText: {
    fontSize: Typography.sizes.medium,
    color: Colors.gray,
    fontWeight: Typography.weights.medium,
  },
  complianceDetails: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  detailText: {
    fontSize: Typography.sizes.small,
    color: Colors.gray,
    marginVertical: Spacing.xs,
  },
  ragText: {
    fontSize: Typography.sizes.medium,
    color: Colors.darkGray,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  sourcesContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
  },
  sourcesTitle: {
    fontSize: Typography.sizes.small,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray,
    marginBottom: Spacing.xs,
  },
  sourceText: {
    fontSize: Typography.sizes.small,
    color: Colors.gray,
    marginVertical: 2,
  },
  pdfDescription: {
    fontSize: Typography.sizes.medium,
    color: Colors.gray,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  downloadButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
  },
  downloadButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.medium,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
  pdfInfo: {
    fontSize: Typography.sizes.small,
    color: Colors.gray,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.medium,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.medium,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.sm,
  },
});