-- Settle expired listings every minute, including when no one visits the site.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;
select cron.schedule('ctooniverse-marketplace-settle', '* * * * *',
 'select public.marketplace_settle_expired(100);');