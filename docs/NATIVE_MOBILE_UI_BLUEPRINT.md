# Fimara Native Mobile UI & GCB-Style Navigation Blueprint

This document specifies the exact architecture, component structure, and implementation details for Fimara's **Native Mobile UI** with the **GCB-Style "More" Screen**. When ready to build, this blueprint can be executed immediately without any redesign or brainstorming.

---

## 1. Visual Design References

* **Main Page (Home Active)**:
  * 5 docked bottom navigation tabs: `[ Home ]` `[ Vaults ]` `[ Transactions ]` `[ Fima AI ]` `[ More ]`
  * Aerodynamic emerald 'F' logo at top-left, user avatar at top-right.
  * Hero Net Balance card with mini trend chart and 3 thumb-action buttons:
    * `[ + Income ]`
    * `[ - Expense ]`
    * `[ ⇄ Transfer ]`
  * Monthly cashflow widget and recent transactions list.

* **"More" Screen (GCB Commercial Banking List Style)**:
  * Replaces chunky floating cards with grouped, hairline-divided horizontal list rows on obsidian dark `#0B0E14`.
  * Clean monochrome icons on the left, descriptive subtitles, and right chevron arrows (`>`).
  * Admin Console row is strictly guarded and only visible if `user.role === 'admin'`.

---

## 2. Platform Separation (Web vs. Installed App)

### Detection Rule
Visitors using standard web browsers (desktop, laptop, mobile Safari/Chrome via `https://fimara.xyz/`) will continue to see the **standard sidebar layout**. Only installed Play Store / PWA app launches receive the native bottom navigation bar.

```ts
// src/hooks/useIsNativeApp.ts
export function useIsNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isPlayStoreParam = new URLSearchParams(window.location.search).get('source') === 'playstore';
  const isPersisted = sessionStorage.getItem('fimara_is_installed') === 'true';

  if (isStandalone || isPlayStoreParam) {
    sessionStorage.setItem('fimara_is_installed', 'true');
    return true;
  }
  return isPersisted;
}
```

---

## 3. The 5 Bottom Navigation Tabs

1. **Home**: Dashboard, Net Balance, Action Buttons, Cashflow, Recent Transactions.
2. **Vaults**: Savings Vaults, Goal Target Dates, Progress Rings, Liquidity breakdown.
3. **Transactions**: Complete transaction ledger, search bar, category filters, CSV export.
4. **Fima AI**: Fullscreen conversational AI financial intelligence and cashflow advisory.
5. **More**: Grouped commercial banking menu for advanced tools and settings.

---

## 4. The GCB-Style "More" Menu Breakdown

* **Section 1: FINANCIAL MANAGEMENT**
  * 🎙️ **Live Voice Advisor** $\rightarrow$ *Connect with a dedicated realtime financial consultant* `>` (Opens Voice AI modal)
  * 📊 **Budgets & Spending Limits** $\rightarrow$ *Set monthly controls for spending* `>` (Opens Budgets view)
  * 💳 **Debt & Liability Tracker** $\rightarrow$ *Monitor and manage loans and dues* `>` (Opens Debts view)

* **Section 2: RECORDS**
  * 📅 **Monthly Financial History** $\rightarrow$ *View detailed summaries of your past finances* `>` (Opens Monthly History)
  * 📑 **Export Statements & Reports** $\rightarrow$ *Generate and download formal documentation* `>` (Opens Export Reports modal)

* **Section 3: SECURITY**
  * 🛡️ **Security & Offline Passcode** $\rightarrow$ *Manage app security and offline access* `>` (Opens Offline PIN Settings)
  * ⚙️ **Admin Console** *(Badge: Gold `Admin` pill)* $\rightarrow$ *Administrative tools and settings* `>` (Admin Only)

---

## 5. Implementation Files Plan

When executing:
1. `src/hooks/useIsNativeApp.ts` — Detects standalone PWA or Play Store launch parameter.
2. `src/components/Mobile/NativeBottomNav.tsx` — 5-tab docked bottom navigation bar with gesture bar padding.
3. `src/components/Mobile/NativeMoreView.tsx` — GCB-style grouped banking menu list.
4. `src/App.tsx` — Conditionally swaps between `<NavigationSidebar />` (web) and `<NativeBottomNav />` (installed app).

---

## 6. Execution Command
To start building when ready, simply enter:
`Execute the Native Mobile UI Blueprint from docs/NATIVE_MOBILE_UI_BLUEPRINT.md`

