-- Secure CTooniverse Prize Wheel: three daily spins, server-selected, atomic rewards.
CREATE TABLE IF NOT EXISTS public.prize_wheel_reward_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 request_id uuid NOT NULL,
 spin_date date NOT NULL,
 spin_number integer NOT NULL CHECK (spin_number BETWEEN 1 AND 3),
 outcome_index integer NOT NULL CHECK (outcome_index BETWEEN 0 AND 7),
 outcome_label text NOT NULL,
 award_description text NOT NULL,
 reward_kind text NOT NULL CHECK (reward_kind IN ('coins','ctoon','ctoon_pack')),
 coin_amount bigint NOT NULL DEFAULT 0 CHECK (coin_amount >= 0),
 ctoon_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
 ctoon_names text[] NOT NULL DEFAULT '{}'::text[],
 balance_after bigint NOT NULL CHECK (balance_after >= 0),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (user_id,request_id),
 UNIQUE (user_id,spin_date,spin_number)
);
ALTER TABLE public.prize_wheel_reward_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Players read own Prize Wheel rewards" ON public.prize_wheel_reward_history;
CREATE POLICY "Players read own Prize Wheel rewards" ON public.prize_wheel_reward_history
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
REVOKE ALL ON TABLE public.prize_wheel_reward_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON TABLE public.prize_wheel_reward_history TO authenticated;
CREATE OR REPLACE FUNCTION public.spin_prize_wheel(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
 v_uid uuid := auth.uid();
 v_date date := (now() AT TIME ZONE 'UTC')::date;
 v_old public.prize_wheel_reward_history%rowtype;
 v_used integer;
 v_index integer;
 v_label text;
 v_description text;
 v_kind text := 'coins';
 v_coins bigint := 0;
 v_ctoon uuid;
 v_ctoon_name text;
 v_ctoon_ids uuid[] := ARRAY[]::uuid[];
 v_ctoon_names text[] := ARRAY[]::text[];
 v_balance bigint;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in to spin' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL THEN RAISE EXCEPTION 'Missing spin request ID'; END IF;
 -- Serializing spins per user plus request idempotency prevents repeated claims.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_uid::text,92419));
 SELECT * INTO v_old FROM public.prize_wheel_reward_history
 WHERE user_id=v_uid AND request_id=p_request_id;
 IF FOUND THEN
  RETURN pg_catalog.jsonb_build_object(
    'remaining',3-v_old.spin_number,'outcome_index',v_old.outcome_index,
    'outcome_label',v_old.outcome_label,'award_description',v_old.award_description,
    'reward_kind',v_old.reward_kind,'coin_amount',v_old.coin_amount,
    'ctoon_ids',v_old.ctoon_ids,'ctoon_names',v_old.ctoon_names,
    'balance',v_old.balance_after,'already_recorded',true);
 END IF;
 INSERT INTO public.prize_wheel_daily_spins(user_id,spin_date,used)
 VALUES(v_uid,v_date,1)
 ON CONFLICT(user_id,spin_date) DO UPDATE
 SET used=public.prize_wheel_daily_spins.used+1
 WHERE public.prize_wheel_daily_spins.used<3
 RETURNING used INTO v_used;
 IF v_used IS NULL THEN RAISE EXCEPTION 'All 3 daily spins have been used'; END IF;
 -- Server alone picks one of eight equally likely results.
 v_index:=pg_catalog.floor(pg_catalog.random()*8)::integer;
 CASE v_index
  WHEN 0 THEN v_label:='500 COINS'; v_coins:=500;
  WHEN 1 THEN
    v_label:='CTOON PACK';
    SELECT COALESCE(pg_catalog.array_agg(c.id),ARRAY[]::uuid[]),
           COALESCE(pg_catalog.array_agg(c.name),ARRAY[]::text[])
      INTO v_ctoon_ids,v_ctoon_names
    FROM (SELECT id,name FROM public.ctoon_catalog
          WHERE NULLIF(pg_catalog.btrim(image_path),'') IS NOT NULL
          ORDER BY pg_catalog.random() LIMIT 3) c;
    IF pg_catalog.cardinality(v_ctoon_ids)=3 THEN v_kind:='ctoon_pack';
    ELSE
      v_ctoon_ids:=ARRAY[]::uuid[];v_ctoon_names:=ARRAY[]::text[];v_coins:=600;
    END IF;
  WHEN 2 THEN
    v_label:='RANDOM CTOON';
    SELECT id,name INTO v_ctoon,v_ctoon_name
    FROM public.ctoon_catalog WHERE NULLIF(pg_catalog.btrim(image_path),'') IS NOT NULL
    ORDER BY pg_catalog.random() LIMIT 1;
    IF v_ctoon IS NULL THEN v_coins:=300;
    ELSE
      v_kind:='ctoon';v_ctoon_ids:=ARRAY[v_ctoon];v_ctoon_names:=ARRAY[v_ctoon_name];
    END IF;
  WHEN 3 THEN v_label:='250 COINS';v_coins:=250;
  WHEN 4 THEN v_label:='MYSTERY PRIZE';v_coins:=(1+pg_catalog.floor(pg_catalog.random()*4)::integer)*250;
  WHEN 5 THEN v_label:='750 COINS';v_coins:=750;
  WHEN 6 THEN v_label:='100 COINS';v_coins:=100;
  WHEN 7 THEN v_label:='BONUS PRIZE';v_coins:=1000;
 END CASE;
 IF v_kind='coins' THEN
    UPDATE public.coin_wallets SET balance=balance+v_coins,updated_at=now()
     WHERE user_id=v_uid RETURNING balance INTO v_balance;
    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'Wallet unavailable. Spin was not consumed.';
    END IF;
    INSERT INTO public.coin_ledger(user_id,delta,balance_after,reason,actor_id)
    VALUES(v_uid,v_coins,v_balance,'Prize Wheel: '||v_label,v_uid);
    IF v_index IN (1,2) THEN
      v_description:=pg_catalog.format('%s Cartoon Coins awarded (CToon items are not available yet)',v_coins);
    ELSE
      v_description:=pg_catalog.format('%s Cartoon Coins credited to your wallet',v_coins);
    END IF;
 ELSE
    SELECT balance INTO v_balance FROM public.coin_wallets WHERE user_id=v_uid FOR UPDATE;
    IF v_balance IS NULL THEN RAISE EXCEPTION 'Wallet unavailable. Spin was not consumed.'; END IF;
    FOREACH v_ctoon IN ARRAY v_ctoon_ids LOOP
      INSERT INTO public.player_ctoons(user_id,ctoon_id,quantity) VALUES(v_uid,v_ctoon,1)
      ON CONFLICT(user_id,ctoon_id) DO UPDATE SET quantity=public.player_ctoons.quantity+1;
    END LOOP;
    v_description:=(CASE WHEN v_kind='ctoon_pack' THEN '3 CToons added to your collection: '
      ELSE '1 CToon added to your collection: ' END)
      || pg_catalog.array_to_string(v_ctoon_names,', ');
 END IF;
 INSERT INTO public.prize_wheel_reward_history
 (user_id,request_id,spin_date,spin_number,outcome_index,outcome_label,
  award_description,reward_kind,coin_amount,ctoon_ids,ctoon_names,balance_after)
 VALUES (v_uid,p_request_id,v_date,v_used,v_index,v_label,v_description,v_kind,
         v_coins,v_ctoon_ids,v_ctoon_names,v_balance);
 RETURN pg_catalog.jsonb_build_object(
  'remaining',3-v_used,'outcome_index',v_index,'outcome_label',v_label,
  'award_description',v_description,'reward_kind',v_kind,
  'coin_amount',v_coins,'ctoon_ids',v_ctoon_ids,'ctoon_names',v_ctoon_names,
  'balance',v_balance,'already_recorded',false);
END;
$function$;
-- Old preview-only endpoint could consume daily spins without granting rewards.
REVOKE EXECUTE ON FUNCTION public.use_prize_wheel_spin() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.spin_prize_wheel(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.spin_prize_wheel(uuid) TO authenticated;