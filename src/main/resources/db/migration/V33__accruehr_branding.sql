-- Update saved branding without replacing company-specific template wording.
-- Historical names appear here only as migration match patterns.
DO $branding$
DECLARE template_schema text;
BEGIN
    FOR template_schema IN
        SELECT table_schema FROM information_schema.tables
        WHERE table_name='mail_templates' AND table_type='BASE TABLE'
          AND table_schema NOT IN ('information_schema','pg_catalog')
    LOOP
        EXECUTE format($update$
            UPDATE %I.mail_templates SET
                title=regexp_replace(title, 'grecha(\.ai)?|prabha[ _-]*tech(nologies)?|prabatech', 'AccrueHr', 'gi'),
                subject=regexp_replace(subject, 'grecha(\.ai)?|prabha[ _-]*tech(nologies)?|prabatech', 'AccrueHr', 'gi'),
                body=regexp_replace(
                    regexp_replace(
                        regexp_replace(body, 'https?://(www\.)?grecha\.ai/forgot-password', '{{passwordResetUrl}}', 'gi'),
                        'https?://(www\.)?grecha\.ai(/login)?/?', '{{loginUrl}}', 'gi'),
                    'grecha(\.ai)?|prabha[ _-]*tech(nologies)?|prabatech', 'AccrueHr', 'gi')
            WHERE concat_ws(' ',title,subject,body) ~* 'grecha|prabha|praba'
        $update$,template_schema);
    END LOOP;
    UPDATE public.roles SET description=regexp_replace(description,
        'grecha(\.ai)?|prabha[ _-]*tech(nologies)?|prabatech', 'AccrueHr', 'gi')
        WHERE description ~* 'grecha|prabha|praba';
END
$branding$;
