# Client-Side File Processing Implementation

## Overview
This document describes the implementation of Option 1 - client-side file processing for resume uploads in the SmartHire application. This implementation allows the application to work correctly in Vercel deployment environments where direct file upload handling is limited.

## Implementation Details

### File Parsing Function
The core of the implementation is the `parseFileContent` function in [Upload.tsx](file:///c:/Users/deepa/Downloads/Hire/SmartHire/client/src/pages/Upload.tsx):

```typescript
const parseFileContent = async (file: File): Promise<string> => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        if (fileExtension === 'pdf') {
          // For PDF files, we'll use pdf-parse library
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Dynamically import pdf-parse to avoid server-side issues
          const pdf = await import('pdf-parse');
          try {
            // Convert ArrayBuffer to Buffer for pdf-parse
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdf.default(buffer);
            resolve(data.text);
          } catch (parseError) {
            reject(new Error(`Failed to parse PDF: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
          }
        } else if (fileExtension === 'docx') {
          // For DOCX files, we'll use mammoth library
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Dynamically import mammoth to avoid server-side issues
          const mammoth = await import('mammoth');
          try {
            const result = await mammoth.default.extractRawText({ arrayBuffer });
            resolve(result.value);
          } catch (parseError) {
            reject(new Error(`Failed to parse DOCX: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
          }
        } else if (fileExtension === 'txt') {
          // For TXT files, we can parse directly
          const content = e.target?.result as string;
          resolve(content);
        } else {
          reject(new Error(`Unsupported file type: ${fileExtension}`));
        }
      } catch (error) {
        reject(new Error(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    if (fileExtension === 'pdf' || fileExtension === 'docx') {
      // For binary files, read as array buffer
      reader.readAsArrayBuffer(file);
    } else {
      // For text files, read as text
      reader.readAsText(file);
    }
  });
};
```

### Key Features

1. **Dynamic Imports**: We use dynamic imports (`await import('pdf-parse')` and `await import('mammoth')`) to avoid server-side issues and only load the libraries when needed.

2. **Buffer Conversion**: For PDF files, we properly convert ArrayBuffer to Buffer using `Buffer.from(arrayBuffer)` to satisfy the pdf-parse library requirements.

3. **Error Handling**: Comprehensive error handling for all file types and parsing operations.

4. **File Type Support**: Support for PDF, DOCX, and TXT files.

5. **Vercel Compatibility**: The implementation works in Vercel deployment environments by processing files entirely on the client-side.

### Integration with Existing Workflow

The client-side file processing integrates seamlessly with the existing 3-step workflow:

1. **Step 1: Upload & Extract**: Files are parsed client-side and sent to the AI service for candidate data extraction
2. **Step 2: Analyze & Match**: Extracted candidate data is matched against job requirements
3. **Step 3: Select & Add**: Selected candidates are added to the database

### Benefits

1. **Vercel Deployment Compatibility**: Works in Vercel serverless environments where direct file upload handling is limited
2. **Reduced Server Load**: File parsing is done on the client-side, reducing server processing requirements
3. **Better User Experience**: Faster processing as files don't need to be uploaded to the server for parsing
4. **Offline Capabilities**: Can work in environments with limited connectivity

### Dependencies

The implementation uses existing dependencies already present in the project:
- `pdf-parse` for PDF file parsing
- `mammoth` for DOCX file parsing

These libraries are already included in the project's package.json file.