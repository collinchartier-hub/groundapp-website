// GET /traverse/r/<token>: a Traverse Fitness member's own link from their email.
import { redeemHandler } from '../../../lib/partner-redeem.js';

export const onRequestGet = redeemHandler('traverse');
