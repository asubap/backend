-- Table: event_attendance
CREATE TABLE IF NOT EXISTS public.event_attendance (
    id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    event_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'rsvped'::text,
    PRIMARY KEY (id)
);

ALTER TABLE public.event_attendance
    ADD FOREIGN KEY (event_id)
    REFERENCES public.events(id);
ALTER TABLE public.event_attendance
    ADD FOREIGN KEY (member_id)
    REFERENCES public.member_info(id);

-- Indexes

CREATE INDEX idx_event_attendance_event_status ON public.event_attendance USING btree (event_id, status);

CREATE INDEX idx_event_attendance_member_attended ON public.event_attendance USING btree (member_id, event_id) WHERE (status = 'attended'::text);

CREATE UNIQUE INDEX unique_attendance ON public.event_attendance USING btree (member_id, event_id);

-- Row Level Security
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can RSVP for themselves, e-board can add anyone
    ON public.event_attendance
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM member_info mi
  WHERE ((mi.id = event_attendance.member_id) AND (mi.user_email = auth.email()))))))
;

CREATE POLICY Users can delete own RSVP, e-board can delete all
    ON public.event_attendance
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM member_info mi
  WHERE ((mi.id = event_attendance.member_id) AND (mi.user_email = auth.email()))))))
;

CREATE POLICY Users can update own attendance, e-board can update all
    ON public.event_attendance
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM member_info mi
  WHERE ((mi.id = event_attendance.member_id) AND (mi.user_email = auth.email()))))))
;

CREATE POLICY Users can view own attendance, e-board sees all
    ON public.event_attendance
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((is_eboard(auth.email()) OR (EXISTS ( SELECT 1
   FROM member_info mi
  WHERE ((mi.id = event_attendance.member_id) AND (mi.user_email = auth.email()))))))
;
