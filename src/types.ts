export type ReportCategory = 'pothole' | 'garbage' | 'waterlogging' | 'water_leak' | 'streetlight' | 'open_drain' | 'other';

export type ReportStatus = 'Reported' | 'In Progress' | 'Resolved' | 'Escalated' | 'Rejected';

export type Department =
  | 'Roads (PWD / Municipal Corporation)'
  | 'Sanitation (Solid Waste Management)'
  | 'Drainage (Storm Water / Sewerage)'
  | 'Water Supply (Jal Board)'
  | 'Electricity (DISCOM / Municipal Electrical)'
  | 'Other';

export type Priority = 'Urgent' | 'Normal' | 'Low';

export interface LocationLiteral {
  lat: number;
  lng: number;
}

export interface AgentDecisions {
  departmentChoice: string;
  prioritySla: string;
  duplicateCheck: string;
  routingAction: string;
}

export interface Report {
  id: string;
  category: ReportCategory;
  severity: number;
  shortDescription: string;
  hazard: boolean;
  photoUrl: string; // Base64 or standard asset url
  location: LocationLiteral;
  address?: string;
  createdAt: string;
  department: Department;
  priority: Priority;
  slaDeadline: string; // ISO string
  sla_hours: number;
  status: ReportStatus;
  citizenMessage: string;
  workOrderDraft: string;
  isDuplicate: boolean;
  mergedIntoId: string | null;
  duplicateCount: number;
  confirmations: number;
  decisionsReasoning: AgentDecisions;
  reasoning: string;
  citizenComment: string; // Optional citizen comments/notes
  municipalGrievance?: string;
}

export interface CivicStats {
  totalCount: number;
  activeCount: number;
  resolvedCount: number;
  escalatedCount: number;
  categoryDistribution: Record<ReportCategory, number>;
  statusDistribution: Record<ReportStatus, number>;
  departmentDistribution: Record<Department, number>;
  avgResolutionTimeHours: number;
}
