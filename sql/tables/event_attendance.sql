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
