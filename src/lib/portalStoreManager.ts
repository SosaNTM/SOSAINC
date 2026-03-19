import { setActivePortal as setInvoicePortal } from "./invoiceStore";
import { setActivePortal as setTransactionPortal } from "./transactionStore";
import { setActivePortal as setCategoryPortal } from "./categoryStore";
import { setActivePortal as setChannelPortal } from "./channelStore";
import { setActivePortal as setVaultPortal } from "./vaultStore";
import { setActivePortal as setLinearPortal } from "./linearStore";
import { setActivePortal as setSocialPortal } from "./socialStore";

/**
 * Call this whenever the active portal changes.
 * Each store will swap its data to the portal-specific dataset.
 */
export function setActivePortal(portalId: string) {
  setInvoicePortal(portalId);
  setTransactionPortal(portalId);
  setCategoryPortal(portalId);
  setChannelPortal(portalId);
  setVaultPortal(portalId);
  setLinearPortal(portalId);
  setSocialPortal(portalId);
}
