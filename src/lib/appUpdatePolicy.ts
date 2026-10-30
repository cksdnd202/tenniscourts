export const APP_UPDATE_PLATFORMS = ["android", "ios"] as const;
export const APP_UPDATE_MODES = ["none", "recommend", "force"] as const;

export type AppUpdatePlatform = (typeof APP_UPDATE_PLATFORMS)[number];
export type AppUpdateMode = (typeof APP_UPDATE_MODES)[number];

export type AppUpdatePolicyRow = {
  platform: AppUpdatePlatform;
  enabled: boolean;
  update_mode: AppUpdateMode;
  latest_version_name: string;
  latest_build_number: number;
  minimum_build_number: number;
  title: string;
  message: string;
  store_url: string;
  remind_after_hours: number;
  updated_at: string;
};

export type PublicAppUpdatePolicy = {
  platform: AppUpdatePlatform;
  enabled: boolean;
  mode: AppUpdateMode;
  latestVersionName: string;
  latestBuildNumber: number;
  minimumBuildNumber: number;
  title: string;
  message: string;
  storeUrl: string;
  remindAfterHours: number;
  updatedAt: string;
};

export function isAppUpdatePlatform(value: unknown): value is AppUpdatePlatform {
  return typeof value === "string" && APP_UPDATE_PLATFORMS.includes(value as AppUpdatePlatform);
}

export function isAppUpdateMode(value: unknown): value is AppUpdateMode {
  return typeof value === "string" && APP_UPDATE_MODES.includes(value as AppUpdateMode);
}

export function toPublicAppUpdatePolicy(row: AppUpdatePolicyRow): PublicAppUpdatePolicy {
  return {
    platform: row.platform,
    enabled: row.enabled,
    mode: row.update_mode,
    latestVersionName: row.latest_version_name,
    latestBuildNumber: row.latest_build_number,
    minimumBuildNumber: row.minimum_build_number,
    title: row.title,
    message: row.message,
    storeUrl: row.store_url,
    remindAfterHours: row.remind_after_hours,
    updatedAt: row.updated_at,
  };
}
