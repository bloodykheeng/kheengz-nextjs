import type { IconType } from "react-icons";
import {
  MdDashboard,
  MdOutlineStorefront,
  MdOutlineShoppingBag,
  MdOutlineInventory2,
  MdOutlineCategory,
  MdOutlinePointOfSale,
  MdOutlineLocalShipping,
  MdOutlinePayments,
  MdOutlineAccountBalanceWallet,
  MdOutlineReceiptLong,
  MdOutlineCampaign,
  MdBarChart,
  MdPeople,
  MdSettings,
  MdHistory,
  MdOutlineDns,
  MdOutlineAdminPanelSettings,
  MdOutlineNotificationsActive,
  MdOutlineHelpOutline,
} from "react-icons/md";

/**
 * Sidebar icons by name (lib/menuItems.ts `iconName`). The foundation's, and the ones the
 * Phase 1 modules will name (shops, orders, products, counter sales, deliveries, payouts).
 */
const iconRegistry: Record<string, IconType> = {
  dashboard: MdDashboard,
  shop: MdOutlineStorefront,
  orders: MdOutlineShoppingBag,
  products: MdOutlineInventory2,
  category: MdOutlineCategory,
  counter: MdOutlinePointOfSale,
  delivery: MdOutlineLocalShipping,
  payments: MdOutlinePayments,
  wallet: MdOutlineAccountBalanceWallet,
  ledger: MdOutlineReceiptLong,
  marketing: MdOutlineCampaign,
  chart: MdBarChart,
  people: MdPeople,
  settings: MdSettings,
  history: MdHistory,
  queue: MdOutlineDns,
  shield: MdOutlineAdminPanelSettings,
  bell: MdOutlineNotificationsActive,
  help: MdOutlineHelpOutline,
};

export function getIcon(name: string): IconType | undefined {
  return iconRegistry[name];
}

/**
 * Render a registry icon as an element.
 *
 * Returns an ELEMENT, not a component type, and that is the point. Handing a
 * looked-up component back to a caller who then writes `<Icon />` makes React
 * see a component type it cannot prove is stable, so it assumes a new type on
 * every render and would remount that subtree, resetting its state. Creating the
 * element here keeps every JSX tag in the app a fixed, statically known type.
 *
 * Prefer this over `getIcon` in render paths. `getIcon` stays exported for
 * anything that genuinely needs the component itself.
 */
export function renderIcon(
  name: string | undefined,
  className: string
): React.ReactNode {
  const Icon = name ? iconRegistry[name] : undefined;

  return Icon ? <Icon className={className} /> : null;
}
