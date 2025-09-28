/**
 * PDF download and viewing service
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform, Alert, Linking } from 'react-native';
import { ERROR_MESSAGES } from '../constants/config';
import type { PDFReport, ServiceError } from '../types/api';

export interface PDFDownloadOptions {
  showSuccessMessage?: boolean;
  customFilename?: string;
  shareAfterDownload?: boolean;
}

export interface PDFDownloadResult {
  success: boolean;
  filePath?: string;
  filename?: string;
  error?: string;
}

export class PDFService {
  private documentsDirectory: string;

  constructor() {
    this.documentsDirectory = FileSystem.documentDirectory || '';
  }

  /**
   * Download and save PDF from base64 data
   */
  async downloadPDF(
    pdfReport: PDFReport,
    options: PDFDownloadOptions = {}
  ): Promise<PDFDownloadResult> {
    const {
      showSuccessMessage = true,
      customFilename,
      shareAfterDownload = true,
    } = options;

    try {
      // Validate PDF report
      if (!pdfReport.pdf_base64) {
        throw new Error('No PDF data available');
      }

      // Generate filename
      const filename = customFilename || pdfReport.filename || 
        `compliance_report_${Date.now()}.pdf`;
      
      const filePath = `${this.documentsDirectory}${filename}`;

      // Save base64 to file system
      await FileSystem.writeAsStringAsync(filePath, pdfReport.pdf_base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        throw new Error('Failed to save PDF file');
      }

      console.log(`📄 PDF saved successfully: ${filePath}`);
      console.log(`📊 File size: ${fileInfo.size} bytes`);

      // Show success message
      if (showSuccessMessage) {
        Alert.alert(
          'PDF Downloaded',
          `Compliance report saved successfully!\nFile: ${filename}`,
          [
            { text: 'OK' },
            shareAfterDownload && Platform.OS !== 'web' 
              ? { text: 'Share', onPress: () => this.sharePDF(filePath) }
              : null,
          ].filter(Boolean) as any[]
        );
      }

      // Auto-share if requested
      if (shareAfterDownload && Platform.OS !== 'web') {
        await this.sharePDF(filePath);
      }

      return {
        success: true,
        filePath,
        filename,
      };

    } catch (error) {
      console.error('PDF download error:', error);
      
      const errorMessage = (error as Error).message;
      
      if (showSuccessMessage) {
        Alert.alert(
          'Download Failed',
          `Failed to download PDF: ${errorMessage}`,
          [{ text: 'OK' }]
        );
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Share or open PDF file
   */
  async sharePDF(filePath: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.warn('PDF sharing not supported on web platform');
        return false;
      }

      // Try to open with system default
      await Linking.openURL(filePath);
      return true;
    } catch (error) {
      console.error('PDF sharing error:', error);
      Alert.alert('Open Failed', 'Failed to open PDF file');
      return false;
    }
  }

  /**
   * Open PDF file with system default app
   */
  async openPDF(filePath: string): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // For web, we could open in new tab
        console.log('PDF viewing on web - would open in new tab');
        return true;
      }

      // Use sharing to open with default PDF viewer
      await this.sharePDF(filePath);
      return true;
    } catch (error) {
      console.error('PDF opening error:', error);
      return false;
    }
  }

  /**
   * Get list of saved PDF files
   */
  async getSavedPDFs(): Promise<Array<{
    filename: string;
    path: string;
    size: number;
    modificationTime: number;
  }>> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.documentsDirectory);
      const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

      const pdfInfo = await Promise.all(
        pdfFiles.map(async (filename) => {
          const path = `${this.documentsDirectory}${filename}`;
          const info = await FileSystem.getInfoAsync(path);
          
          return {
            filename,
            path,
            size: (info as any).size || 0,
            modificationTime: (info as any).modificationTime || 0,
          };
        })
      );

      // Sort by modification time (newest first)
      return pdfInfo.sort((a, b) => b.modificationTime - a.modificationTime);
    } catch (error) {
      console.error('Failed to get saved PDFs:', error);
      return [];
    }
  }

  /**
   * Delete PDF file
   */
  async deletePDF(filePath: string): Promise<boolean> {
    try {
      await FileSystem.deleteAsync(filePath);
      return true;
    } catch (error) {
      console.error('Failed to delete PDF:', error);
      return false;
    }
  }

  /**
   * Convert base64 to blob URL (for web preview)
   */
  createBlobURL(base64Data: string, mimeType: string = 'application/pdf'): string {
    if (Platform.OS !== 'web') {
      throw new Error('Blob URLs only supported on web platform');
    }

    try {
      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to create blob URL:', error);
      throw new Error('Failed to create PDF preview');
    }
  }

  /**
   * Get PDF file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate PDF report data
   */
  validatePDFReport(pdfReport: PDFReport): ServiceError | null {
    if (!pdfReport) {
      return {
        type: 'PDF_GENERATION_ERROR',
        message: 'No PDF report data provided',
        timestamp: new Date().toISOString(),
      };
    }

    if (!pdfReport.pdf_base64) {
      return {
        type: 'PDF_GENERATION_ERROR',
        message: 'PDF data is missing or empty',
        timestamp: new Date().toISOString(),
      };
    }

    if (!pdfReport.filename) {
      return {
        type: 'PDF_GENERATION_ERROR',
        message: 'PDF filename is missing',
        timestamp: new Date().toISOString(),
      };
    }

    // Validate base64 format
    try {
      atob(pdfReport.pdf_base64.substring(0, 100)); // Test decode small portion
    } catch (error) {
      return {
        type: 'PDF_GENERATION_ERROR',
        message: 'Invalid PDF data format',
        timestamp: new Date().toISOString(),
      };
    }

    return null; // Valid
  }
}

// Create singleton instance
export const pdfService = new PDFService();