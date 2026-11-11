export const ASSET = '/assets/';
export const WA_NUMBER = '919691091766';
export const EMAIL = 'Zudevelopers86@gmail.com';
export const PAGE_TITLE = 'ZU Developers | Builders and Constructors';

// Keep the original site defaults; these integrations can be enabled when configured.
export const ENABLE_PROJECT_MODAL = false;
export const ENABLE_FORMSUBMIT = false;

export const waLink = (text) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
export const WA_GENERAL = waLink(
  'Hello ZU Developers, I would like to know more about your projects.',
);
