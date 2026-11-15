/**
 * The installation's name. Kheengz is sold as a product, so a buyer's copy shows its own name
 * (Home Nest, say) everywhere a page names the platform: set NEXT_PUBLIC_APP_NAME, never write
 * "Kheengz" in a component. The API names itself the same way (config app.name).
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Kheengz";

/** Where marketplace shops live: `<slug>.SHOPS_DOMAIN` (D26). The API's SHOPS_DOMAIN, the same value. */
export const SHOPS_DOMAIN = process.env.NEXT_PUBLIC_SHOPS_DOMAIN || "kheengz.com";
