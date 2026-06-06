import 'server-only';
import type { Locale } from './config';
import { defaultLocale } from './config';

export type Messages = typeof enMessages;
export type TranslationKey = string;

const enMessages = {
  common: {
    loading: 'Loading...',
    close: 'Close',
  },
  nav: {
    products: 'Products',
    about: 'About',
    contact: 'Contact',
    wishlist: 'Wishlist',
    cart: 'Cart',
    account: 'Account',
    admin: 'Admin',
    signIn: 'Sign in',
    signOut: 'Sign out',
    createAccount: 'Create account',
    language: 'Language',
    languageSwitcher: 'Switch language',
    toggleNavigation: 'Toggle navigation menu',
  },
  footer: {
    shop: 'Shop',
    support: 'Support',
    company: 'Company',
    shipping: 'Shipping',
    returns: 'Returns',
    faq: 'FAQ',
    privacy: 'Privacy',
    terms: 'Terms',
    boilerplate: 'Open-source commerce boilerplate.',
  },
  home: {
    badges: {
      supabase: 'Supabase ready',
      payments: 'Stripe and PayPal',
      direction: 'LTR and RTL capable',
    },
    title: 'A production-minded commerce storefront for modern stacks.',
    subtitle:
      'Start with a working storefront, product catalog, wishlist, cart, and checkout-ready commerce flow powered by Supabase and Vercel.',
    browseProducts: 'Browse products',
    viewCart: 'View cart',
    storefrontSurface: 'Storefront surface',
    catalogFirst: 'Catalog first',
    catalogFirstDescription:
      'The first screen sends shoppers directly into live product data instead of a marketing-only landing page.',
    paymentStack: 'Payment stack',
    providerNeutral: 'Provider neutral',
    providerNeutralDescription:
      'Built-in commerce contracts stay aligned with Stripe and PayPal while keeping copy and policies configurable.',
    featured: 'Featured',
    featuredProducts: 'Featured products',
    featuredProductsDescription:
      'A compact section for curated or high-priority catalog items.',
    viewAllProducts: 'View all products',
    promotions: 'Promotions',
    currentOffers: 'Current offers',
    currentOffersDescription:
      'Highlight discounted products without locking the boilerplate to a specific product category.',
    shopOffers: 'Shop offers',
    categories: 'Categories',
    shopByCategory: 'Shop by category',
    shopByCategoryDescription:
      'Use your own category tree to guide product discovery.',
    viewProducts: 'View products',
  },
  products: {
    catalog: 'Catalog',
    title: 'Products',
    heroDescription:
      'Browse the live product catalog, sort by the fields exposed by the data contract, and add available items to your cart.',
    addToCart: 'Add to Cart',
    adding: 'Adding...',
    outOfStock: 'Out of stock',
    backToProducts: 'Back to products',
  },
  cart: {
    title: 'Cart',
    closeCart: 'Close cart',
    emptyTitle: 'Your cart is empty',
    emptyDescription:
      'Browse products and add items when you are ready to checkout.',
    drawerEmptyDescription: 'Add a product to start checkout.',
    browseProducts: 'Browse products',
    itemsInCart: '{count} {itemLabel} in your cart',
    itemSingular: 'item',
    itemPlural: 'items',
    clearCart: 'Clear cart',
    clearConfirm: 'Clear all items from your cart?',
    items: 'Items',
    continueShopping: 'Continue shopping',
    orderSummary: 'Order summary',
    subtotal: 'Subtotal',
    total: 'Total',
    continueToCheckout: 'Continue to checkout',
    viewCart: 'View cart',
    couldNotUpdate: 'Could not update cart',
    notFound: 'Cart item was not found',
    maxStock: 'Maximum stock',
    decreaseQuantity: 'Decrease quantity',
    increaseQuantity: 'Increase quantity',
    removeFromCart: 'Remove from cart',
  },
  checkout: {
    fullName: 'Full name *',
    phone: 'Phone number *',
    email: 'Email (optional)',
    country: 'Country *',
    city: 'City',
    region: 'State, region, or province',
    addressLine1: 'Address line 1 *',
    addressLine2: 'Address line 2',
    postalCode: 'Postal or ZIP code',
    postalCodeOptional: 'Postal or ZIP code (optional)',
    fulfillmentNotice:
      'Shipping and tax are calculated by the configured fulfillment setup.',
    continueToPayment: 'Continue to payment',
    shippingInformation: 'Shipping information',
    payNow: 'Pay now',
    profileNameHint: 'To change your name, go to {profileLink}.',
    profilePhoneHint: 'To change your phone number, go to {profileLink}.',
    profileEmailHint: 'To change your email, go to {profileLink}.',
    profileLink: 'your profile',
    enterFullName: 'Please enter your full name.',
    invalidName:
      'Name can contain letters, spaces, hyphens, periods, and apostrophes.',
    invalidPhone: 'Please enter a valid phone number.',
  },
  validation: {
    shippingCountry: 'Please enter the shipping country.',
    addressLine1: 'Please enter address line 1.',
  },
};

const deMessages: Messages = {
  common: {
    loading: 'Wird geladen...',
    close: 'Schließen',
  },
  nav: {
    products: 'Produkte',
    about: 'Über uns',
    contact: 'Kontakt',
    wishlist: 'Wunschliste',
    cart: 'Warenkorb',
    account: 'Konto',
    admin: 'Admin',
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    createAccount: 'Konto erstellen',
    language: 'Sprache',
    languageSwitcher: 'Sprache wechseln',
    toggleNavigation: 'Navigationsmenü umschalten',
  },
  footer: {
    shop: 'Shop',
    support: 'Support',
    company: 'Unternehmen',
    shipping: 'Versand',
    returns: 'Rückgaben',
    faq: 'FAQ',
    privacy: 'Datenschutz',
    terms: 'Bedingungen',
    boilerplate: 'Open-Source-Commerce-Boilerplate.',
  },
  home: {
    badges: {
      supabase: 'Supabase bereit',
      payments: 'Stripe und PayPal',
      direction: 'LTR- und RTL-fähig',
    },
    title: 'Ein produktionsreifer Commerce-Storefront für moderne Stacks.',
    subtitle:
      'Starte mit Storefront, Produktkatalog, Wunschliste, Warenkorb und checkout-bereitem Commerce-Flow auf Supabase und Vercel.',
    browseProducts: 'Produkte ansehen',
    viewCart: 'Warenkorb ansehen',
    storefrontSurface: 'Storefront-Oberfläche',
    catalogFirst: 'Katalog zuerst',
    catalogFirstDescription:
      'Der erste Bildschirm führt Käufer direkt zu Live-Produktdaten statt zu einer reinen Marketingseite.',
    paymentStack: 'Payment-Stack',
    providerNeutral: 'Provider-neutral',
    providerNeutralDescription:
      'Integrierte Commerce-Verträge bleiben mit Stripe und PayPal abgestimmt, während Texte und Richtlinien konfigurierbar bleiben.',
    featured: 'Empfohlen',
    featuredProducts: 'Empfohlene Produkte',
    featuredProductsDescription:
      'Ein kompakter Bereich für kuratierte oder wichtige Katalogartikel.',
    viewAllProducts: 'Alle Produkte ansehen',
    promotions: 'Aktionen',
    currentOffers: 'Aktuelle Angebote',
    currentOffersDescription:
      'Hebe reduzierte Produkte hervor, ohne das Boilerplate an eine bestimmte Produktkategorie zu binden.',
    shopOffers: 'Angebote ansehen',
    categories: 'Kategorien',
    shopByCategory: 'Nach Kategorie einkaufen',
    shopByCategoryDescription:
      'Nutze deine eigene Kategoriestruktur, um die Produktsuche zu führen.',
    viewProducts: 'Produkte ansehen',
  },
  products: {
    catalog: 'Katalog',
    title: 'Produkte',
    heroDescription:
      'Durchsuche den Live-Produktkatalog, sortiere nach den Datenfeldern und lege verfügbare Artikel in den Warenkorb.',
    addToCart: 'In den Warenkorb',
    adding: 'Wird hinzugefügt...',
    outOfStock: 'Nicht vorrätig',
    backToProducts: 'Zurück zu Produkten',
  },
  cart: {
    title: 'Warenkorb',
    closeCart: 'Warenkorb schließen',
    emptyTitle: 'Dein Warenkorb ist leer',
    emptyDescription:
      'Stöbere durch Produkte und füge Artikel hinzu, wenn du bereit für den Checkout bist.',
    drawerEmptyDescription:
      'Füge ein Produkt hinzu, um den Checkout zu starten.',
    browseProducts: 'Produkte ansehen',
    itemsInCart: '{count} {itemLabel} im Warenkorb',
    itemSingular: 'Artikel',
    itemPlural: 'Artikel',
    clearCart: 'Warenkorb leeren',
    clearConfirm: 'Alle Artikel aus dem Warenkorb entfernen?',
    items: 'Artikel',
    continueShopping: 'Weiter einkaufen',
    orderSummary: 'Bestellübersicht',
    subtotal: 'Zwischensumme',
    total: 'Gesamt',
    continueToCheckout: 'Weiter zum Checkout',
    viewCart: 'Warenkorb ansehen',
    couldNotUpdate: 'Warenkorb konnte nicht aktualisiert werden',
    notFound: 'Warenkorbartikel wurde nicht gefunden',
    maxStock: 'Maximaler Bestand',
    decreaseQuantity: 'Menge verringern',
    increaseQuantity: 'Menge erhöhen',
    removeFromCart: 'Aus dem Warenkorb entfernen',
  },
  checkout: {
    fullName: 'Vollständiger Name *',
    phone: 'Telefonnummer *',
    email: 'E-Mail (optional)',
    country: 'Land *',
    city: 'Stadt',
    region: 'Bundesland, Region oder Provinz',
    addressLine1: 'Adresszeile 1 *',
    addressLine2: 'Adresszeile 2',
    postalCode: 'Post- oder PLZ-Code',
    postalCodeOptional: 'Post- oder PLZ-Code (optional)',
    fulfillmentNotice:
      'Versand und Steuern werden durch die konfigurierte Fulfillment-Einrichtung berechnet.',
    continueToPayment: 'Weiter zur Zahlung',
    shippingInformation: 'Lieferinformationen',
    payNow: 'Jetzt bezahlen',
    profileNameHint: 'Ändere deinen Namen in {profileLink}.',
    profilePhoneHint: 'Ändere deine Telefonnummer in {profileLink}.',
    profileEmailHint: 'Ändere deine E-Mail-Adresse in {profileLink}.',
    profileLink: 'deinem Profil',
    enterFullName: 'Bitte gib deinen vollständigen Namen ein.',
    invalidName:
      'Namen dürfen Buchstaben, Leerzeichen, Bindestriche, Punkte und Apostrophe enthalten.',
    invalidPhone: 'Bitte gib eine gültige Telefonnummer ein.',
  },
  validation: {
    shippingCountry: 'Bitte gib das Lieferland ein.',
    addressLine1: 'Bitte gib Adresszeile 1 ein.',
  },
};

export const dictionaries: Record<Locale, Messages> = {
  en: enMessages,
  de: deMessages,
};

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
