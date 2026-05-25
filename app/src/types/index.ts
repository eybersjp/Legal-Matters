// Core Legal Matters Application Types

export type AppRole = 'Partner' | 'Associate' | 'Paralegal' | 'External Counsel' | 'Client';
export type ClientType = 'Individual' | 'Corporate';
export type MatterStatus = 'Intake' | 'Pleadings' | 'Discovery' | 'Trial' | 'Closed';
export type PartyRole = 'Plaintiff' | 'Defendant' | 'Respondent' | 'Applicant' | 'Witness' | 'Opposing Counsel' | 'Advocate';
export type DocClassification = 'Pleading' | 'Evidence' | 'Correspondence' | 'Internal Memo' | 'Precedent';
export type TaskStatus = 'Pending' | 'InProgress' | 'Completed' | 'Overdue';
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'WrittenOff';

// 1. Firms Table Map
export interface Firm {
  id: string;
  name: string;
  lpc_registration_number: string;
  vat_number: string | null;
  created_at: string;
  updated_at: string;
}

// 2. Firm Members Table Map
export interface FirmMember {
  id: string;
  firm_id: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 3. User Profiles Table Map
export interface UserProfile {
  id: string;
  member_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 4. Clients Table Map
export interface Client {
  id: string;
  firm_id: string;
  type: ClientType;
  company_name: string | null;
  registration_number: string | null;
  first_name: string | null;
  last_name: string | null;
  sa_id_number: string | null;
  passport_number: string | null;
  email: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}

// 5. Parties Table Map
export interface Party {
  id: string;
  firm_id: string;
  type: ClientType;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  sa_id_number: string | null;
  email: string | null;
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

// 6. Matters Table Map
export interface Matter {
  id: string;
  firm_id: string;
  client_id: string;
  case_number: string | null;
  title: string;
  description: string | null;
  court_jurisdiction: string | null;
  status: MatterStatus;
  created_at: string;
  updated_at: string;
}

// 7. Documents Table Map
export interface LegalDocument {
  id: string;
  firm_id: string;
  matter_id: string;
  title: string;
  is_privileged: boolean;
  created_at: string;
  updated_at: string;
}

// 8. Document Versions Table Map
export interface DocumentVersion {
  id: string;
  firm_id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  classification: DocClassification;
  uploaded_by: string | null;
  created_at: string;
}

// 9. Document Access Logs Table Map
export interface DocumentAccessLog {
  id: string;
  firm_id: string;
  document_id: string;
  member_id: string | null;
  action: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// 10. POPIA Consent Table Map
export interface PopiaConsent {
  id: string;
  firm_id: string;
  client_id: string;
  consented_to_processing: boolean;
  consented_channels: string[];
  signed_consent_document_url: string | null;
  captured_by: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// 11. Audit Logs Table Map
export interface AuditLog {
  id: string;
  firm_id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// 12. Time Entries Table Map
export interface TimeEntry {
  id: string;
  firm_id: string;
  matter_id: string;
  member_id: string;
  duration_minutes: number;
  hourly_rate_zar: number;
  description: string;
  is_billed: boolean;
  created_at: string;
  updated_at: string;
}

// 13. Trust Account Records Table Map
export interface TrustAccountRecord {
  id: string;
  firm_id: string;
  client_id: string;
  matter_id: string;
  reference_number: string;
  trust_ledger_balance: number;
  section_86_type: string;
  description: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

// Data Transfer Objects (DTOs)
export interface ClientDTO {
  id: string;
  displayName: string;
  email: string;
  phone_number: string;
  type: ClientType;
}

export interface MatterDTO {
  id: string;
  title: string;
  case_number: string | null;
  status: MatterStatus;
  client_name: string;
  court_jurisdiction: string | null;
}
