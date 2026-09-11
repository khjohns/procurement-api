/**
 * TypeScript types for Catenda / Artifik Contracts & KAV module.
 */

export interface ContractSupplierOrg {
  id?: string;
  name?: string;
  orgNumber?: string;
}

export interface ContractOwner {
  id: string;
  name: string;
}

export interface ContractFile {
  name: string;
  key: string;
  lastModified?: string;
  isDeleted?: boolean;
}

export interface ContractMilestone {
  id: number;
  name: string;
  date?: string;
  creationTime?: string;
  reminders?: any[];
  contractId: number;
}

export interface ContractAmendment {
  id: number;
  name: string;
  creationTime: string;
  signingStatus: string;
  markedAsSignedOutsideArtifik?: boolean;
  files?: ContractFile[];
  buyerSignees?: any[];
  supplierSignees?: any[];
  signers?: any[];
  contractId: number;
  organizationId?: string;
}

export interface ContractDeviation {
  id: number;
  contractId: number;
  name: string;
  severity: 'low' | 'medium' | 'high' | string;
  status: 'reported' | 'in_progress' | 'resolved' | 'dismissed' | string;
  timeOfDiscovery?: string;
  resolutionType?: string | null;
  resolutionNote?: string | null;
  dismissReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  reporter?: any;
  contract?: {
    id: number;
    name: string;
    contractNumber?: string;
    organizationId?: string;
    supplierOrg?: ContractSupplierOrg;
  };
}

export interface ContractOption {
  title?: string;
  optionType?: string;
  description?: string;
  /** Antall forlengelsesperioder, normalt i år (f.eks. [1] = +1 år, [1, 1] = +2 år) */
  prolongPeriods?: number[];
}

export interface ContractItem {
  id: number;
  type: string;
  name: string;
  contractNumber?: string | null;
  referenceId?: string | null;
  description?: string | null;
  signingStatus: string;
  duration?: string;
  duration_start?: string;
  duration_end?: string;
  duration_months?: number | null;
  duration_days?: number | null;
  /** Opsjoner/forlengelser fra Artifik — kan være JSON-streng eller allerede-parset array */
  optionsJSON?: string | ContractOption[] | null;
  value?: number | null;
  currency?: string;
  buyerOrgName?: string;
  supplierOrgName?: string | null;
  supplierOrg?: ContractSupplierOrg | null;
  supplierOrgNumber?: string | null;
  organizationId?: string;
  procurementId?: number | null;
  ownerId?: string;
  owner?: ContractOwner;
  parentContractId?: number | null;
  children?: ContractItem[];
  callOffIds?: number[];
  callOffRequestIds?: number[];
  milestones?: ContractMilestone[];
  amendments?: ContractAmendment[];
  deviations?: ContractDeviation[];
  files?: ContractFile[];
  padesFile?: string | null;
  markedAsSignedOutsideArtifik?: boolean;
}

export interface DeviationsResponse {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  deviations: ContractDeviation[];
}

export type ContractStatusFilter = 'alle' | 'aktiv' | 'utløper_snart' | 'utløpt' | 'signering';
export type ContractTypeFilter = 'alle' | 'ramme' | 'del' | 'enkelt';
export type VarighetsFilter = 'alle' | 'over_4_aar' | 'narmere_4_aar';
export type OptionsFilter = 'alle' | 'med_opsjon' | 'uten_opsjon';

export interface ContractFilterState {
  søk: string;
  status: ContractStatusFilter;
  kontraktstype: ContractTypeFilter;
  varighet: VarighetsFilter;
  opsjon: OptionsFilter;
  referanseDato: string;
  dagerTilUtløp: number;
  kunAvvik: boolean;
  kunEndringer: boolean;
}
