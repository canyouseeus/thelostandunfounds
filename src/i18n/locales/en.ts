// English is the source of truth for the string catalogue: every other locale is
// typed as `Dictionary`, so adding a key here turns every missing translation
// into a compile error rather than a silent fallback at runtime.
//
// Brand names are deliberately absent. THE LOST ARCHIVES, GEARHEADS, EDGE OF THE
// BORDERLANDS, MAD SCIENTISTS, NEW THEORY and SAGE MODE are the publication's own
// proper nouns and stay in English everywhere, so they remain literals in the JSX.
const en = {
  'language.label': 'LANGUAGE',
  'language.select': 'Select language',
  'language.scope': 'Site navigation is translated. Articles are published in English.',

  'nav.menu': 'MENU',
  'nav.closeMenu': 'Close menu',
  'nav.toggleMenu': 'Toggle menu',
  'nav.home': 'HOME',
  'nav.shop': 'SHOP',
  'nav.gallery': 'THE GALLERY',
  'nav.events': 'EVENTS',
  'nav.services': 'SERVICES',
  'nav.allArticles': 'ALL ARTICLES',
  'nav.more': 'MORE',
  'nav.about': 'ABOUT',
  'nav.privacyPolicy': 'PRIVACY POLICY',
  'nav.termsOfService': 'TERMS OF SERVICE',
  'nav.affiliateDashboard': 'AFFILIATE DASHBOARD',
  'nav.adminDashboard': 'ADMIN DASHBOARD',
  'nav.logIn': 'LOG IN',
  'nav.logOut': 'LOG OUT',
  'nav.loggedInAs': 'Logged in as:',
  'nav.on': 'ON',
  'nav.off': 'OFF',

  'footer.rights': 'All rights reserved.',
  'footer.privacy': 'Privacy Policy',
  'footer.terms': 'Terms of Use',
  'footer.about': 'About',
  'footer.contact': 'Contact',
  'footer.support': 'Support',
  'footer.advertise': 'Advertise',
  'footer.affiliates': 'Affiliates',
  'footer.pay': 'Pay',
}

export type TranslationKey = keyof typeof en
export type Dictionary = Record<TranslationKey, string>

export default en
