// GET /aion/r/<token>: an AION member's own link from their email.
import { redeemHandler } from '../../../lib/partner-redeem.js';

export const onRequestGet = redeemHandler('aion');
