
-- Table des avis sur les tuteurs
CREATE TABLE public.tutor_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tutor_reviews ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les avis
CREATE POLICY "Anyone can view reviews"
ON public.tutor_reviews FOR SELECT
USING (true);

-- Les étudiants peuvent créer des avis
CREATE POLICY "Students can create reviews"
ON public.tutor_reviews FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Les étudiants peuvent modifier leurs propres avis
CREATE POLICY "Students can update own reviews"
ON public.tutor_reviews FOR UPDATE
USING (auth.uid() = student_id);

-- Les étudiants peuvent supprimer leurs propres avis
CREATE POLICY "Students can delete own reviews"
ON public.tutor_reviews FOR DELETE
USING (auth.uid() = student_id);
