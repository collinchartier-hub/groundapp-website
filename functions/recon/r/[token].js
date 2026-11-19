// GET/POST /recon/r/<token>: tracked member redemption link.
import { redeemHandler } from '../../../lib/partner-redeem.js';

export const { onRequestGet, onRequestPost } = redeemHandler('recon');
