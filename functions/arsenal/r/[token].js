// GET /arsenal/r/<token>: an Arsenal member's own link from their email.
import { redeemHandler } from '../../../lib/partner-redeem.js';

export const onRequestGet = redeemHandler('arsenal');
