-- WarrantyBuddy — warranty-expiring-soon email tracking
-- Tracks whether the 60-day-expiring-soon reminder email (spec 3.1
-- notification_email / 4.11 Notifications) has already been sent for a
-- given warranty, so the daily digest doesn't re-notify every run.

alter table public.warranties
  add column expiry_notified_at timestamptz;
