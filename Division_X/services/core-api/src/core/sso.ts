import { SAML } from '@node-saml/node-saml';

const SSO_ENTRY_POINT = process.env.SSO_ENTRY_POINT || 'https://mock-idp.com/saml/sso';
const SSO_ISSUER = process.env.SSO_ISSUER || 'thetime-platform';
const SSO_CALLBACK_URL = process.env.SSO_CALLBACK_URL || 'http://localhost:5000/v1/auth/sso/callback';
const SSO_CERT = process.env.SSO_CERT || 'mock-cert-data';

export const samlProvider = new SAML({
  entryPoint: SSO_ENTRY_POINT,
  issuer: SSO_ISSUER,
  callbackUrl: SSO_CALLBACK_URL,
  idpCert: SSO_CERT,
  wantAssertionsSigned: false
});
