/**
 * Kanso Cre8 — Shared Staff Roster Helper
 * Centralizes staff roster and accounts retrieval across project views.
 */
import { ApiClient } from '$lib/services/api';

export async function fetchStaffList(): Promise<any[]> {
  try {
    const res = await ApiClient.getStaffRoster();
    if (res && res.roster && Array.isArray(res.roster)) {
      return res.roster;
    }
    if (res && res.users && Array.isArray(res.users)) {
      return res.users;
    }
  } catch {}

  try {
    const accountsRes = await ApiClient.getStaffAccounts();
    if (accountsRes && accountsRes.users && Array.isArray(accountsRes.users)) {
      return accountsRes.users;
    }
  } catch {}

  try {
    const teamRes = await ApiClient.getTeam();
    if (teamRes && teamRes.team && Array.isArray(teamRes.team)) {
      return teamRes.team;
    }
  } catch {}

  return [];
}

export function useStaffList() {
  let staffList = $state<any[]>([]);
  let isLoading = $state(false);

  async function load(): Promise<any[]> {
    isLoading = true;
    try {
      staffList = await fetchStaffList();
      return staffList;
    } finally {
      isLoading = false;
    }
  }

  return {
    get staffList() { return staffList; },
    set staffList(v: any[]) { staffList = v; },
    get isLoading() { return isLoading; },
    load
  };
}
