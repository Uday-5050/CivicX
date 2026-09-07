import { request } from './client';
import type {
  GovKpiCard,
  GovDomainStat,
  GovDistrictStat,
  GovUniversityPerformance,
  GovIndustryEngagement,
  GovProjectTimeline,
  GovTrendPoint,
  GovChallengeRow,
  GovActivityEvent,
} from './types';

/* ── Mock Data — Jharkhand-specific ── */

const kpis: GovKpiCard[] = [
  { id: 'kpi_01', label: 'Total Challenges', value: 1847, change: 12.4, icon: '📋' },
  { id: 'kpi_02', label: 'Active Projects', value: 234, change: 8.7, icon: '🔬' },
  { id: 'kpi_03', label: 'Universities Engaged', value: 18, change: 5.6, icon: '🏛' },
  { id: 'kpi_04', label: 'Industry Partners', value: 42, change: 15.2, icon: '🏭' },
  { id: 'kpi_05', label: 'Solutions Deployed', value: 89, change: 22.1, icon: '🚀' },
  { id: 'kpi_06', label: 'Districts Covered', value: 24, change: 0, icon: '📍' },
];

const domainStats: GovDomainStat[] = [
  { id: 'dom_01', domain: 'Education', submitted: 312, inProgress: 78, resolved: 145, color: '#3b82f6' },
  { id: 'dom_02', domain: 'Healthcare', submitted: 289, inProgress: 64, resolved: 112, color: '#ef4444' },
  { id: 'dom_03', domain: 'Agriculture', submitted: 247, inProgress: 53, resolved: 98, color: '#22c55e' },
  { id: 'dom_04', domain: 'Water Resources', submitted: 198, inProgress: 41, resolved: 87, color: '#06b6d4' },
  { id: 'dom_05', domain: 'Environment', submitted: 176, inProgress: 38, resolved: 72, color: '#10b981' },
  { id: 'dom_06', domain: 'Energy', submitted: 154, inProgress: 32, resolved: 64, color: '#f59e0b' },
  { id: 'dom_07', domain: 'Urban Development', submitted: 168, inProgress: 45, resolved: 58, color: '#8b5cf6' },
  { id: 'dom_08', domain: 'Rural Livelihoods', submitted: 142, inProgress: 28, resolved: 54, color: '#d97706' },
  { id: 'dom_09', domain: 'Public Administration', submitted: 98, inProgress: 19, resolved: 41, color: '#64748b' },
  { id: 'dom_10', domain: 'Accessibility', submitted: 63, inProgress: 12, resolved: 28, color: '#ec4899' },
];

const districtStats: GovDistrictStat[] = [
  { id: 'dist_01', district: 'Ranchi', totalChallenges: 342, activeProjects: 48, resolved: 128, universitiesEngaged: 5, industryPartners: 12 },
  { id: 'dist_02', district: 'Jamshedpur', totalChallenges: 278, activeProjects: 38, resolved: 105, universitiesEngaged: 3, industryPartners: 9 },
  { id: 'dist_03', district: 'Dhanbad', totalChallenges: 234, activeProjects: 32, resolved: 89, universitiesEngaged: 4, industryPartners: 7 },
  { id: 'dist_04', district: 'Bokaro', totalChallenges: 189, activeProjects: 24, resolved: 72, universitiesEngaged: 2, industryPartners: 6 },
  { id: 'dist_05', district: 'Hazaribagh', totalChallenges: 167, activeProjects: 21, resolved: 64, universitiesEngaged: 2, industryPartners: 4 },
  { id: 'dist_06', district: 'Deoghar', totalChallenges: 134, activeProjects: 16, resolved: 51, universitiesEngaged: 2, industryPartners: 3 },
  { id: 'dist_07', district: 'Giridih', totalChallenges: 112, activeProjects: 14, resolved: 42, universitiesEngaged: 1, industryPartners: 2 },
  { id: 'dist_08', district: 'Dumka', totalChallenges: 98, activeProjects: 11, resolved: 38, universitiesEngaged: 1, industryPartners: 2 },
  { id: 'dist_09', district: 'Palamu', totalChallenges: 87, activeProjects: 9, resolved: 31, universitiesEngaged: 1, industryPartners: 1 },
  { id: 'dist_10', district: 'Garhwa', totalChallenges: 72, activeProjects: 7, resolved: 24, universitiesEngaged: 1, industryPartners: 1 },
];

const universityPerformance: GovUniversityPerformance[] = [
  { id: 'uni_01', name: 'BIT Mesra, Ranchi', challengesAssigned: 67, projectsActive: 18, proposalsSubmitted: 42, solutionsDeployed: 14, patents: 6, startupsIncubated: 3 },
  { id: 'uni_02', name: 'IIT (ISM) Dhanbad', challengesAssigned: 58, projectsActive: 22, proposalsSubmitted: 38, solutionsDeployed: 18, patents: 11, startupsIncubated: 5 },
  { id: 'uni_03', name: 'Central University of Jharkhand', challengesAssigned: 45, projectsActive: 14, proposalsSubmitted: 29, solutionsDeployed: 9, patents: 3, startupsIncubated: 2 },
  { id: 'uni_04', name: 'NIT Jamshedpur', challengesAssigned: 52, projectsActive: 16, proposalsSubmitted: 34, solutionsDeployed: 12, patents: 5, startupsIncubated: 2 },
  { id: 'uni_05', name: 'Ranchi University', challengesAssigned: 38, projectsActive: 10, proposalsSubmitted: 24, solutionsDeployed: 7, patents: 1, startupsIncubated: 1 },
  { id: 'uni_06', name: 'Vinoba Bhave University, Hazaribagh', challengesAssigned: 29, projectsActive: 8, proposalsSubmitted: 18, solutionsDeployed: 5, patents: 1, startupsIncubated: 0 },
  { id: 'uni_07', name: 'Sido Kanhu Murmu University', challengesAssigned: 22, projectsActive: 6, proposalsSubmitted: 14, solutionsDeployed: 3, patents: 0, startupsIncubated: 0 },
];

const industryEngagement: GovIndustryEngagement[] = [
  { id: 'ind_01', name: 'Tata Steel Ltd.', type: 'large', fundingLakhs: 245, mentorshipHours: 480, prototypes: 8, deployments: 5, sector: 'Manufacturing / CSR' },
  { id: 'ind_02', name: 'MECON Limited', type: 'large', fundingLakhs: 120, mentorshipHours: 320, prototypes: 5, deployments: 3, sector: 'Engineering Consultancy' },
  { id: 'ind_03', name: 'Central Coalfields Ltd.', type: 'large', fundingLakhs: 180, mentorshipHours: 260, prototypes: 4, deployments: 2, sector: 'Mining / Energy' },
  { id: 'ind_04', name: 'Jharkhand AgriTech Solutions', type: 'startup', fundingLakhs: 35, mentorshipHours: 150, prototypes: 6, deployments: 4, sector: 'Agriculture Technology' },
  { id: 'ind_05', name: 'Ranchi MedTech Pvt. Ltd.', type: 'startup', fundingLakhs: 28, mentorshipHours: 110, prototypes: 3, deployments: 2, sector: 'Healthcare' },
  { id: 'ind_06', name: 'Bokaro Steel Artisans MSME', type: 'msme', fundingLakhs: 12, mentorshipHours: 80, prototypes: 2, deployments: 1, sector: 'Steel Fabrication' },
  { id: 'ind_07', name: 'Tata Trusts (CSR)', type: 'csr', fundingLakhs: 340, mentorshipHours: 200, prototypes: 0, deployments: 0, sector: 'Social Impact / Funding' },
];

const projectTimelines: GovProjectTimeline[] = [
  { id: 'proj_01', title: 'IoT-based Water Quality Monitoring for Rural Ranchi', university: 'BIT Mesra', industry: 'Tata Steel Ltd.', domain: 'Water Resources', district: 'Ranchi', stage: 'pilot', startDate: '2026-03-15', lastUpdated: '2026-09-05' },
  { id: 'proj_02', title: 'AI Crop Disease Detection System for Palamu Farmers', university: 'IIT (ISM) Dhanbad', industry: 'Jharkhand AgriTech', domain: 'Agriculture', district: 'Palamu', stage: 'in_progress', startDate: '2026-05-01', lastUpdated: '2026-09-04' },
  { id: 'proj_03', title: 'Solar-powered Community Health Kiosks — Dumka', university: 'Central Univ. of Jharkhand', industry: 'Ranchi MedTech', domain: 'Healthcare', district: 'Dumka', stage: 'deployed', startDate: '2025-11-20', lastUpdated: '2026-08-28' },
  { id: 'proj_04', title: 'Smart Sanitation Monitoring Dashboard — Jamshedpur', university: 'NIT Jamshedpur', industry: 'MECON Limited', domain: 'Urban Development', district: 'Jamshedpur', stage: 'in_progress', startDate: '2026-04-10', lastUpdated: '2026-09-06' },
  { id: 'proj_05', title: 'Digital Literacy Platform for Tribal Schools', university: 'Ranchi University', industry: 'Tata Trusts', domain: 'Education', district: 'Giridih', stage: 'under_review', startDate: '2026-07-01', lastUpdated: '2026-09-02' },
  { id: 'proj_06', title: 'Mine Water Treatment & Reuse — Dhanbad', university: 'IIT (ISM) Dhanbad', industry: 'Central Coalfields', domain: 'Environment', district: 'Dhanbad', stage: 'pilot', startDate: '2026-02-10', lastUpdated: '2026-09-01' },
  { id: 'proj_07', title: 'Accessible Public Transport Routing App — Bokaro', university: 'BIT Mesra', industry: 'Bokaro Steel Artisans', domain: 'Accessibility', district: 'Bokaro', stage: 'submitted', startDate: '2026-08-15', lastUpdated: '2026-09-07' },
  { id: 'proj_08', title: 'Renewable Energy Micro-grids for Remote Villages', university: 'Vinoba Bhave Univ.', industry: 'Central Coalfields', domain: 'Energy', district: 'Hazaribagh', stage: 'in_progress', startDate: '2026-04-22', lastUpdated: '2026-09-03' },
];

const trends: GovTrendPoint[] = [
  { month: 'Jan', submitted: 124, resolved: 42 },
  { month: 'Feb', submitted: 148, resolved: 58 },
  { month: 'Mar', submitted: 167, resolved: 71 },
  { month: 'Apr', submitted: 189, resolved: 84 },
  { month: 'May', submitted: 212, resolved: 98 },
  { month: 'Jun', submitted: 198, resolved: 112 },
  { month: 'Jul', submitted: 234, resolved: 126 },
  { month: 'Aug', submitted: 256, resolved: 142 },
  { month: 'Sep', submitted: 219, resolved: 131 },
];

const challenges: GovChallengeRow[] = [
  { id: 'ch_01', title: 'Broken water pipeline affecting 200 families', domain: 'Water Resources', district: 'Ranchi', status: 'in_progress', priority: 'critical', university: 'BIT Mesra', submittedAt: '2026-09-01' },
  { id: 'ch_02', title: 'Lack of primary healthcare in Bero block', domain: 'Healthcare', district: 'Ranchi', status: 'under_review', priority: 'high', university: 'Central Univ. of Jharkhand', submittedAt: '2026-09-02' },
  { id: 'ch_03', title: 'Crop loss due to unpredictable irrigation', domain: 'Agriculture', district: 'Palamu', status: 'in_progress', priority: 'high', university: 'IIT (ISM) Dhanbad', submittedAt: '2026-08-28' },
  { id: 'ch_04', title: 'No internet connectivity in tribal school cluster', domain: 'Education', district: 'Giridih', status: 'submitted', priority: 'medium', university: 'Ranchi University', submittedAt: '2026-09-05' },
  { id: 'ch_05', title: 'Illegal mining waste in Damodar river', domain: 'Environment', district: 'Dhanbad', status: 'in_progress', priority: 'critical', university: 'IIT (ISM) Dhanbad', submittedAt: '2026-08-20' },
  { id: 'ch_06', title: 'Road accessibility issue near Bokaro General Hospital', domain: 'Accessibility', district: 'Bokaro', status: 'submitted', priority: 'medium', university: 'BIT Mesra', submittedAt: '2026-09-06' },
  { id: 'ch_07', title: 'Solid waste management failure in Bistupur', domain: 'Urban Development', district: 'Jamshedpur', status: 'resolved', priority: 'high', university: 'NIT Jamshedpur', submittedAt: '2026-07-15' },
  { id: 'ch_08', title: 'Frequent power outages in rural Hazaribagh', domain: 'Energy', district: 'Hazaribagh', status: 'in_progress', priority: 'medium', university: 'Vinoba Bhave Univ.', submittedAt: '2026-08-10' },
  { id: 'ch_09', title: 'Lack of skill training centres for women SHGs', domain: 'Rural Livelihoods', district: 'Dumka', status: 'under_review', priority: 'medium', university: 'Sido Kanhu Murmu Univ.', submittedAt: '2026-09-03' },
  { id: 'ch_10', title: 'E-governance portal not accessible in local languages', domain: 'Public Administration', district: 'Deoghar', status: 'submitted', priority: 'low', university: 'Central Univ. of Jharkhand', submittedAt: '2026-09-04' },
];

const activityFeed: GovActivityEvent[] = [
  { id: 'act_01', message: 'New challenge submitted: "Road accessibility issue near Bokaro General Hospital"', type: 'challenge', timestamp: '2026-09-07T14:30:00Z' },
  { id: 'act_02', message: 'IIT (ISM) Dhanbad accepted challenge on mine water treatment', type: 'project', timestamp: '2026-09-07T12:15:00Z' },
  { id: 'act_03', message: 'Tata Steel signed collaboration agreement for IoT water monitoring pilot', type: 'collaboration', timestamp: '2026-09-06T18:45:00Z' },
  { id: 'act_04', message: 'Solar health kiosk project (Dumka) marked as deployed', type: 'milestone', timestamp: '2026-09-06T10:00:00Z' },
  { id: 'act_05', message: 'BIT Mesra submitted proposal for accessible transport routing app', type: 'project', timestamp: '2026-09-05T16:20:00Z' },
  { id: 'act_06', message: 'Central Coalfields committed ₹45L funding for energy micro-grid project', type: 'collaboration', timestamp: '2026-09-05T11:30:00Z' },
  { id: 'act_07', message: 'NIT Jamshedpur resolved sanitation monitoring challenge in Bistupur', type: 'milestone', timestamp: '2026-09-04T09:45:00Z' },
  { id: 'act_08', message: '3 new challenges submitted from Palamu district', type: 'challenge', timestamp: '2026-09-03T15:10:00Z' },
];

/* ── API Functions ── */

const clone = <T,>(items: T[]) => items.map((item) => ({ ...item }));
const fallback = async <T,>(items: T[]) => { await new Promise((resolve) => setTimeout(resolve, 160)); return clone(items); };
async function get<T>(path: string, items: T[]): Promise<T[]> { try { return (await request<T[]>(path)).data; } catch (error) { if (import.meta.env.DEV) return fallback(items); throw error; } }

export function listGovKpis() { return get('/government/kpis', kpis); }
export function listGovDomainStats() { return get('/government/domains', domainStats); }
export function listGovDistrictStats() { return get('/government/districts', districtStats); }
export function listGovUniversityPerformance() { return get('/government/universities', universityPerformance); }
export function listGovIndustryEngagement() { return get('/government/industry', industryEngagement); }
export function listGovProjectTimelines() { return get('/government/projects', projectTimelines); }
export function listGovTrends() { return get('/government/trends', trends); }
export function listGovChallenges() { return get('/government/challenges', challenges); }
export function listGovActivity() { return get('/government/activity', activityFeed); }

export async function exportGovReport(reportType: 'summary' | 'detailed' | 'district'): Promise<{ url: string; filename: string }> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return { url: '#', filename: `civicx_${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf` };
}
