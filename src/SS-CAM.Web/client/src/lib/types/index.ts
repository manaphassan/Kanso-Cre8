/**
 * Core Type Definitions for SS-CAM Web Management Portal (Svelte 5)
 */

export type ThemeName = 'falconia' | 'metamorphosis' | 'catppuccin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  roles?: string[];
  staffId: string;
  department: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  avatarColor?: string;
  defaultBrand?: string;
  permissions: string[];
}

export type ProjectStatus = 'backlog' | 'in-progress' | 'review' | 'revision' | 'approved' | 'done' | 'on-hold';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface CreativeDirectionState {
  visual_concept?: string;
  color_palette?: string;
  target_audience?: string;
  aspect_ratio?: string;
  mood_keywords?: string[];
  reference_links?: string[];
}

export interface CopywritingState {
  status?: 'draft' | 'submitted' | 'approved' | 'revision_requested';
  headline?: string;
  body_copy?: string;
  cta_text?: string;
  script_notes?: string;
}

export interface ProjectFrontmatter {
  status?: ProjectStatus;
  designer?: string;
  client?: string;
  brand?: string;
  manager?: string;
  department?: string;
  deadline?: string;
  priority?: ProjectPriority;
  presetType?: string;
  tags?: string[];
  revision?: number;
  creative_direction?: CreativeDirectionState;
  copywriting?: CopywritingState;
  [key: string]: any;
}

export interface ApprovalRecord {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  decision: 'approved' | 'revision_requested' | 'rejected' | 'signed_off';
  comment?: string;
  notes?: string;
  deliverableId?: string;
}

export interface DeliverableItem {
  id: string;
  filename: string;
  relativePath: string;
  fullPath: string;
  ext: string;
  sizeBytes: number;
  modified: string;
  previewUrl: string;
  url?: string;
  downloadUrl?: string;
  format?: string;
  mediaClass?: string;
  aspectRatioEstimate?: string;
  sizeTier?: string;
  previewType?: string;
  projectId?: string;
  projectTitle?: string;
  projectBrand?: string;
  projectJobId?: string;
  projectDesigner?: string;
  isImage: boolean;
  isVideo: boolean;
  isPdf: boolean;
  status: 'pending' | 'approved' | 'revision';
  revisionCount: number;
  project?: {
    id?: string;
    jobId: string;
    title: string;
    brand: string;
    designer: string;
    status: string;
    deadline?: string;
  };
}

export interface Project {
  id?: string;
  jobId: string;
  title: string;
  brand: string;
  designer: string;
  manager: string;
  department: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  presetType: string;
  created: string;
  deadline?: string;
  completedAt?: string;
  isOverdue?: boolean;
  isDueSoon?: boolean;
  daysRemaining?: number | null;
  tags: string[];
  folderPath?: string;
  fullPath?: string;
  readmeBody?: string;
  briefMarkdown?: string;
  versionHash?: string;
  creativeDirection?: CreativeDirectionState;
  copywriting?: CopywritingState;
  approvals?: ApprovalRecord[];
  deliverables?: DeliverableItem[];
}

export interface DashboardKPIs {
  total: number;
  active: number;
  pendingReview: number;
  pendingApproval?: number;
  revisionRequired: number;
  completed: number;
  overdue: number;
  dueSoon?: number;
  highRevisionCount?: number;
}

export interface DesignerWorkload {
  designer?: string;
  staffId?: string;
  name?: string;
  role?: string;
  total?: number;
  active?: number;
  inProgress?: number;
  inReview?: number;
  revision?: number;
  completed?: number;
  overdue?: number;
  capacityPercent?: number;
  capacityStatus?: string;
  capacityColor?: string;
}

export interface HighRevisionProjectItem {
  id: string;
  jobId: string;
  title: string;
  designer: string;
  brand: string;
  revision: number;
  status: string;
  priority: string;
  deadline?: string;
}

export interface BrandVelocityItem {
  brand: string;
  total: number;
  active: number;
  completed: number;
  avgDays?: number;
}

export interface CompetencySkillItem {
  label: string;
  target: number;
  actual: number;
  projectCount?: number;
}

export interface SlaMetricsData {
  avgTurnaroundDays?: number | null;
  medianTurnaroundDays?: number | null;
  p90TurnaroundDays?: number | null;
  firstTimeRightPercent?: number | null;
  avgRevisionCount?: number | null;
  avgReviewAgeDays?: number;
  totalCompleted?: number;
  brandVelocity?: BrandVelocityItem[];
  competencySkills?: CompetencySkillItem[];
}

export interface DashboardData {
  kpis: DashboardKPIs;
  pipeline?: Record<string, number>;
  designerWorkload: DesignerWorkload[];
  brandDistribution: Record<string, number>;
  typeDistribution?: Record<string, number>;
  highRevisionProjects?: HighRevisionProjectItem[];
  slaMetrics?: SlaMetricsData;
  recentProjects: Project[];
  pendingDeliverables?: DeliverableItem[];
  activeFilters?: {
    timeRange: string;
    brand: string;
  };
}

export interface FilterState {
  query: string;
  status: string;
  brand: string;
  designer: string;
  priority: string;
  department: string;
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  timeoutMs?: number;
}

export interface Company {
  code: string;
  name: string;
  shortName?: string;
  regNo?: string;
  address?: string;
  contact?: string;
  location?: string;
  status: 'active' | 'inactive';
  isParent?: boolean;
  establishedYear?: string;
  color?: string;
  updatedAt?: string;
}

export interface StaffAccount {
  staffId: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  roles?: string[];
  department: string;
  defaultBrand?: string;
  avatarColor?: string;
  active?: boolean;
  password?: string;
}

export interface ProjectComment {
  id: string;
  projectId: string;
  deliverableId?: string | null;
  author: string;
  authorRole: string;
  authorAvatar?: string;
  content: string;
  mentions: string[];
  timestamp: string;
  resolved: boolean;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
}

export interface ActivityNotification {
  id: string;
  type: 'mention' | 'comment' | 'revision' | 'approval' | 'system' | 'info';
  title: string;
  message: string;
  timestamp: string;
  actor: string;
  role: string;
  route: string;
  routeId?: string;
  unread: boolean;
}

export interface AssignedProjectSummary {
  id: string;
  jobId: string;
  title: string;
  status: ProjectStatus;
  brand: string;
  priority: ProjectPriority;
  deadline?: string | null;
  presetType?: string;
  presetCode?: string;
  slaDays?: number;
  slotWeight?: number;
  shortLabel?: string;
}

export interface TeamMember {
  staffId: string;
  username: string;
  name: string;
  email?: string;
  role: string;
  roles?: string[];
  department: string;
  defaultBrand?: string;
  avatarColor?: string;
  active?: boolean;
  workload: {
    total: number;
    active: number;
    inProgress: number;
    inReview: number;
    revision: number;
    overdue: number;
    completed: number;
    weightedLoad?: number;
    capacityPercent?: number;
  };
  capacityStatus: 'Available' | 'Normal' | 'High Workload' | 'Overloaded';
  capacityColor: string;
  assignedProjects?: AssignedProjectSummary[];
  totalAssignedCount?: number;
}

