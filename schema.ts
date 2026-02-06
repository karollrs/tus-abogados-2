import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// =============================================================================
// TUSA GATO'S 24/7 - CONVEX SCHEMA
// =============================================================================

export default defineSchema({
  // ===========================================================================
  // USERS & AUTHENTICATION
  // ===========================================================================
  users: defineTable({
    email: v.string(),
    role: v.union(v.literal("super_admin"), v.literal("admin"), v.literal("agent"), v.literal("attorney")),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    clerkId: v.optional(v.string()), // For Clerk auth integration
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_clerk_id", ["clerkId"]),

  // ===========================================================================
  // ATTORNEYS
  // ===========================================================================
  attorneys: defineTable({
    userId: v.id("users"),
    barNumber: v.string(),
    firmName: v.string(),
    phone: v.string(),
    email: v.string(),
    website: v.optional(v.string()),
    address: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("suspended"), v.literal("cancelled")),
    subscriptionTier: v.union(v.literal("basic"), v.literal("standard"), v.literal("premium")),
    maxLeadsPerDay: v.number(),
    responseTimeAvg: v.optional(v.number()), // in minutes
    conversionRate: v.optional(v.number()), // 0-1
    rating: v.optional(v.number()), // 1-5
    notes: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
  })
    .index("by_user_id", ["userId"])
    .index("by_status", ["status"])
    .index("by_tier", ["subscriptionTier"]),

  attorneySpecializations: defineTable({
    attorneyId: v.id("attorneys"),
    caseType: v.string(), // personal_injury, workers_comp, etc.
    isPrimary: v.boolean(),
    yearsExperience: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_attorney", ["attorneyId"])
    .index("by_case_type", ["caseType"])
    .index("by_attorney_case_type", ["attorneyId", "caseType"]),

  attorneyCounties: defineTable({
    attorneyId: v.id("attorneys"),
    county: v.string(),
    state: v.union(v.literal("NY"), v.literal("NJ")),
    priority: v.number(), // 1 = highest
    isPrimaryOffice: v.boolean(),
  })
    .index("by_attorney", ["attorneyId"])
    .index("by_location", ["county", "state"])
    .index("by_attorney_location", ["attorneyId", "county", "state"]),

  // ===========================================================================
  // LEADS
  // ===========================================================================
  leads: defineTable({
    // Call/Contact Info
    retellCallId: v.optional(v.string()),
    phone: v.string(),
    phoneAlt: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    
    // Case Details
    caseType: v.string(),
    caseSubtype: v.optional(v.string()),
    county: v.string(),
    state: v.union(v.literal("NY"), v.literal("NJ")),
    incidentDate: v.optional(v.string()), // ISO date
    incidentLocation: v.optional(v.string()),
    description: v.optional(v.string()),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("emergency")),
    languagePref: v.union(v.literal("spanish"), v.literal("english"), v.literal("bilingual")),
    
    // Source & Status
    source: v.union(v.literal("ai_receptionist"), v.literal("human_agent"), v.literal("website"), v.literal("referral"), v.literal("manual")),
    status: v.union(
      v.literal("new"),
      v.literal("qualified"),
      v.literal("pending_match"),
      v.literal("matched"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("contacted"),
      v.literal("converted"),
      v.literal("closed"),
      v.literal("spam")
    ),
    
    // Qualification
    qualificationScore: v.optional(v.number()), // 0-100
    qualificationNotes: v.optional(v.string()),
    
    // AI Data
    aiTranscript: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    extractedData: v.optional(v.any()),
    recordingUrl: v.optional(v.string()),
    
    // Callback
    callbackRequested: v.boolean(),
    callbackTime: v.optional(v.number()), // Unix timestamp
    
    // Assignment
    assignedAgentId: v.optional(v.id("users")),
    convertedToCase: v.boolean(),
    convertedAt: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_case_type", ["caseType"])
    .index("by_location", ["county", "state"])
    .index("by_phone", ["phone"])
    .index("by_retell_call_id", ["retellCallId"])
    .index("by_created_at", ["createdAt"])
    .index("by_urgency", ["urgency"])
    .index("by_status_urgency", ["status", "urgency"]),

  // ===========================================================================
  // CASE TRANSFERS (Lead Distribution)
  // ===========================================================================
  caseTransfers: defineTable({
    leadId: v.id("leads"),
    attorneyId: v.id("attorneys"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined"), v.literal("expired"), v.literal("cancelled")),
    priority: v.number(), // Match ranking
    matchingReason: v.optional(v.string()),
    matchingScore: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    expiresAt: v.number(),
    respondedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_attorney", ["attorneyId"])
    .index("by_status", ["status"])
    .index("by_expires_at", ["expiresAt"])
    .index("by_lead_status", ["leadId", "status"]),

  attorneyResponses: defineTable({
    transferId: v.id("caseTransfers"),
    responseType: v.union(v.literal("accepted"), v.literal("declined"), v.literal("counter_offer"), v.literal("needs_info")),
    responseChannel: v.union(v.literal("sms"), v.literal("email"), v.literal("phone"), v.literal("portal")),
    respondedAt: v.number(),
    notes: v.optional(v.string()),
    estimatedCaseValue: v.optional(v.number()),
    rejectionReason: v.optional(v.union(
      v.literal("conflict"),
      v.literal("capacity"),
      v.literal("not_in_area"),
      v.literal("not_qualified"),
      v.literal("fee_too_low"),
      v.literal("other")
    )),
    followUpNeeded: v.boolean(),
  }).index("by_transfer", ["transferId"]),

  // ===========================================================================
  // CALL LOGS (From RetellAI)
  // ===========================================================================
  callLogs: defineTable({
    leadId: v.optional(v.id("leads")),
    retellCallId: v.string(),
    retellAgentId: v.string(),
    phoneNumber: v.string(),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    status: v.union(v.literal("completed"), v.literal("failed"), v.literal("no_answer"), v.literal("voicemail"), v.literal("transferred")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    recordingUrl: v.optional(v.string()),
    rawTranscript: v.optional(v.any()),
    extractedData: v.optional(v.any()),
    sentimentScore: v.optional(v.number()), // -1 to 1
    metadata: v.optional(v.any()),
  })
    .index("by_lead", ["leadId"])
    .index("by_retell_call_id", ["retellCallId"])
    .index("by_started_at", ["startedAt"]),

  // ===========================================================================
  // NOTES & ACTIVITY
  // ===========================================================================
  leadNotes: defineTable({
    leadId: v.id("leads"),
    userId: v.id("users"),
    noteType: v.union(v.literal("general"), v.literal("follow_up"), v.literal("quality"), v.literal("conversion"), v.literal("complaint")),
    content: v.string(),
    isPrivate: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_lead", ["leadId"])
    .index("by_user", ["userId"]),

  activities: defineTable({
    entityType: v.string(),
    entityId: v.string(),
    action: v.string(),
    userId: v.optional(v.id("users")),
    oldValues: v.optional(v.any()),
    newValues: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_entity", ["entityType", "entityId"])
    .index("by_user", ["userId"])
    .index("by_created_at", ["createdAt"]),

  // ===========================================================================
  // NOTIFICATIONS
  // ===========================================================================
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    channel: v.union(v.literal("sms"), v.literal("email"), v.literal("push")),
    status: v.union(v.literal("pending"), v.literal("scheduled"), v.literal("sent"), v.literal("delivered"), v.literal("opened"), v.literal("failed")),
    content: v.string(),
    subject: v.optional(v.string()),
    metadata: v.optional(v.any()),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_scheduled", ["scheduledAt"]),

  // ===========================================================================
  // REAL-TIME QUEUE (for dashboard)
  // ===========================================================================
  leadQueue: defineTable({
    leadId: v.id("leads"),
    status: v.string(),
    priority: v.number(),
    caseType: v.string(),
    county: v.string(),
    urgency: v.string(),
    matchedAttorneys: v.array(v.id("attorneys")),
    expiresAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_lead", ["leadId"])
    .index("by_expires", ["expiresAt"]),

  // ===========================================================================
  // SETTINGS
  // ===========================================================================
  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
