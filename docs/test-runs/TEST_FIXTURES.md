# SOSA INC — Test Fixtures

> Deterministic seed data. Every value here is chosen so that **the resulting aggregations are predictable** and the visual checklist in Phase 3 has a fixed expected output. Do not improvise — every change to a number invalidates `TEST_MATRIX.md` expected values.

All transactions live in `public.personal_transactions` in the portal with `slug = 'sosa'`. Use the placeholder `{TEST_PORTAL_UUID}` and `{OWNER_UID}` resolved in Phase 0.

**Reference date:** today is Saturday, 16 May 2026. Fixtures span 1 Mar 2026 → 16 May 2026 to cover `today`, `7days`, `30days`, `month`, `prevmonth`, and `3months` ranges out of the box.

**Currency:** all rows are EUR. `cost_classification` is `null` for income, `opex` for every expense (per the §11.3 constraint in `PROJECT_OVERVIEW.md`).

(Full content in the chat thread that produced this file. The canonical SQL bulk-insert is in §6.)

## SQL bulk insert

```sql
-- :portal := a1000000-0000-0000-0000-000000000001 (sosa)
-- :owner  := 81811fcb-a587-439f-b465-5df67a5fc00a (sosa@sosainc.com)

INSERT INTO public.personal_transactions
  (portal_id, user_id, type, amount, currency, category, description, date, payment_method, cost_classification, is_recurring)
VALUES
  -- Income (12)
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',  3500.00,'EUR','Stipendio','Stipendio Marzo',          '2026-03-01','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',   450.00,'EUR','Freelance','Progetto REDX cliente A',  '2026-03-15','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',  3500.00,'EUR','Stipendio','Stipendio Aprile',         '2026-04-01','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',   720.00,'EUR','Freelance','Progetto KEYLOW cliente B','2026-04-10','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',   180.00,'EUR','Rimborsi','Rimborso spese viaggio',    '2026-04-22','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',  3500.00,'EUR','Stipendio','Stipendio Maggio',         '2026-05-01','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',   250.00,'EUR','Freelance','Consulenza una-tantum',    '2026-05-03','bonifico',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',    95.00,'EUR','Rimborsi','Rimborso pranzo cliente',   '2026-05-08','contanti',NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',    60.00,'EUR','Vendite','Vendita Vinted',             '2026-05-10','paypal',  NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',    45.00,'EUR','Vendite','Vendita Depop',              '2026-05-12','paypal',  NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',   120.00,'EUR','Freelance','Microtask',                '2026-05-14','paypal',  NULL,false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','income',  1000.00,'EUR','Bonus','Bonus performance Q1',         '2026-05-16','bonifico',NULL,false),

  -- Expense (24)
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 850.00,'EUR','Casa','Affitto Marzo',                  '2026-03-05','bonifico','opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 320.00,'EUR','Spesa','Spesa settimana 1',             '2026-03-08','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  65.00,'EUR','Trasporti','Benzina',                   '2026-03-12','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  45.00,'EUR','Svago','Cinema + cena',                 '2026-03-18','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 120.00,'EUR','Salute','Farmacia',                     '2026-03-22','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  30.00,'EUR','Abbonamenti','Spotify + Netflix',       '2026-03-29','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 850.00,'EUR','Casa','Affitto Aprile',                 '2026-04-05','bonifico','opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 280.00,'EUR','Spesa','Spesa settimana 1',             '2026-04-09','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  75.00,'EUR','Trasporti','Treno Milano-Roma',         '2026-04-14','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  60.00,'EUR','Svago','Concerto',                      '2026-04-18','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  30.00,'EUR','Abbonamenti','Spotify + Netflix',       '2026-04-25','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  90.00,'EUR','Salute','Dentista',                     '2026-04-28','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 850.00,'EUR','Casa','Affitto Maggio',                 '2026-05-02','bonifico','opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 310.00,'EUR','Spesa','Spesa settimana 1',             '2026-05-04','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  55.00,'EUR','Trasporti','Benzina',                   '2026-05-05','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  38.00,'EUR','Svago','Bar con amici',                 '2026-05-07','contanti','opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 220.00,'EUR','Spesa','Spesa settimana 2',             '2026-05-09','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  18.00,'EUR','Svago','Aperitivo',                     '2026-05-10','contanti','opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  30.00,'EUR','Abbonamenti','Spotify + Netflix',       '2026-05-11','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  42.00,'EUR','Trasporti','Uber',                      '2026-05-12','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  75.00,'EUR','Salute','Visita medica',                '2026-05-13','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense', 195.00,'EUR','Spesa','Spesa settimana 3',             '2026-05-14','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  88.00,'EUR','Svago','Aperitivo + cena',              '2026-05-15','carta',   'opex',false),
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  25.00,'EUR','Trasporti','Parcheggio aeroporto',      '2026-05-16','carta',   'opex',false),

  -- F-01 edge-case
  ('a1000000-0000-0000-0000-000000000001','81811fcb-a587-439f-b465-5df67a5fc00a','expense',  12.50,'EUR','Svago','Caffè + brioche',                '2026-05-16','contanti','opex',false);
```

## Optional budget limits

```sql
INSERT INTO public.budget_limits (portal_id, category, year_month, monthly_limit) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Casa',        '2026-05', 900.00),
  ('a1000000-0000-0000-0000-000000000001', 'Spesa',       '2026-05', 600.00),
  ('a1000000-0000-0000-0000-000000000001', 'Svago',       '2026-05', 200.00),
  ('a1000000-0000-0000-0000-000000000001', 'Trasporti',   '2026-05', 150.00),
  ('a1000000-0000-0000-0000-000000000001', 'Salute',      '2026-05', 100.00),
  ('a1000000-0000-0000-0000-000000000001', 'Abbonamenti', '2026-05',  50.00);
```

See the chat thread for the full expected aggregations, donut shares, cashflow running sum, heatmap intensities, and KPI math.
