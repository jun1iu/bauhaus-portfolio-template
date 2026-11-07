// Site settings.

// Contact form. When this site's own server is running (see "Back-end and admin" in the
// README), messages go to its inbox and this setting isn't used. Otherwise messages are
// sent to a form service that forwards them to your inbox, so your email address never
// appears on the site.
//
// Web3Forms (default): go to https://web3forms.com, enter your email, and
// paste the access key it sends you below.
// Formspree: create a form at https://formspree.io, set provider to
// 'formspree', and paste the form ID (the part after /f/ in its URL).
//
// Either value is safe to publish: it can only send messages to you and
// doesn't reveal your address.
export const CONTACT_FORM = {
  provider: 'web3forms', // 'web3forms' or 'formspree'
  key: '',
  subject: 'New message from your website',
};
