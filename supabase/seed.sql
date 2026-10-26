-- Local development seed data only.
-- Use synthetic records; never production student or guardian data.
--
-- After `supabase db reset`, this loads platform/school fixtures so you can
-- sign in without manually bootstrapping an operator or inviting a school.

\ir fixtures/dev_platform.sql
