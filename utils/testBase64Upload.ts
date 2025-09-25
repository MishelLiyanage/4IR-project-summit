/**
 * Test utility for base64 upload functionality
 * Run this to test the base64 conversion and upload process
 */

import { API_CONFIG } from '../constants/config';
import { uploadService } from '../services/uploadService';

// Mock image URI for testing (you can replace with actual image URI)
const MOCK_IMAGE_URI = 'file:///path/to/test/image.jpg';

export async function testBase64Upload() {
  console.log('🧪 Testing Base64 Upload Functionality');
  console.log('=====================================');
  
  // Test 1: Check if service is properly initialized
  console.log('\n1. Service Initialization:');
  console.log(`✅ Upload service initialized`);
  console.log(`📝 Mock mode: ${API_CONFIG.MOCK_MODE}`);
  console.log(`🌐 Base URL: ${API_CONFIG.BASE_URL}`);
  
  // Test 2: Test health check
  console.log('\n2. Health Check:');
  try {
    const isHealthy = await uploadService.checkHealth();
    console.log(`${isHealthy ? '✅' : '❌'} Backend health: ${isHealthy ? 'OK' : 'Failed'}`);
  } catch (error) {
    console.log(`❌ Health check error: ${error}`);
  }
  
  // Test 3: Test base64 upload with mock data
  console.log('\n3. Base64 Upload Test:');
  console.log('📝 Note: Using mock mode - no real image conversion');
  
  try {
    let progressLogs: string[] = [];
    
    const result = await uploadService.uploadImageWithRetry(
      MOCK_IMAGE_URI,
      {
        tags: ['test', 'base64', 'mock'],
        metadata: {
          testMode: true,
          timestamp: new Date().toISOString(),
        },
      },
      {
        onProgress: (progress) => {
          const logMessage = `📊 ${progress.stage}: ${progress.percentage}% - ${progress.message}`;
          progressLogs.push(logMessage);
          console.log(logMessage);
        },
        validateFile: false, // Skip validation for mock
        maxRetries: 1,
      }
    );
    
    console.log('\n✅ Upload completed successfully!');
    console.log('📋 Result summary:');
    console.log(`   Image ID: ${result.image.id}`);
    console.log(`   Filename: ${result.image.filename}`);
    console.log(`   Size: ${result.image.size} bytes`);
    console.log(`   MIME Type: ${result.image.mimeType}`);
    console.log(`   Upload Time: ${result.image.uploadedAt}`);
    
    if (result.processing) {
      console.log(`   Processing Status: ${result.processing.status}`);
      if (result.processing.extractedText) {
        console.log(`   Extracted Text: "${result.processing.extractedText}"`);
      }
      if (result.processing.confidence) {
        console.log(`   Confidence: ${(result.processing.confidence * 100).toFixed(1)}%`);
      }
    }
    
    console.log('\n📈 Progress Log:');
    progressLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`);
    });
    
  } catch (error) {
    console.log(`❌ Upload failed: ${error}`);
  }
  
  console.log('\n🎉 Test completed!');
  console.log('=====================================');
}

// API Contract Demo
export function showApiContract() {
  console.log('\n📋 Base64 Upload API Contract');
  console.log('==============================');
  
  const sampleRequest = {
    image: {
      data: 'iVBORw0KGgoAAAANSUhEUgAA...', // truncated base64
      mimeType: 'image/jpeg',
      fileName: 'label_photo.jpg',
      size: 1024000
    },
    tags: ['product', 'inventory', 'qr-code'],
    metadata: {
      uploadSource: 'mobile_app',
      deviceInfo: {
        platform: 'ios',
        osVersion: '17.0',
        appVersion: '1.0.0'
      },
      uploadedAt: '2023-01-01T00:00:00.000Z'
    }
  };
  
  console.log('\n📤 Sample Request:');
  console.log(JSON.stringify(sampleRequest, null, 2));
  
  const sampleResponse = {
    success: true,
    data: {
      image: {
        id: 'uuid-v4-string',
        filename: 'processed_label_123.jpg',
        originalName: 'label_photo.jpg',
        size: 1024000,
        mimeType: 'image/jpeg',
        url: 'https://storage.example.com/images/uuid.jpg',
        uploadedAt: '2023-01-01T00:00:00.000Z'
      },
      processing: {
        status: 'completed',
        extractedText: 'ACME Corp - Product ID: 12345',
        confidence: 0.95,
        processingTime: 2500
      }
    }
  };
  
  console.log('\n📥 Sample Response:');
  console.log(JSON.stringify(sampleResponse, null, 2));
}

// Utility to estimate base64 size
export function estimateBase64Size(originalSizeBytes: number): {
  base64Size: number;
  overhead: number;
  percentageIncrease: number;
} {
  // Base64 encoding increases size by ~33%
  const base64Size = Math.ceil(originalSizeBytes * 4 / 3);
  const overhead = base64Size - originalSizeBytes;
  const percentageIncrease = (overhead / originalSizeBytes) * 100;
  
  return {
    base64Size,
    overhead,
    percentageIncrease: Math.round(percentageIncrease * 100) / 100
  };
}

// Example usage:
// import { testBase64Upload, showApiContract } from './testBase64Upload';
// testBase64Upload();
// showApiContract();