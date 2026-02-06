import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { api } from "./_generated/api";

// =============================================================================
// LEAD QUERIES
// =============================================================================

export const getAll = query({
  args: {
    status: v.optional(v.string()),
    caseType: v.optional(v.string()),
    county: v.optional(v.string()),
    state: v.optional(v.string()),
    urgency: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("leads").order("desc");
    
    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    }
    if (args.caseType) {
      query = query.withIndex("by_case_type", (q) => q.eq("caseType", args.caseType));
    }
    if (args.county && args.state) {
      query = query.withIndex("by_location", (q) => 
        q.eq("county", args.county).eq("state", args.state)
      );
    }
    if (args.urgency) {
      query = query.withIndex("by_urgency", (q) => q.eq("urgency", args.urgency));
    }

    const leads = await query.take(args.limit || 50);
    
    // Enrich with transfer info
    const enrichedLeads = await Promise.all(
      leads.map(async (lead) => {
        const transfers = await ctx.db
          .query("caseTransfers")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .collect();
        
        const activeTransfer = transfers.find(t => t.status === "pending");
        
        return {
          ...lead,
          transfers: transfers.length,
          activeTransfer: activeTransfer ? {
            id: activeTransfer._id,
            status: activeTransfer.status,
            expiresAt: activeTransfer.expiresAt,
          } : null,
        };
      })
    );

    return enrichedLeads;
  },
});

export const getById = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) return null;

    // Get transfers
    const transfers = await ctx.db
      .query("caseTransfers")
      .withIndex("by_lead", (q) => q.eq("leadId", args.id))
      .order("desc")
      .collect();

    // Enrich transfers with attorney info
    const enrichedTransfers = await Promise.all(
      transfers.map(async (transfer) => {
        const attorney = await ctx.db.get(transfer.attorneyId);
        return {
          ...transfer,
          attorney: attorney ? {
            id: attorney._id,
            firmName: attorney.firmName,
            phone: attorney.phone,
            email: attorney.email,
          } : null,
        };
      })
    );

    // Get notes
    const notes = await ctx.db
      .query("leadNotes")
      .withIndex("by_lead", (q) => q.eq("leadId", args.id))
      .order("desc")
      .collect();

    // Enrich notes with user info
    const enrichedNotes = await Promise.all(
      notes.map(async (note) => {
        const user = await ctx.db.get(note.userId);
        return {
          ...note,
          user: user ? {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
          } : null,
        };
      })
    );

    // Get call log if exists
    const callLog = lead.retellCallId 
      ? await ctx.db
          .query("callLogs")
          .withIndex("by_retell_call_id", (q) => q.eq("retellCallId", lead.retellCallId!))
          .first()
      : null;

    return {
      ...lead,
      transfers: enrichedTransfers,
      notes: enrichedNotes,
      callLog,
    };
  },
});

export const getStats = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const fromDate = args.dateFrom || Date.now() - 30 * 24 * 60 * 60 * 1000;
    const toDate = args.dateTo || Date.now();

    const leads = await ctx.db
      .query("leads")
      .withIndex("by_created_at", (q) => 
        q.gte("createdAt", fromDate).lte("createdAt", toDate)
      )
      .collect();

    const total = leads.length;
    const qualified = leads.filter(l => l.qualificationScore && l.qualificationScore >= 50).length;
    const matched = leads.filter(l => l.status === "matched" || l.status === "accepted").length;
    const converted = leads.filter(l => l.status === "converted").length;
    const byCaseType = leads.reduce((acc, lead) => {
      acc[lead.caseType] = (acc[lead.caseType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byStatus = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCounty = leads.reduce((acc, lead) => {
      const key = `${lead.county}, ${lead.state}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      qualified,
      matched,
      converted,
      conversionRate: total > 0 ? (converted / total * 100).toFixed(1) : "0",
      byCaseType,
      byStatus,
      byCounty,
    };
  },
});

// =============================================================================
// LEAD MUTATIONS
// =============================================================================

export const create = mutation({
  args: {
    phone: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    caseType: v.string(),
    county: v.string(),
    state: v.union(v.literal("NY"), v.literal("NJ")),
    incidentDate: v.optional(v.string()),
    description: v.optional(v.string()),
    urgency: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("emergency")),
    languagePref: v.union(v.literal("spanish"), v.literal("english"), v.literal("bilingual")),
    source: v.union(v.literal("ai_receptionist"), v.literal("human_agent"), v.literal("website"), v.literal("referral"), v.literal("manual")),
    retellCallId: v.optional(v.string()),
    aiTranscript: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    extractedData: v.optional(v.any()),
    recordingUrl: v.optional(v.string()),
    callbackRequested: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate qualification score
    const score = calculateQualificationScore(args);
    
    const leadId = await ctx.db.insert("leads", {
      ...args,
      status: score >= 50 ? "qualified" : "new",
      qualificationScore: score,
      convertedToCase: false,
      createdAt: now,
      updatedAt: now,
    });

    // Add to lead queue for real-time updates
    await ctx.db.insert("leadQueue", {
      leadId,
      status: score >= 50 ? "qualified" : "new",
      priority: getPriorityScore(args.urgency, score),
      caseType: args.caseType,
      county: args.county,
      urgency: args.urgency,
      matchedAttorneys: [],
      expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
    });

    // If qualified, trigger matching
    if (score >= 50) {
      await ctx.scheduler.runAfter(0, api.leads.findMatches, { leadId });
    }

    return { leadId, score, status: score >= 50 ? "qualified" : "new" };
  },
});

export const update = mutation({
  args: {
    id: v.id("leads"),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Lead not found");

    const updates = {
      ...args.updates,
      updatedAt: Date.now(),
    };

    await ctx.db.patch(args.id, updates);

    // Update lead queue if status changed
    if (args.updates.status) {
      const queueItem = await ctx.db
        .query("leadQueue")
        .withIndex("by_lead", (q) => q.eq("leadId", args.id))
        .first();
      
      if (queueItem) {
        await ctx.db.patch(queueItem._id, { status: args.updates.status });
      }
    }

    return { success: true, updated: Object.keys(args.updates) };
  },
});

export const addNote = mutation({
  args: {
    leadId: v.id("leads"),
    userId: v.id("users"),
    noteType: v.union(v.literal("general"), v.literal("follow_up"), v.literal("quality"), v.literal("conversion"), v.literal("complaint")),
    content: v.string(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("leadNotes", {
      ...args,
      createdAt: Date.now(),
    });

    // Update lead timestamp
    await ctx.db.patch(args.leadId, { updatedAt: Date.now() });

    return { noteId };
  },
});

export const convert = mutation({
  args: {
    leadId: v.id("leads"),
    attorneyId: v.id("attorneys"),
    estimatedValue: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.patch(args.leadId, {
      status: "converted",
      convertedToCase: true,
      convertedAt: now,
      updatedAt: now,
    });

    // Update queue
    const queueItem = await ctx.db
      .query("leadQueue")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
    
    if (queueItem) {
      await ctx.db.patch(queueItem._id, { status: "converted" });
    }

    // Log activity
    await ctx.db.insert("activities", {
      entityType: "lead",
      entityId: args.leadId,
      action: "converted",
      newValues: { attorneyId: args.attorneyId, estimatedValue: args.estimatedValue },
      createdAt: now,
    });

    return { success: true };
  },
});

// =============================================================================
// LEAD MATCHING
// =============================================================================

export const findMatches = internalAction({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.runQuery(api.leads.getById, { id: args.leadId });
    if (!lead) throw new Error("Lead not found");

    // Find attorneys who handle this case type and county
    const specializations = await ctx.runQuery(api.attorneys.getBySpecializationAndLocation, {
      caseType: lead.caseType,
      county: lead.county,
      state: lead.state,
    });

    // Score and rank matches
    const scoredMatches = specializations.map((spec: any) => {
      const score = calculateMatchScore(lead, spec.attorney, spec);
      return { attorneyId: spec.attorney._id, attorney: spec.attorney, score, reasons: score.reasons };
    });

    scoredMatches.sort((a: any, b: any) => b.score.total - a.score.total);

    // Create transfer for top match
    if (scoredMatches.length > 0) {
      const topMatch = scoredMatches[0];
      await ctx.runMutation(api.leads.createTransfer, {
        leadId: args.leadId,
        attorneyId: topMatch.attorneyId,
        matchingScore: topMatch.score.total,
        matchingReason: topMatch.reasons.join("; "),
      });
    }

    return { matchesFound: scoredMatches.length, topScore: scoredMatches[0]?.score.total || 0 };
  },
});

export const createTransfer = mutation({
  args: {
    leadId: v.id("leads"),
    attorneyId: v.id("attorneys"),
    matchingScore: v.number(),
    matchingReason: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const transferId = await ctx.db.insert("caseTransfers", {
      leadId: args.leadId,
      attorneyId: args.attorneyId,
      status: "pending",
      priority: 1,
      matchingReason: args.matchingReason,
      matchingScore: args.matchingScore,
      sentAt: now,
      expiresAt,
      createdAt: now,
    });

    // Update lead status
    await ctx.db.patch(args.leadId, {
      status: "matched",
      updatedAt: now,
    });

    // Update queue
    const queueItem = await ctx.db
      .query("leadQueue")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .first();
    
    if (queueItem) {
      await ctx.db.patch(queueItem._id, { 
        status: "matched",
        matchedAttorneys: [...queueItem.matchedAttorneys, args.attorneyId],
      });
    }

    // TODO: Send notification to attorney

    return { transferId };
  },
});

export const respondToTransfer = mutation({
  args: {
    transferId: v.id("caseTransfers"),
    responseType: v.union(v.literal("accepted"), v.literal("declined")),
    notes: v.optional(v.string()),
    estimatedValue: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const transfer = await ctx.db.get(args.transferId);
    if (!transfer) throw new Error("Transfer not found");

    // Update transfer
    await ctx.db.patch(args.transferId, {
      status: args.responseType === "accepted" ? "accepted" : "declined",
      respondedAt: now,
    });

    // Record response
    await ctx.db.insert("attorneyResponses", {
      transferId: args.transferId,
      responseType: args.responseType,
      responseChannel: "portal",
      respondedAt: now,
      notes: args.notes,
      estimatedCaseValue: args.estimatedValue,
      rejectionReason: args.rejectionReason as any,
      followUpNeeded: false,
    });

    // Update lead based on response
    if (args.responseType === "accepted") {
      await ctx.db.patch(transfer.leadId, {
        status: "accepted",
        updatedAt: now,
      });

      // Update queue
      const queueItem = await ctx.db
        .query("leadQueue")
        .withIndex("by_lead", (q) => q.eq("leadId", transfer.leadId))
        .first();
      
      if (queueItem) {
        await ctx.db.patch(queueItem._id, { status: "accepted" });
      }
    } else {
      // Declined - trigger re-match
      await ctx.scheduler.runAfter(0, api.leads.findMatches, { leadId: transfer.leadId });
    }

    return { success: true };
  },
});

// =============================================================================
// RETELLAI WEBHOOK HANDLER
// =============================================================================

export const handleRetellWebhook = mutation({
  args: {
    event: v.string(),
    callId: v.string(),
    agentId: v.string(),
    phoneNumber: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    recordingUrl: v.optional(v.string()),
    extractedData: v.optional(v.any()),
    transcript: v.optional(v.array(v.any())),
    callAnalysis: v.optional(v.any()),
    metadata: v.optional(v.any()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const normalizedStatus = normalizeCallStatus(args.status, args.event);
    const finalEvent = isFinalCallEvent(args.event);

    const existingCallLog = await ctx.db
      .query("callLogs")
      .withIndex("by_retell_call_id", (q) => q.eq("retellCallId", args.callId))
      .first();

    let callLogId = existingCallLog?._id;
    if (existingCallLog) {
      await ctx.db.patch(existingCallLog._id, {
        retellAgentId: args.agentId || existingCallLog.retellAgentId,
        phoneNumber: args.phoneNumber || existingCallLog.phoneNumber,
        status: normalizedStatus as any,
        startedAt: args.startedAt || existingCallLog.startedAt,
        endedAt: args.endedAt || existingCallLog.endedAt,
        durationSeconds: args.durationSeconds || existingCallLog.durationSeconds,
        recordingUrl: args.recordingUrl || existingCallLog.recordingUrl,
        rawTranscript: args.transcript || existingCallLog.rawTranscript,
        extractedData: args.extractedData || existingCallLog.extractedData,
        metadata: args.metadata || existingCallLog.metadata,
        sentimentScore: extractSentimentScore(args.callAnalysis) ?? existingCallLog.sentimentScore,
      });
    } else {
      callLogId = await ctx.db.insert("callLogs", {
        retellCallId: args.callId,
        retellAgentId: args.agentId,
        phoneNumber: args.phoneNumber,
        direction: "inbound",
        status: normalizedStatus as any,
        startedAt: args.startedAt,
        endedAt: args.endedAt,
        durationSeconds: args.durationSeconds,
        recordingUrl: args.recordingUrl,
        rawTranscript: args.transcript,
        extractedData: args.extractedData,
        metadata: args.metadata,
        sentimentScore: extractSentimentScore(args.callAnalysis),
      });
    }

    // If call completed with extracted data, create lead
    if (finalEvent && (args.extractedData || args.callAnalysis)) {
      const existingLead = await ctx.db
        .query("leads")
        .withIndex("by_retell_call_id", (q) => q.eq("retellCallId", args.callId))
        .first();
      if (existingLead) {
        return { success: true, callLogId, leadId: existingLead._id, leadStatus: existingLead.status };
      }

      const data = args.extractedData;
      const summary = extractSummary(data, args.callAnalysis);
      
      const leadResult = await ctx.runMutation(api.leads.create, {
        phone: data?.phone || args.phoneNumber,
        firstName: data?.first_name || data?.name?.split(" ")[0],
        lastName: data?.last_name || data?.name?.split(" ").slice(1).join(" "),
        email: data?.email,
        caseType: data?.case_type || "other",
        county: data?.county || "Unknown",
        state: data?.state || "NY",
        incidentDate: data?.incident_date,
        description: data?.description,
        urgency: data?.urgency || "medium",
        languagePref: data?.language_preference || "spanish",
        source: "ai_receptionist",
        retellCallId: args.callId,
        aiTranscript: args.transcript ? JSON.stringify(args.transcript) : undefined,
        aiSummary: summary,
        extractedData: data || args.callAnalysis,
        recordingUrl: args.recordingUrl,
        callbackRequested: data?.callback_requested || false,
      });

      // Update call log with lead reference
      await ctx.db.patch(callLogId, { leadId: leadResult.leadId });

      return { 
        success: true, 
        callLogId, 
        leadId: leadResult.leadId,
        leadStatus: leadResult.status,
      };
    }

    return { success: true, callLogId };
  },
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateQualificationScore(args: any): number {
  let score = 0;

  // Completeness (30 points)
  const requiredFields = ["phone", "caseType", "county"];
  const hasRequired = requiredFields.every(f => args[f]);
  score += hasRequired ? 30 : 15;

  // Case type value (25 points)
  const caseTypeScores: Record<string, number> = {
    personal_injury: 25,
    workers_comp: 25,
    construction_accident: 25,
    criminal: 20,
    immigration: 18,
    divorce: 15,
    family: 12,
    dui: 15,
    traffic: 8,
    real_estate: 10,
    other: 5,
  };
  score += caseTypeScores[args.caseType] || 5;

  // Urgency (20 points)
  const urgencyScores = { emergency: 20, high: 15, medium: 10, low: 5 };
  score += urgencyScores[args.urgency] || 5;

  // Contact quality (15 points)
  if (args.phone && args.phone.match(/^\+1\d{10}$/)) score += 10;
  if (args.email) score += 5;

  // Description quality (10 points)
  if (args.description) {
    const words = args.description.split(" ").length;
    if (words >= 20) score += 10;
    else if (words >= 10) score += 7;
    else if (words >= 5) score += 4;
    else score += 2;
  }

  return Math.min(score, 100);
}

function isFinalCallEvent(event: string): boolean {
  const normalized = event.toLowerCase();
  return (
    normalized.includes("call.completed") ||
    normalized.includes("call.ended") ||
    normalized.includes("call.analyzed") ||
    normalized.includes("call_analyzed") ||
    normalized.includes("call_ended")
  );
}

function normalizeCallStatus(status: string, event: string): string {
  const normalized = (status || "").toLowerCase();
  const eventNormalized = (event || "").toLowerCase();
  const allowed = ["completed", "failed", "no_answer", "voicemail", "transferred"];
  if (allowed.includes(normalized)) {
    return normalized;
  }
  if (eventNormalized.includes("failed")) return "failed";
  if (eventNormalized.includes("no_answer")) return "no_answer";
  if (eventNormalized.includes("voicemail")) return "voicemail";
  if (eventNormalized.includes("transfer")) return "transferred";
  return "completed";
}

function extractSummary(extractedData?: any, callAnalysis?: any): string | undefined {
  if (extractedData?.summary) return extractedData.summary;
  if (callAnalysis?.summary) return callAnalysis.summary;
  if (callAnalysis?.call_summary) return callAnalysis.call_summary;
  return undefined;
}

function extractSentimentScore(callAnalysis?: any): number | undefined {
  const score = callAnalysis?.sentiment_score ?? callAnalysis?.sentimentScore;
  if (typeof score === "number") return score;
  return undefined;
}

function getPriorityScore(urgency: string, qualificationScore: number): number {
  const urgencyPriority = { emergency: 100, high: 75, medium: 50, low: 25 };
  return (urgencyPriority[urgency as keyof typeof urgencyPriority] || 25) + (qualificationScore * 0.5);
}

function calculateMatchScore(lead: any, attorney: any, specialization: any) {
  let total = 0;
  const reasons: string[] = [];

  // Primary specialization (30 points)
  if (specialization.isPrimary) {
    total += 30;
    reasons.push(`Primary specialization: ${lead.caseType}`);
  } else {
    total += 20;
    reasons.push(`Secondary specialization: ${lead.caseType}`);
  }

  // Geographic match (25 points)
  total += 25;
  reasons.push(`Serves ${lead.county}`);

  // Performance (25 points)
  if (attorney.conversionRate) {
    total += Math.floor(attorney.conversionRate * 25);
    reasons.push(`${(attorney.conversionRate * 100).toFixed(0)}% conversion rate`);
  } else {
    total += 10;
    reasons.push("New attorney");
  }

  // Subscription tier (10 points)
  const tierScores = { premium: 10, standard: 7, basic: 5 };
  total += tierScores[attorney.subscriptionTier as keyof typeof tierScores] || 5;
  reasons.push(`${attorney.subscriptionTier} tier`);

  // Availability (10 points)
  total += 10;
  reasons.push("Available");

  return { total: Math.min(total, 100), reasons };
}
