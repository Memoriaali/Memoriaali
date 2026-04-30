/**
 * SIP Metadata Generation Service
 *
 * Provides comprehensive metadata generation for SIP packages with support for
 * Dublin Core, PREMIS preservation metadata, and EAD2002 formats. Follows
 * Finnish archival standards and E-ARK specification compliance.
 *
 * Design by Contract:
 * - Preconditions: Valid document metadata structure, accessible file paths
 * - Postconditions: Well-formed XML metadata with proper escaping
 * - Invariants: XML validity, UTF-8 encoding, archival compliance
 */

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { basename, extname } from 'path';

import { ERROR_CODES, HttpException } from '../../../shared/errors';
import { type DocumentMetadata, parseDocumentMetadata } from '../types/metadata.types';

// Types for metadata structures
interface Document {
  id: string;
  fileName: string;
  mimeType?: string | null;
  ocrText?: string | null;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

interface FileChecksumInfo {
  filepath: string;
  filename: string;
  size: number;
  md5: string;
  sha1: string;
  sha256: string;
  mimeType?: string;
  lastModified: Date;
}

/**
 * Metadata Generation Service for SIP Packages
 *
 * Generates standards-compliant metadata in multiple formats for archival
 * preservation packages. Supports Dublin Core, PREMIS, and EAD2002 with
 * proper XML validation and character escaping.
 */
export class MetadataService {
  private readonly namespace = {
    dc: 'http://purl.org/dc/elements/1.1/',
    dcterms: 'http://purl.org/dc/terms/',
    premis: 'http://www.loc.gov/premis/v3',
    ead: 'urn:isbn:1-931666-22-9',
    mets: 'http://www.loc.gov/METS/',
    xlink: 'http://www.w3.org/1999/xlink',
    xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  };

  /**
   * Generate Dublin Core XML from document metadata
   *
   * Creates DC-compliant XML metadata from the document's metadata structure.
   * Maps Finnish archival fields to standardized Dublin Core elements.
   *
   * @param document - Document with metadata to convert
   * @returns Well-formed Dublin Core XML string
   *
   * Preconditions: Document with valid metadata structure
   * Postconditions: Valid Dublin Core XML with proper namespace declarations
   * Invariants: XML well-formedness, UTF-8 encoding
   */
  generateDublinCoreXML(document: Document): string {
    try {
      // Validate and extract metadata with proper typing
      const validatedMetadata = parseDocumentMetadata(document.metadata);
      const dc = validatedMetadata.dublinCore ?? {};
      const archival = validatedMetadata.archival ?? {};

      // Build XML with proper namespace declarations
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<metadata xmlns:dc="${this.namespace.dc}" `;
      xml += `xmlns:dcterms="${this.namespace.dcterms}" `;
      xml += `xmlns:xsi="${this.namespace.xsi}">\n`;

      // Core Dublin Core elements with fallbacks from archival metadata
      const elements = [
        { element: 'dc:title', value: dc.header ?? archival?.header?.title ?? document.fileName },
        { element: 'dc:creator', value: dc.author ?? archival?.personNames?.creator },
        { element: 'dc:subject', value: dc.subject ?? archival?.subjectIndexing?.subject },
        { element: 'dc:description', value: dc.description ?? document.ocrText?.substring(0, 500) },
        { element: 'dc:publisher', value: dc.publisher ?? 'Memoriaali Digital Archive' },
        { element: 'dc:contributor', value: dc.interviewer ?? archival?.personNames?.interviewer },
        { element: 'dc:date', value: dc.date ?? this.formatDate(document.createdAt) },
        { element: 'dc:type', value: dc.type ?? this.inferType(document.mimeType) },
        { element: 'dc:format', value: document.mimeType },
        { element: 'dc:identifier', value: document.id },
        { element: 'dc:source', value: dc.source },
        { element: 'dc:language', value: dc.language ?? 'fi' },
        { element: 'dc:relation', value: dc.relation },
        { element: 'dc:coverage', value: dc.location ?? archival?.header?.location },
        { element: 'dc:rights', value: dc.rights ?? 'Protected by copyright' },
      ];

      // Add elements with values
      elements.forEach(({ element, value }) => {
        if (value) {
          xml += `  <${element}>${this.escapeXML(this.stringifyValue(value))}</${element}>\n`;
        }
      });

      // Add linked data URIs if available
      const linkedData = document.metadata?.linkedData;
      if (linkedData) {
        Object.entries(linkedData).forEach(([key, iri]) => {
          if (iri && typeof iri === 'string') {
            const cleanKey = key.replace('_iri', '');
            xml += `  <dcterms:${cleanKey} xsi:type="dcterms:URI">${this.escapeXML(iri)}</dcterms:${cleanKey}>\n`;
          }
        });
      }

      // Add additional technical metadata
      xml += `  <dcterms:created>${this.formatDate(document.createdAt)}</dcterms:created>\n`;
      xml += `  <dcterms:modified>${this.formatDate(document.updatedAt)}</dcterms:modified>\n`;

      if (document.user) {
        const userDisplayName =
          [document.user.firstName, document.user.lastName].filter(Boolean).join(' ') ||
          document.user.username;
        xml += `  <dcterms:creator>${this.escapeXML(userDisplayName)}</dcterms:creator>\n`;
      }

      xml += '</metadata>\n';

      console.info(`✅ Generated Dublin Core XML for document ${document.id}`);
      return xml;
    } catch (error) {
      console.error(`❌ Failed to generate Dublin Core XML for document ${document.id}:`, error);
      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to generate Dublin Core metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate PREMIS preservation metadata XML
   *
   * Creates PREMIS v3.0 compliant preservation metadata for the SIP package.
   * Includes object characteristics, provenance events, and rights information.
   *
   * @param sipId - SIP package identifier
   * @param documents - Array of documents in the package
   * @returns Well-formed PREMIS XML string
   *
   * Preconditions: Valid SIP ID and document array
   * Postconditions: PREMIS v3.0 compliant XML with preservation metadata
   * Invariants: Schema compliance, complete provenance tracking
   */
  generatePremisXML(sipId: string, documents: Document[]): string {
    try {
      if (!sipId || !documents || documents.length === 0) {
        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          'SIP ID and documents are required for PREMIS generation',
        );
      }

      const now = new Date();

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<premis:premis version="3.0" `;
      xml += `xmlns:premis="${this.namespace.premis}" `;
      xml += `xmlns:xsi="${this.namespace.xsi}" `;
      xml += `xsi:schemaLocation="${this.namespace.premis} http://www.loc.gov/standards/premis/premis.xsd">\n`;

      // Object entities for each document
      documents.forEach((document) => {
        xml += this.generatePremisObject(document);
      });

      // Events for the SIP creation process
      xml += this.generatePremisEvents(sipId, documents, now);

      // Agent information
      xml += this.generatePremisAgents();

      // Rights information
      xml += this.generatePremisRights(sipId);

      xml += '</premis:premis>\n';

      console.info(`✅ Generated PREMIS XML for SIP ${sipId} with ${documents.length} documents`);
      return xml;
    } catch (error) {
      console.error(`❌ Failed to generate PREMIS XML for SIP ${sipId}:`, error);
      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to generate PREMIS metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate EAD2002 metadata XML
   *
   * Creates EAD (Encoded Archival Description) metadata following the 2002 standard.
   * Provides hierarchical description suitable for archival finding aids.
   *
   * @param document - Document to describe in EAD format
   * @returns Well-formed EAD2002 XML string
   *
   * Preconditions: Document with archival metadata
   * Postconditions: EAD2002 compliant XML with archival description
   * Invariants: EAD schema compliance, proper hierarchy
   */
  generateEADMetadata(document: Document): string {
    try {
      // Validate and extract metadata with proper typing
      const validatedMetadata = parseDocumentMetadata(document.metadata);
      const ead = validatedMetadata.ead ?? {};
      const archival = validatedMetadata.archival ?? {};
      const dc = validatedMetadata.dublinCore ?? {};

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<ead xmlns="${this.namespace.ead}" `;
      xml += `xmlns:xsi="${this.namespace.xsi}" `;
      xml += `xsi:schemaLocation="${this.namespace.ead} http://www.loc.gov/ead/ead.xsd">\n`;

      // EAD Header
      xml += '  <eadheader>\n';
      xml += '    <eadid countrycode="FI" mainagencycode="MEMORIAALI">';
      xml += this.escapeXML(document.id);
      xml += '</eadid>\n';
      xml += '    <filedesc>\n';
      xml += '      <titlestmt>\n';
      xml += '        <titleproper>';
      xml += this.escapeXML(
        ead.titleproper ?? dc.header ?? archival?.header?.title ?? document.fileName,
      );
      xml += '</titleproper>\n';
      xml += '      </titlestmt>\n';
      xml += '      <publicationstmt>\n';
      xml += '        <publisher>Memoriaali Digital Archive</publisher>\n';
      xml += `        <date>${this.formatDate(new Date())}</date>\n`;
      xml += '      </publicationstmt>\n';
      xml += '    </filedesc>\n';
      xml += '  </eadheader>\n';

      // Archival Description
      xml += '  <archdesc level="item">\n';
      xml += '    <did>\n';
      xml += `      <unittitle>${this.escapeXML(ead.unittitle ?? dc.header ?? document.fileName)}</unittitle>\n`;
      xml += `      <unitdate>${this.escapeXML(dc.date ?? this.formatDate(document.createdAt))}</unitdate>\n`;
      xml += `      <unitid>${this.escapeXML(document.id)}</unitid>\n`;

      if (dc.description ?? document.ocrText) {
        xml += `      <abstract>${this.escapeXML((dc.description ?? document.ocrText)?.substring(0, 500) ?? '')}</abstract>\n`;
      }

      xml += '    </did>\n';

      // Biographical/Historical note
      if (archival?.personNames || dc.author) {
        xml += '    <bioghist>\n';
        xml += '      <head>Biographical/Historical Information</head>\n';
        if (dc.author) {
          xml += `      <p>Creator: ${this.escapeXML(dc.author)}</p>\n`;
        }
        if (archival?.personNames?.interviewer) {
          xml += `      <p>Interviewer: ${this.escapeXML(archival.personNames.interviewer)}</p>\n`;
        }
        if (archival?.personNames?.interviewee) {
          xml += `      <p>Interviewee: ${this.escapeXML(archival.personNames.interviewee)}</p>\n`;
        }
        xml += '    </bioghist>\n';
      }

      // Scope and Content
      if (dc.description || dc.subject) {
        xml += '    <scopecontent>\n';
        xml += '      <head>Scope and Content</head>\n';
        if (dc.description) {
          xml += `      <p>${this.escapeXML(dc.description)}</p>\n`;
        }
        if (dc.subject) {
          xml += `      <p>Subject: ${this.escapeXML(this.stringifyValue(dc.subject))}</p>\n`;
        }
        xml += '    </scopecontent>\n';
      }

      // Physical description
      xml += '    <physdesc>\n';
      xml += `      <extent>1 digital file</extent>\n`;
      if (document.mimeType) {
        xml += `      <physfacet>${this.escapeXML(document.mimeType)}</physfacet>\n`;
      }
      xml += '    </physdesc>\n';

      // Access conditions
      xml += '    <accessrestrict>\n';
      xml += '      <head>Access Conditions</head>\n';
      xml += '      <p>Available for research use.</p>\n';
      xml += '    </accessrestrict>\n';

      xml += '  </archdesc>\n';
      xml += '</ead>\n';

      console.info(`✅ Generated EAD metadata for document ${document.id}`);
      return xml;
    } catch (error) {
      console.error(`❌ Failed to generate EAD metadata for document ${document.id}:`, error);
      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to generate EAD metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Properly escape XML special characters
   *
   * Escapes characters that have special meaning in XML to prevent
   * parsing errors and potential security vulnerabilities.
   *
   * @param text - Text to escape
   * @returns XML-safe escaped text
   *
   * Preconditions: Input text string
   * Postconditions: All XML special characters properly escaped
   * Invariants: No XML parsing conflicts, security-safe output
   */
  escapeXML(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return (
      text
        .replace(/&/g, '&amp;') // Must be first to avoid double escaping
        .replace(/</g, '&lt;') // Less than
        .replace(/>/g, '&gt;') // Greater than
        .replace(/"/g, '&quot;') // Double quote
        .replace(/'/g, '&apos;') // Single quote/apostrophe
        // eslint-disable-next-line no-control-regex -- Intentionally removing control characters from XML
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    ); // Remove control characters
  }

  /**
   * Calculate multiple checksums for file integrity verification
   *
   * Generates MD5, SHA-1, and SHA-256 checksums for comprehensive file
   * integrity verification and preservation metadata requirements.
   *
   * @param filepath - Path to file for checksum calculation
   * @returns File checksum information object
   *
   * Preconditions: Readable file at specified path
   * Postconditions: Multiple checksum algorithms calculated
   * Invariants: Cryptographic integrity verification capabilities
   */
  async calculateChecksum(filepath: string): Promise<FileChecksumInfo> {
    try {
      if (!filepath || typeof filepath !== 'string') {
        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          'Valid file path is required',
        );
      }

      // Verify file exists and is readable
      const stats = await fs.stat(filepath);
      if (!stats.isFile()) {
        throw HttpException.badRequest(
          ERROR_CODES.FILE.NOT_FOUND,
          'Path does not point to a regular file',
        );
      }

      // Read file data
      const data = await fs.readFile(filepath);

      // Calculate multiple checksums
      const md5 = createHash('md5').update(data).digest('hex');
      const sha1 = createHash('sha1').update(data).digest('hex');
      const sha256 = createHash('sha256').update(data).digest('hex');

      const result: FileChecksumInfo = {
        filepath,
        filename: basename(filepath),
        size: stats.size,
        md5,
        sha1,
        sha256,
        mimeType: this.inferMimeType(filepath) ?? 'application/octet-stream',
        lastModified: stats.mtime,
      };

      console.info(`✅ Calculated checksums for ${result.filename} (${result.size} bytes)`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to calculate checksum for ${filepath}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.FILE.PROCESSING_FAILED,
        `Failed to calculate checksum: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ===========================
  // Private Helper Methods
  // ===========================

  /**
   * Generate PREMIS object entity for a document
   */
  private generatePremisObject(document: Document): string {
    let xml = '  <premis:object>\n';
    xml += `    <premis:objectIdentifier>\n`;
    xml += `      <premis:objectIdentifierType>UUID</premis:objectIdentifierType>\n`;
    xml += `      <premis:objectIdentifierValue>${this.escapeXML(document.id)}</premis:objectIdentifierValue>\n`;
    xml += `    </premis:objectIdentifier>\n`;

    xml += `    <premis:objectCategory>file</premis:objectCategory>\n`;

    // Object characteristics
    xml += `    <premis:objectCharacteristics>\n`;
    if (document.mimeType) {
      xml += `      <premis:format>\n`;
      xml += `        <premis:formatDesignation>\n`;
      xml += `          <premis:formatName>${this.escapeXML(document.mimeType)}</premis:formatName>\n`;
      xml += `        </premis:formatDesignation>\n`;
      xml += `      </premis:format>\n`;
    }
    xml += `    </premis:objectCharacteristics>\n`;

    // Original name
    xml += `    <premis:originalName>${this.escapeXML(document.fileName)}</premis:originalName>\n`;

    xml += '  </premis:object>\n';
    return xml;
  }

  /**
   * Generate PREMIS events for SIP creation
   */
  private generatePremisEvents(sipId: string, documents: Document[], eventDate: Date): string {
    let xml = '';

    // Ingestion event
    xml += '  <premis:event>\n';
    xml += '    <premis:eventIdentifier>\n';
    xml += '      <premis:eventIdentifierType>UUID</premis:eventIdentifierType>\n';
    xml += `      <premis:eventIdentifierValue>${sipId}-ingestion</premis:eventIdentifierValue>\n`;
    xml += '    </premis:eventIdentifier>\n';
    xml += '    <premis:eventType>ingestion</premis:eventType>\n';
    xml += `    <premis:eventDateTime>${eventDate.toISOString()}</premis:eventDateTime>\n`;
    xml +=
      '    <premis:eventDetail>SIP package creation and ingestion into digital archive</premis:eventDetail>\n';
    xml += '    <premis:eventOutcome>success</premis:eventOutcome>\n';
    xml += '  </premis:event>\n';

    return xml;
  }

  /**
   * Generate PREMIS agent information
   */
  private generatePremisAgents(): string {
    let xml = '  <premis:agent>\n';
    xml += '    <premis:agentIdentifier>\n';
    xml += '      <premis:agentIdentifierType>URI</premis:agentIdentifierType>\n';
    xml +=
      '      <premis:agentIdentifierValue>https://memoriaali.fi</premis:agentIdentifierValue>\n';
    xml += '    </premis:agentIdentifier>\n';
    xml += '    <premis:agentName>Memoriaali Digital Archive System</premis:agentName>\n';
    xml += '    <premis:agentType>software</premis:agentType>\n';
    xml += '  </premis:agent>\n';

    return xml;
  }

  /**
   * Generate PREMIS rights information
   */
  private generatePremisRights(sipId: string): string {
    let xml = '  <premis:rights>\n';
    xml += '    <premis:rightsStatement>\n';
    xml += '      <premis:rightsStatementIdentifier>\n';
    xml +=
      '        <premis:rightsStatementIdentifierType>LOCAL</premis:rightsStatementIdentifierType>\n';
    xml += `        <premis:rightsStatementIdentifierValue>${sipId}-rights</premis:rightsStatementIdentifierValue>\n`;
    xml += '      </premis:rightsStatementIdentifier>\n';
    xml += '      <premis:rightsBasis>copyright</premis:rightsBasis>\n';
    xml += '      <premis:copyrightInformation>\n';
    xml += '        <premis:copyrightStatus>protected</premis:copyrightStatus>\n';
    xml += '        <premis:copyrightJurisdiction>FI</premis:copyrightJurisdiction>\n';
    xml += '      </premis:copyrightInformation>\n';
    xml += '    </premis:rightsStatement>\n';
    xml += '  </premis:rights>\n';

    return xml;
  }

  /**
   * Format date for XML metadata
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0] ?? ''; // YYYY-MM-DD format
  }

  /**
   * Convert value to string representation
   */
  private stringifyValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === 'object' && item !== null && 'prefLabel' in item
            ? item.prefLabel
            : String(item),
        )
        .join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Infer document type from MIME type
   */
  private inferType(mimeType?: string | null): string {
    if (!mimeType) return 'Unknown';

    const typeMap: Record<string, string> = {
      'image/': 'Image',
      'audio/': 'Sound',
      'video/': 'MovingImage',
      'application/pdf': 'Text',
      'text/': 'Text',
      'application/msword': 'Text',
      'application/vnd.openxmlformats-officedocument': 'Text',
    };

    for (const [prefix, type] of Object.entries(typeMap)) {
      if (mimeType.startsWith(prefix)) {
        return type;
      }
    }

    return 'Unknown';
  }

  /**
   * Infer MIME type from file extension
   */
  private inferMimeType(filepath: string): string | undefined {
    const ext = extname(filepath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.tiff': 'image/tiff',
      '.txt': 'text/plain',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
    };

    return mimeMap[ext];
  }
}
