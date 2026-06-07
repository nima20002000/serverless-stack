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
  seo: {
    productsTitle: 'Products - {siteName}',
    productsDescription: 'Browse the product catalog for {siteName}.',
    productsCategoryTitle: '{category} products - {siteName}',
    productsCategoryDescription: 'Browse products in the {category} category.',
    productsTagTitle: '{tag} products - {siteName}',
    productsTagDescription: 'Browse products tagged {tag}.',
    productsSearchTitle: 'Search results for {search} - {siteName}',
    productsSearchDescription: 'Product search results for "{search}".',
    pageSuffix: 'Page {page}',
    productsOgAlt: '{siteName} products',
    productCategory: 'Category',
    productPrice: 'Price',
    productAvailability: 'Availability',
    inStock: 'In stock',
    outOfStock: 'Out of stock',
    productNotFoundTitle: 'Product not found - {siteName}',
    productNotFoundDescription: 'This product is not currently available.',
    breadcrumbHome: 'Home',
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
  payment: {
    statusUnavailable: 'Payment status unavailable',
    cancelled: 'Payment cancelled',
    pending: 'Payment pending',
    failed: 'Payment failed',
    completed: 'Payment Completed',
    unavailableDescription:
      'The payment provider returned without a transaction code.',
    unavailableSuccessDescription:
      'The payment provider returned without a transaction code. Your cart has not been cleared.',
    cancelledDescription:
      'You cancelled checkout before payment was completed.',
    pendingDescription:
      'The payment provider is still processing this transaction.',
    failedDescription: 'The payment provider could not complete this payment.',
    completedDescription: 'Your order has been recorded successfully.',
    pendingSuccessDescription:
      'Your payment is still being confirmed by the payment provider.',
    missingCodeInfo:
      'Your cart has not been cleared. Return to the cart to continue checkout.',
    cancelledInfo: 'Your cart is still available so you can retry checkout.',
    pendingInfo:
      'Your cart is still available. You can wait and check your profile later, or retry checkout.',
    failedInfo:
      'No payment was captured by this page. Return to the cart to choose Stripe or PayPal again.',
    transactionCode: 'Transaction code',
    provider: 'Provider',
    reference: 'Reference',
    paypalCapture: 'PayPal Capture',
    stripeSession: 'Stripe Session',
    checkingStatus: 'Checking the payment provider for the latest status...',
    cartCleared:
      'Your cart has been cleared. You can review this transaction from your profile.',
    retryCheckout: 'Your cart is still available so you can retry checkout.',
    keepOpen:
      'Keep this page open while we poll for confirmation, or return to the cart if you need to try again.',
    takingLonger:
      'Confirmation is taking longer than expected. Check your profile later or return to the cart.',
    statusCheck: 'Status check {attempts} of 30.',
    missingTransactionCode:
      'We could not find a transaction code for this payment return.',
    unableToLoadStatus: 'Unable to load payment status.',
    returnToCart: 'Return to cart',
    continueShopping: 'Continue shopping',
    viewTransactions: 'View transactions',
  },
  email: {
    automated:
      'This is an automated message. Please do not reply to this email.',
    otpSubject: 'Your {siteName} sign-in code',
    otpIntro: 'Use this verification code to finish signing in to {siteName}.',
    otpExpiry:
      'This code expires in 5 minutes. If you did not request it, you can safely ignore this email.',
    code: 'Code',
    orderConfirmedSubject: 'Order {orderCode} confirmed - {siteName}',
    orderConfirmedTitle: 'Order confirmed',
    orderConfirmedGreeting: 'Hi {buyerName},',
    orderConfirmedIntro:
      'Thanks for your order from {siteName}. We received your payment and will process the order shortly.',
    orderCode: 'Order code',
    orderDate: 'Order date',
    items: 'Items',
    paymentMethod: 'Payment method',
    total: 'Total',
    shipping: 'Shipping',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    postalCode: 'Postal code',
    orderItems: 'Order items',
    product: 'Product',
    quantity: 'Quantity',
    unitPrice: 'Unit price',
    lineTotal: 'Line total',
    customerFallback: 'Customer',
    notProvided: 'Not provided',
  },
};

const deMessages: Messages = {
  common: {
    loading: 'Wird geladen...',
    close: 'Schließen',
  },
  seo: {
    productsTitle: 'Produkte - {siteName}',
    productsDescription: 'Durchsuche den Produktkatalog von {siteName}.',
    productsCategoryTitle: '{category} Produkte - {siteName}',
    productsCategoryDescription:
      'Durchsuche Produkte in der Kategorie {category}.',
    productsTagTitle: '{tag} Produkte - {siteName}',
    productsTagDescription: 'Durchsuche Produkte mit dem Schlagwort {tag}.',
    productsSearchTitle: 'Suchergebnisse für {search} - {siteName}',
    productsSearchDescription: 'Produktsuchergebnisse für "{search}".',
    pageSuffix: 'Seite {page}',
    productsOgAlt: '{siteName} Produkte',
    productCategory: 'Kategorie',
    productPrice: 'Preis',
    productAvailability: 'Verfügbarkeit',
    inStock: 'Auf Lager',
    outOfStock: 'Nicht vorrätig',
    productNotFoundTitle: 'Produkt nicht gefunden - {siteName}',
    productNotFoundDescription: 'Dieses Produkt ist derzeit nicht verfügbar.',
    breadcrumbHome: 'Startseite',
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
  payment: {
    statusUnavailable: 'Zahlungsstatus nicht verfügbar',
    cancelled: 'Zahlung abgebrochen',
    pending: 'Zahlung ausstehend',
    failed: 'Zahlung fehlgeschlagen',
    completed: 'Zahlung abgeschlossen',
    unavailableDescription:
      'Der Zahlungsanbieter hat ohne Transaktionscode zurückgeleitet.',
    unavailableSuccessDescription:
      'Der Zahlungsanbieter hat ohne Transaktionscode zurückgeleitet. Dein Warenkorb wurde nicht geleert.',
    cancelledDescription:
      'Du hast den Checkout abgebrochen, bevor die Zahlung abgeschlossen wurde.',
    pendingDescription:
      'Der Zahlungsanbieter verarbeitet diese Transaktion noch.',
    failedDescription:
      'Der Zahlungsanbieter konnte diese Zahlung nicht abschließen.',
    completedDescription: 'Deine Bestellung wurde erfolgreich erfasst.',
    pendingSuccessDescription:
      'Deine Zahlung wird noch vom Zahlungsanbieter bestätigt.',
    missingCodeInfo:
      'Dein Warenkorb wurde nicht geleert. Kehre zum Warenkorb zurück, um den Checkout fortzusetzen.',
    cancelledInfo:
      'Dein Warenkorb ist weiterhin verfügbar, damit du den Checkout erneut versuchen kannst.',
    pendingInfo:
      'Dein Warenkorb ist weiterhin verfügbar. Du kannst warten und später dein Profil prüfen oder den Checkout erneut versuchen.',
    failedInfo:
      'Auf dieser Seite wurde keine Zahlung erfasst. Kehre zum Warenkorb zurück, um Stripe oder PayPal erneut auszuwählen.',
    transactionCode: 'Transaktionscode',
    provider: 'Anbieter',
    reference: 'Referenz',
    paypalCapture: 'PayPal-Erfassung',
    stripeSession: 'Stripe-Sitzung',
    checkingStatus: 'Der aktuelle Status wird beim Zahlungsanbieter geprüft...',
    cartCleared:
      'Dein Warenkorb wurde geleert. Du kannst diese Transaktion in deinem Profil prüfen.',
    retryCheckout:
      'Dein Warenkorb ist weiterhin verfügbar, damit du den Checkout erneut versuchen kannst.',
    keepOpen:
      'Lass diese Seite offen, während wir auf die Bestätigung warten, oder kehre zum Warenkorb zurück, wenn du es erneut versuchen musst.',
    takingLonger:
      'Die Bestätigung dauert länger als erwartet. Prüfe später dein Profil oder kehre zum Warenkorb zurück.',
    statusCheck: 'Statusprüfung {attempts} von 30.',
    missingTransactionCode:
      'Wir konnten keinen Transaktionscode für diese Zahlungsrückleitung finden.',
    unableToLoadStatus: 'Der Zahlungsstatus konnte nicht geladen werden.',
    returnToCart: 'Zurück zum Warenkorb',
    continueShopping: 'Weiter einkaufen',
    viewTransactions: 'Transaktionen ansehen',
  },
  email: {
    automated:
      'Dies ist eine automatische Nachricht. Bitte antworte nicht auf diese E-Mail.',
    otpSubject: 'Dein Anmeldecode für {siteName}',
    otpIntro:
      'Verwende diesen Bestätigungscode, um die Anmeldung bei {siteName} abzuschließen.',
    otpExpiry:
      'Dieser Code läuft in 5 Minuten ab. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.',
    code: 'Code',
    orderConfirmedSubject: 'Bestellung {orderCode} bestätigt - {siteName}',
    orderConfirmedTitle: 'Bestellung bestätigt',
    orderConfirmedGreeting: 'Hallo {buyerName},',
    orderConfirmedIntro:
      'Danke für deine Bestellung bei {siteName}. Wir haben deine Zahlung erhalten und bearbeiten die Bestellung in Kürze.',
    orderCode: 'Bestellcode',
    orderDate: 'Bestelldatum',
    items: 'Artikel',
    paymentMethod: 'Zahlungsmethode',
    total: 'Gesamt',
    shipping: 'Versand',
    name: 'Name',
    phone: 'Telefon',
    address: 'Adresse',
    postalCode: 'Postleitzahl',
    orderItems: 'Bestellartikel',
    product: 'Produkt',
    quantity: 'Menge',
    unitPrice: 'Einzelpreis',
    lineTotal: 'Zeilensumme',
    customerFallback: 'Kunde',
    notProvided: 'Nicht angegeben',
  },
};

export const dictionaries: Record<Locale, Messages> = {
  en: enMessages,
  de: deMessages,
};

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
