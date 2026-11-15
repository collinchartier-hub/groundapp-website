// GET /recon/r/<token>: a RECON Wellness community member's own link from their email.
import { redeemHandler } from '../../../lib/partner-redeem.js';

export const onRequestGet = redeemHandler('recon');
