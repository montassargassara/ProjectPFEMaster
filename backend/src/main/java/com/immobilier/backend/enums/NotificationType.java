package com.immobilier.backend.enums;

public enum NotificationType {
    // ── Property sharing workflow ────────────────────────────────────────────
    SHARE_REQUEST_RECEIVED,   // agency receives a new share request
    SHARE_REQUEST_ACCEPTED,   // super admin notified agency accepted
    SHARE_REQUEST_REJECTED,   // super admin notified agency rejected
    SHARE_REQUEST_CANCELLED,  // agency notified super admin cancelled

    // ── Affiliate account lifecycle ──────────────────────────────────────────
    AFFILIATE_REGISTRATION,   // super admin notified of new pending affiliate
    AFFILIATE_APPROVED,       // affiliate notified their account was approved
    AFFILIATE_REJECTED,       // affiliate notified their account was rejected
    AFFILIATE_SUSPENDED,      // affiliate notified their account was suspended

    // ── Sale offer workflow ──────────────────────────────────────────────────
    SALE_OFFER_RECEIVED,      // agency/super-admin notified of a new offer
    SALE_OFFER_ACCEPTED,      // affiliate notified their offer was accepted
    SALE_OFFER_REJECTED,      // affiliate notified their offer was rejected
    SALE_OFFER_COMPLETED,     // affiliate notified sale was finalised

    // ── Monthly bonus ────────────────────────────────────────────────────────
    MONTHLY_BONUS_AWARDED     // affiliate notified of a bonus for next month
}
