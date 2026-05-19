# Portal Profile — Spec Completa

Questa feature è **già implementata** nel codebase. Questo documento la specifica per riferimento futuro.

---

## Tabella DB: `portal_profiles`

**Tipo:** Singleton (una riga per `portal_id`)  
**Esistente:** Sì (confermato via MCP)

### Colonne (dall'interfaccia TypeScript `src/types/settings.ts`)

```ts
interface PortalProfile {
  id: string;
  portal_id: string;           // UUID, FK portals(id), UNIQUE

  // Informazioni Azienda
  legal_name?: string;         // Ragione Sociale
  vat_number?: string;         // Partita IVA
  address_line1?: string;      // Via, numero civico
  address_line2?: string;      // Interno, piano (opzionale)
  city?: string;               // Città
  state?: string;              // Provincia / Stato
  zip?: string;                // CAP
  country?: string;            // Codice paese ISO (es. "IT")
  phone?: string;              // Telefono con prefisso internazionale
  website?: string;            // URL sito web

  // Preferenze Regionali
  language?: string;           // "Italiano" | "English"
  timezone?: string;           // IANA timezone (es. "Europe/Rome")
  date_format?: string;        // "DD/MM/YYYY" | "MM/DD/YYYY"

  created_at: string;
  updated_at: string;
}
```

---

## Hook: `usePortalProfile()`

**File:** `src/hooks/settings/index.ts:104`

```ts
export const usePortalProfile = () => useSingleton<PortalProfile>("portal_profiles");
```

**`useSingleton` internals:**
1. Init stato da cache localStorage `swr_single_portal_profiles_${currentPortalId}`
2. Fetch async `supabase.from("portal_profiles").select("*").eq("portal_id", currentPortalId).single()`
3. `upsert(payload)`: `supabase.upsert({ ...payload, portal_id: currentPortalId }, { onConflict: "portal_id" })`
4. Cache aggiornata dopo ogni upsert

**Return:** `{ data: PortalProfile | null, loading: boolean, refetch: () => void, upsert: (Partial<PortalProfile>) => Promise<{data, error}> }`

---

## UI: `PortalProfile.tsx`

**File:** `src/pages/settings/general/PortalProfile.tsx`  
**Rotta:** `/settings/profile` (o equivalente in `settingsRoutes.tsx`)

### Struttura

```
SettingsPageHeader (Building2 icon, "Profilo Portale")
SettingsCard "Informazioni Azienda"
  Grid 1fr 1fr:
    [full width] Ragione Sociale
    Partita IVA | Telefono
    [full width] Indirizzo
    Indirizzo 2 | Sito Web
    Città | Provincia / Stato
    CAP | Paese (select)
SettingsCard "Preferenze Regionali"
  Grid 1fr 1fr:
    Lingua (select) | Fuso Orario (select)
    [full width] Formato Data (glass-segment: DD/MM/YYYY | MM/DD/YYYY)
Buttons: [Annulla] [Salva Modifiche]
```

### Comportamento

- **Load:** Spinner centrato durante loading iniziale
- **Populate:** `useEffect` su `data` → riempie form quando dati arrivano
- **Save:** `handleSave()` → chiama `upsert()` → toast success/error
- **Cancel:** Reimposta form ai valori `data` (o `defaultForm` se data è null)
- **Save mode:** Esplicito (bottone "Salva Modifiche"), non auto-save con debounce

### Default values

```ts
const defaultForm = {
  legal_name: "", vat_number: "", address_line1: "", address_line2: "",
  city: "", state: "", zip: "", country: "IT", phone: "", website: "",
  language: "Italiano", timezone: "Europe/Rome", date_format: "DD/MM/YYYY",
};
```

---

## RLS Attuale

**SELECT:** ✅ `portal_id IN (portal_members WHERE user_id = auth.uid())`  
**INSERT:** ❌ `WITH CHECK` assente — tutti gli authenticated possono inserire  
**UPDATE:** ✅ USING: `portal_members WHERE user_id = auth.uid() AND role IN ('owner','admin')`  
**DELETE:** ✅ USING: stesso  

**Policy duplicate:** `pa_manage_portal_profile` e `pm_select_portal_profile` (vecchie) da rimuovere.

---

## Validazione Futura (non ancora implementata)

Se si vuole aggiungere validazione server-side:

| Campo | Regola |
|---|---|
| `vat_number` | Opzionale. Se country=IT, deve matchare `^IT\d{11}$` |
| `phone` | Opzionale. Formato E.164: `^\+\d{7,15}$` |
| `website` | Opzionale. Deve iniziare con `https?://` |
| `zip` | Opzionale. Per country=IT: `^\d{5}$` |

Attualmente nessuna validazione è implementata nel frontend — il form accetta qualsiasi stringa.
