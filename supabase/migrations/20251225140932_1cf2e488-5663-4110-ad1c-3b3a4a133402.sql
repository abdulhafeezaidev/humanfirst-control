-- Add pilot_mode flag to enforcement_config
ALTER TABLE public.enforcement_config 
ADD COLUMN pilot_mode boolean NOT NULL DEFAULT false,
ADD COLUMN pilot_mode_enabled_at timestamp with time zone,
ADD COLUMN pilot_mode_enabled_by uuid;