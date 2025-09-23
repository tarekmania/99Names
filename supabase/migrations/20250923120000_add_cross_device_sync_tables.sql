-- Add tables for cross-device synchronization
-- This migration adds support for syncing game progress, daily practice, and spaced repetition data

-- Game Results Table
CREATE TABLE public.game_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  found_count INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily Practice Results Table
CREATE TABLE public.daily_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  streak_count INTEGER NOT NULL DEFAULT 0,
  found_names TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Spaced Repetition Items Table
CREATE TABLE public.spaced_repetition_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name_id INTEGER NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor DECIMAL(3,2) NOT NULL DEFAULT 2.5,
  consecutive_correct INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  next_review TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name_id)
);

-- User Settings Table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  settings_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaced_repetition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_results
CREATE POLICY "Users can view their own game results" 
ON public.game_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game results" 
ON public.game_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own game results" 
ON public.game_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game results" 
ON public.game_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for daily_results
CREATE POLICY "Users can view their own daily results" 
ON public.daily_results 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily results" 
ON public.daily_results 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily results" 
ON public.daily_results 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily results" 
ON public.daily_results 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for spaced_repetition_items
CREATE POLICY "Users can view their own spaced repetition items" 
ON public.spaced_repetition_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spaced repetition items" 
ON public.spaced_repetition_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaced repetition items" 
ON public.spaced_repetition_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaced repetition items" 
ON public.spaced_repetition_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings" 
ON public.user_settings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
ON public.user_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_game_results_user_id ON public.game_results(user_id);
CREATE INDEX idx_game_results_timestamp ON public.game_results(timestamp);
CREATE INDEX idx_daily_results_user_id ON public.daily_results(user_id);
CREATE INDEX idx_daily_results_date ON public.daily_results(date);
CREATE INDEX idx_spaced_repetition_user_id ON public.spaced_repetition_items(user_id);
CREATE INDEX idx_spaced_repetition_next_review ON public.spaced_repetition_items(next_review);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_game_results_updated_at
  BEFORE UPDATE ON public.game_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_results_updated_at
  BEFORE UPDATE ON public.daily_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spaced_repetition_items_updated_at
  BEFORE UPDATE ON public.spaced_repetition_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
