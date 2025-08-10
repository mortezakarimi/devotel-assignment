/**
 * Enum for application setting keys.
 * Used to identify specific settings in the database.
 * @enum {string}
 */
export enum SettingKeyEnum {
  /** Represents the cron schedule interval for fetching new jobs. */
  JobFetchScheduleInterval = 'JobFetchScheduleInterval',
}
